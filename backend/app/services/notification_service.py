from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.core.database import async_session_factory
from app.models.key_notification import KeyNotification
from app.models.provisioned_key import ProvisionedKey
from app.models.provisioned_user import ProvisionedUser
from app.services.audit import ACTION_KEY_NOTIFIED, log_action
from app.services.email_service import render_template, send_email

logger = logging.getLogger(__name__)

# (threshold_days, notification_type stored in DB, user preference attribute)
NOTIFICATION_THRESHOLDS: list[tuple[int, str, str]] = [
    (14, "expiry_14d", "notify_14d"),
    (7, "expiry_7d", "notify_7d"),
    (3, "expiry_3d", "notify_3d"),
    (1, "expiry_1d", "notify_1d"),
]


async def _send_expiry_notification(
    session: AsyncSession,
    settings: Settings,
    key: ProvisionedKey,
    user: ProvisionedUser,
    days_left: int,
    notification_type: str,
) -> bool:
    """Attempt to send one expiry notification.

    Uses a SAVEPOINT to attempt INSERT into key_notifications — if the
    UniqueConstraint fires, the savepoint is rolled back without
    invalidating the outer session.

    Returns True if notification was sent, False if already sent.
    """
    async with session.begin_nested():
        notification = KeyNotification(
            key_id=key.id,
            notification_type=notification_type,
        )
        session.add(notification)
        try:
            await session.flush()
        except IntegrityError:
            return False

    html = render_template(
        "expiry_warning.html",
        {
            "user_name": user.display_name,
            "key_alias": key.litellm_key_alias,
            "team_alias": key.team_alias,
            "days_until_expiry": days_left,
            "portal_url": settings.portal_base_url,
        },
    )
    subject = (
        f"[Apollos AI] API Key Expires in {days_left} "
        f"Day{'s' if days_left != 1 else ''}: {key.litellm_key_alias}"
    )

    await send_email(
        settings=settings,
        to_email=user.email,
        subject=subject,
        html_body=html,
    )

    await log_action(
        session,
        actor_email="system@apollos-ai",
        actor_entra_oid="system",
        action=ACTION_KEY_NOTIFIED,
        target_type="key",
        target_id=str(key.id),
        details={"notification_type": notification_type, "days_left": days_left},
    )
    await session.commit()
    return True


async def run_notification_job(settings: Settings) -> None:
    """Cron entry point: find keys needing expiry notifications and send them.

    Checks all active keys against 14d/7d/3d/1d thresholds, respects per-user
    notification preferences, and deduplicates via key_notifications table.
    """
    logger.info("Starting notification job")
    now = datetime.now(UTC)
    sent = 0
    skipped = 0

    # Bulk-read all active keys for active, non-deprovisioned users
    async with async_session_factory() as session:
        result = await session.execute(
            select(ProvisionedKey)
            .join(ProvisionedUser, ProvisionedKey.user_id == ProvisionedUser.id)
            .where(
                ProvisionedKey.status == "active",
                ProvisionedUser.is_active.is_(True),
                ProvisionedUser.deprovisioned_at.is_(None),
            )
        )
        key_ids = [k.id for k in result.scalars().all()]

    for key_id in key_ids:
        async with async_session_factory() as session:
            result = await session.execute(
                select(ProvisionedKey)
                .options(selectinload(ProvisionedKey.user))
                .where(ProvisionedKey.id == key_id)
            )
            key = result.scalar_one_or_none()
            if not key or key.status != "active":
                continue

            user = key.user
            if not user or not user.is_active:
                continue

            expires = key.portal_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            days_left = (expires - now).days

            # Skip already-expired keys (rotation job handles those)
            if days_left < 0:
                continue

            for threshold_days, notification_type, user_pref_attr in NOTIFICATION_THRESHOLDS:
                if days_left > threshold_days:
                    continue
                if not getattr(user, user_pref_attr, True):
                    skipped += 1
                    continue
                was_sent = await _send_expiry_notification(
                    session, settings, key, user, days_left, notification_type,
                )
                if was_sent:
                    sent += 1

    logger.info("Notification job complete: %d sent, %d skipped by preference", sent, skipped)
