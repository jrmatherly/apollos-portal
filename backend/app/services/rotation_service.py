from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.core.database import async_session_factory
from app.models.provisioned_key import ProvisionedKey
from app.models.provisioned_user import ProvisionedUser
from app.services.audit import ACTION_KEY_AUTO_ROTATED, log_action
from app.services.email_service import render_template, send_email
from app.services.litellm_client import LiteLLMClient
from app.utils import slugify

logger = structlog.stdlib.get_logger(__name__)


async def _auto_rotate_key(
    session: AsyncSession,
    settings: Settings,
    litellm: LiteLLMClient,
    key: ProvisionedKey,
    user: ProvisionedUser,
) -> None:
    """Delete old key in LiteLLM, mark rotated in DB, generate new key, notify user."""
    now = datetime.now(UTC)

    # Delete old key from LiteLLM (hard delete — key is expired)
    if key.litellm_key_id:
        try:
            await litellm.delete_key(key.litellm_key_id)
        except Exception:
            logger.exception(
                "Failed to delete expired LiteLLM key %s, proceeding with rotation",
                key.litellm_key_id,
            )

    # Mark old key rotated in portal DB
    key.status = "rotated"
    key.revoked_at = now
    old_alias = key.litellm_key_alias

    # Build new alias with collision guard
    email_prefix = user.email.split("@")[0]
    slug = slugify(key.team_alias)
    new_alias = f"{email_prefix}-{slug}"

    existing = await session.execute(
        select(ProvisionedKey).where(
            ProvisionedKey.litellm_key_alias == new_alias,
            ProvisionedKey.status == "active",
        )
    )
    if existing.scalar_one_or_none():
        new_alias = f"{new_alias}-{uuid4().hex[:8]}"

    expires_at = now + timedelta(days=user.default_key_duration_days)

    key_resp = await litellm.generate_key(
        user_id=user.litellm_user_id or user.email,
        team_id=key.team_id,
        models=[],
        key_alias=new_alias,
        duration=f"{user.default_key_duration_days}d",
    )

    new_key = ProvisionedKey(
        user_id=user.id,
        litellm_key_id=key_resp.get("token") or key_resp.get("key_name"),
        litellm_key_alias=new_alias,
        team_id=key.team_id,
        team_alias=key.team_alias,
        portal_expires_at=expires_at,
        rotated_from_id=key.id,
    )
    session.add(new_key)
    await session.flush()

    await log_action(
        session,
        actor_email="system@apollos-ai",
        actor_entra_oid="system",
        action=ACTION_KEY_AUTO_ROTATED,
        target_type="key",
        target_id=str(new_key.id),
        details={
            "old_key_id": str(key.id),
            "old_alias": old_alias,
            "new_alias": new_alias,
            "team_id": key.team_id,
        },
    )
    await session.commit()

    # Send rotation-complete email (post-commit — email failure won't rollback)
    html = render_template(
        "rotation_complete.html",
        {
            "user_name": user.display_name,
            "old_key_alias": old_alias,
            "new_key_alias": new_alias,
            "team_alias": key.team_alias,
            "expires_at": expires_at.strftime("%Y-%m-%d"),
            "portal_url": settings.portal_base_url,
        },
    )
    await send_email(
        settings=settings,
        to_email=user.email,
        subject=f"[Apollos AI] API Key Auto-Rotated: {new_alias}",
        html_body=html,
    )


async def run_rotation_job(settings: Settings) -> None:
    """Cron entry point: find expired active keys and auto-rotate them.

    A key is eligible for rotation when status == "active" and
    portal_expires_at <= now, and the user is still active.
    """
    logger.info("Starting rotation job")
    now = datetime.now(UTC)

    # Fresh client per job run — isolates cron HTTP state from the request-path singleton
    litellm = LiteLLMClient(settings)

    try:
        # Bulk-read expired active key IDs
        async with async_session_factory() as session:
            result = await session.execute(
                select(ProvisionedKey)
                .join(ProvisionedUser, ProvisionedKey.user_id == ProvisionedUser.id)
                .where(
                    ProvisionedKey.status == "active",
                    ProvisionedKey.portal_expires_at <= now,
                    ProvisionedUser.is_active.is_(True),
                    ProvisionedUser.deprovisioned_at.is_(None),
                )
            )
            expired_key_ids = [k.id for k in result.scalars().all()]

        rotated = 0
        failed = 0

        for key_id in expired_key_ids:
            try:
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
                    await _auto_rotate_key(session, settings, litellm, key, user)
                    rotated += 1
            except Exception:
                logger.exception("Failed to auto-rotate key %s", key_id)
                failed += 1

        logger.info("Rotation job complete: %d rotated, %d failed", rotated, failed)
    finally:
        await litellm.close()
