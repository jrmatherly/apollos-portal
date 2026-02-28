"""Admin-specific business logic for user/key management."""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUser
from app.models.audit_log import AuditLog
from app.models.provisioned_key import ProvisionedKey
from app.models.provisioned_user import ProvisionedUser
from app.services.audit import (
    ACTION_ADMIN_KEY_REVOKED,
    ACTION_ADMIN_USER_DEPROVISIONED,
    ACTION_ADMIN_USER_REPROVISIONED,
    ACTION_KEY_DEPROVISIONED,
    log_action,
)
from app.services.litellm_client import LiteLLMClient

logger = structlog.stdlib.get_logger(__name__)


async def list_users(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ProvisionedUser], int]:
    """List all provisioned users with pagination."""
    count_q = select(func.count()).select_from(ProvisionedUser)
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(ProvisionedUser)
        .options(selectinload(ProvisionedUser.keys), selectinload(ProvisionedUser.team_memberships))
        .order_by(ProvisionedUser.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def get_user_detail(
    session: AsyncSession,
    user_id: str,
) -> ProvisionedUser | None:
    """Get a single user with all relationships loaded."""
    q = (
        select(ProvisionedUser)
        .options(selectinload(ProvisionedUser.keys), selectinload(ProvisionedUser.team_memberships))
        .where(ProvisionedUser.id == user_id)
    )
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def list_all_keys(
    session: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ProvisionedKey], int]:
    """List all keys across all users with pagination."""
    count_q = select(func.count()).select_from(ProvisionedKey).where(ProvisionedKey.status == "active")
    total = (await session.execute(count_q)).scalar_one()

    q = (
        select(ProvisionedKey)
        .options(selectinload(ProvisionedKey.user))
        .where(ProvisionedKey.status == "active")
        .order_by(ProvisionedKey.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(q)
    return list(result.scalars().all()), total


async def admin_revoke_key(
    session: AsyncSession,
    litellm: LiteLLMClient,
    admin: CurrentUser,
    key_id: str,
) -> None:
    """Admin-revoke any key by ID."""
    q = select(ProvisionedKey).where(ProvisionedKey.id == key_id)
    result = await session.execute(q)
    key = result.scalar_one_or_none()
    if key is None:
        raise LookupError(f"Key {key_id} not found")
    if key.status != "active":
        raise ValueError(f"Key {key_id} is already {key.status}")

    if key.litellm_key_id:
        try:
            await litellm.block_key(key.litellm_key_id)
        except Exception:
            logger.exception("Failed to block LiteLLM key %s during admin revoke", key.litellm_key_id)

    key.status = "revoked"
    key.revoked_at = datetime.now(UTC)
    await log_action(
        session,
        actor_email=admin.email,
        actor_entra_oid=admin.oid,
        action=ACTION_ADMIN_KEY_REVOKED,
        target_type="key",
        target_id=str(key.id),
        details={"key_alias": key.litellm_key_alias},
    )
    await session.commit()


async def admin_deprovision_user(
    session: AsyncSession,
    litellm: LiteLLMClient,
    admin: CurrentUser,
    user_id: str,
) -> None:
    """Admin force-deprovision a user: block all active keys, mark inactive."""
    q = select(ProvisionedUser).options(selectinload(ProvisionedUser.keys)).where(ProvisionedUser.id == user_id)
    result = await session.execute(q)
    user = result.scalar_one_or_none()
    if user is None:
        raise LookupError(f"User {user_id} not found")
    if not user.is_active:
        raise ValueError(f"User {user.email} is already deprovisioned")

    # Block all active keys (continue on LiteLLM failure; reconciliation job catches drift)
    for key in user.keys:
        if key.status == "active" and key.litellm_key_id:
            try:
                await litellm.block_key(key.litellm_key_id)
            except Exception:
                logger.exception("Failed to block LiteLLM key %s during admin deprovision", key.litellm_key_id)
            key.status = "revoked"
            key.revoked_at = datetime.now(UTC)
            await log_action(
                session,
                actor_email=admin.email,
                actor_entra_oid=admin.oid,
                action=ACTION_KEY_DEPROVISIONED,
                target_type="key",
                target_id=str(key.id),
                details={"reason": "user_deprovisioned"},
            )

    user.is_active = False
    user.deprovisioned_at = datetime.now(UTC)
    await log_action(
        session,
        actor_email=admin.email,
        actor_entra_oid=admin.oid,
        action=ACTION_ADMIN_USER_DEPROVISIONED,
        target_type="user",
        target_id=str(user.id),
        details={"user_email": user.email},
    )
    await session.commit()


async def admin_reprovision_user(
    session: AsyncSession,
    admin: CurrentUser,
    user_id: str,
) -> None:
    """Re-activate a deprovisioned user (keys must be re-generated separately)."""
    q = select(ProvisionedUser).where(ProvisionedUser.id == user_id)
    result = await session.execute(q)
    user = result.scalar_one_or_none()
    if user is None:
        raise LookupError(f"User {user_id} not found")
    if user.is_active:
        raise ValueError(f"User {user.email} is already active")

    user.is_active = True
    user.deprovisioned_at = None
    await log_action(
        session,
        actor_email=admin.email,
        actor_entra_oid=admin.oid,
        action=ACTION_ADMIN_USER_REPROVISIONED,
        target_type="user",
        target_id=str(user.id),
        details={"user_email": user.email},
    )
    await session.commit()


async def query_audit_log(
    session: AsyncSession,
    *,
    actor_email: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[AuditLog], int]:
    """Query audit log with filters and pagination."""
    base = select(AuditLog)
    count_base = select(func.count()).select_from(AuditLog)

    if actor_email:
        base = base.where(AuditLog.actor_email == actor_email)
        count_base = count_base.where(AuditLog.actor_email == actor_email)
    if action:
        base = base.where(AuditLog.action == action)
        count_base = count_base.where(AuditLog.action == action)
    if target_type:
        base = base.where(AuditLog.target_type == target_type)
        count_base = count_base.where(AuditLog.target_type == target_type)
    if start_date:
        base = base.where(AuditLog.created_at >= start_date)
        count_base = count_base.where(AuditLog.created_at >= start_date)
    if end_date:
        base = base.where(AuditLog.created_at <= end_date)
        count_base = count_base.where(AuditLog.created_at <= end_date)

    total = (await session.execute(count_base)).scalar_one()

    q = base.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(q)
    return list(result.scalars().all()), total
