from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.core.database import async_session_factory
from app.core.graph import GraphClient
from app.core.teams import load_teams_config
from app.models.provisioned_user import ProvisionedUser
from app.services.audit import ACTION_KEY_DEPROVISIONED, ACTION_USER_DEPROVISIONED, log_action
from app.services.email_service import render_template, send_email
from app.services.litellm_client import LiteLLMClient

logger = logging.getLogger(__name__)


async def _deprovision_user(
    session: AsyncSession,
    settings: Settings,
    litellm: LiteLLMClient,
    user: ProvisionedUser,
) -> None:
    """Delete all active keys and mark user deprovisioned."""
    now = datetime.now(UTC)

    for key in user.keys:
        if key.status != "active":
            continue
        if key.litellm_key_id:
            try:
                await litellm.block_key(key.litellm_key_id)
            except Exception:
                logger.exception(
                    "Failed to block LiteLLM key %s during deprovisioning",
                    key.litellm_key_id,
                )

        key.status = "revoked"
        key.revoked_at = now

        await log_action(
            session,
            actor_email="system@apollos-ai",
            actor_entra_oid="system",
            action=ACTION_KEY_DEPROVISIONED,
            target_type="key",
            target_id=str(key.id),
            details={"reason": "user_deprovisioned", "user_id": str(user.id)},
        )

    user.is_active = False
    user.deprovisioned_at = now

    await log_action(
        session,
        actor_email="system@apollos-ai",
        actor_entra_oid="system",
        action=ACTION_USER_DEPROVISIONED,
        target_type="user",
        target_id=str(user.id),
        details={"email": user.email},
    )
    await session.commit()

    # Send deprovisioned email (post-commit)
    html = render_template(
        "deprovisioned.html",
        {"user_name": user.display_name, "portal_url": settings.portal_base_url},
    )
    await send_email(
        settings=settings,
        to_email=user.email,
        subject="[Apollos AI] Your Portal Access Has Been Removed",
        html_body=html,
    )


async def run_deprovisioning_job(settings: Settings) -> None:
    """Cron entry point: check active users against Entra group membership.

    For each active provisioned user, verifies they still belong to at least
    one authorized Entra group. If not, deletes their keys and marks them
    deprovisioned.
    """
    logger.info("Starting deprovisioning job")

    # Fresh clients per job run — isolates cron HTTP state from the request-path singletons
    graph = GraphClient(settings)
    litellm = LiteLLMClient(settings)
    teams_config = load_teams_config(settings.teams_config_path)

    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(ProvisionedUser).where(
                    ProvisionedUser.is_active.is_(True),
                    ProvisionedUser.deprovisioned_at.is_(None),
                )
            )
            active_user_ids = [u.id for u in result.scalars().all()]

        deprovisioned = 0
        errors = 0

        for user_id in active_user_ids:
            try:
                async with async_session_factory() as session:
                    result = await session.execute(
                        select(ProvisionedUser)
                        .options(selectinload(ProvisionedUser.keys))
                        .where(ProvisionedUser.id == user_id)
                    )
                    user = result.scalar_one_or_none()
                    if not user or not user.is_active:
                        continue

                    groups = await graph.get_user_groups(user.entra_oid)
                    group_ids = [g["id"] for g in groups]

                    if teams_config.is_user_authorized(group_ids):
                        continue

                    logger.info(
                        "Deprovisioning user %s — no longer in authorized groups",
                        user.email,
                    )
                    await _deprovision_user(session, settings, litellm, user)
                    deprovisioned += 1

            except Exception:
                logger.exception("Error checking user %s during deprovisioning job", user_id)
                errors += 1

        # TODO(4.8): Send admin notification (email/webhook) when users are deprovisioned
        logger.info(
            "Deprovisioning job complete: %d deprovisioned, %d errors",
            deprovisioned,
            errors,
        )
    finally:
        await litellm.close()
