from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.models.provisioned_key import ProvisionedKey
from app.models.provisioned_user import ProvisionedUser
from app.models.user_team_membership import UserTeamMembership
from app.schemas.keys import (
    KeyCreateResponse,
    KeyListItem,
    KeyListResponse,
    KeyRevokeResponse,
    KeyRotateResponse,
)
from app.services.audit import (
    ACTION_KEY_GENERATED,
    ACTION_KEY_REVOKED,
    ACTION_KEY_ROTATED,
    log_action,
)
from app.services.litellm_client import LiteLLMClient
from app.utils import slugify

log = structlog.stdlib.get_logger(__name__)


def _make_key_preview(raw_key: str) -> str | None:
    """Build a masked preview like ``sk-...Ab1z`` from a raw API key."""
    if not raw_key or len(raw_key) < 8:
        return None
    return f"{raw_key[:3]}...{raw_key[-4:]}"


logger = structlog.stdlib.get_logger(__name__)


def _normalize_expires(key: ProvisionedKey) -> datetime:
    if key.portal_expires_at.tzinfo is None:
        return key.portal_expires_at.replace(tzinfo=UTC)
    return key.portal_expires_at


def _compute_status(key: ProvisionedKey, now: datetime) -> str:
    """Derive display status from key state."""
    if key.status in ("revoked", "rotated"):
        return key.status
    expires = _normalize_expires(key)
    if expires <= now:
        return "expired"
    days_left = (expires - now).days
    if days_left <= 14:
        return "expiring_soon"
    return "active"


def _days_until_expiry(key: ProvisionedKey, now: datetime) -> int | None:
    if key.status in ("revoked", "rotated"):
        return None
    expires = _normalize_expires(key)
    return max(0, (expires - now).days)


def _to_list_item(k: ProvisionedKey) -> KeyListItem:
    now = datetime.now(UTC)
    return KeyListItem(
        id=k.id,
        litellm_key_alias=k.litellm_key_alias,
        key_preview=k.key_preview,
        team_id=k.team_id,
        team_alias=k.team_alias,
        status=_compute_status(k, now),
        portal_expires_at=k.portal_expires_at,
        created_at=k.created_at,
        last_spend=float(k.last_spend) if k.last_spend is not None else None,
        days_until_expiry=_days_until_expiry(k, now),
    )


async def _get_db_user(session: AsyncSession, user: CurrentUser) -> ProvisionedUser:
    """Get the portal DB user or raise 404. Rejects deprovisioned accounts."""
    result = await session.execute(select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise LookupError("User not provisioned")
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deprovisioned",
        )
    return db_user


async def list_user_keys(
    session: AsyncSession,
    user: CurrentUser,
) -> KeyListResponse:
    """List all keys for the current user, split into active and revoked."""
    db_user = await _get_db_user(session, user)

    active = []
    revoked = []
    for k in db_user.keys:
        item = _to_list_item(k)
        if item.status in ("revoked", "rotated"):
            revoked.append(item)
        else:
            active.append(item)

    return KeyListResponse(active=active, revoked=revoked)


async def create_key(
    session: AsyncSession,
    litellm: LiteLLMClient,
    user: CurrentUser,
    team_id: str,
) -> KeyCreateResponse:
    """Generate a new key for the user on a specific team."""
    db_user = await _get_db_user(session, user)

    # Validate team membership
    membership = await session.execute(
        select(UserTeamMembership).where(
            UserTeamMembership.user_id == db_user.id,
            UserTeamMembership.team_id == team_id,
        )
    )
    member = membership.scalar_one_or_none()
    if not member:
        raise PermissionError("User is not a member of this team")

    # Build key alias
    email_prefix = user.email.split("@")[0]
    slug = slugify(member.team_alias)
    key_alias = f"{email_prefix}-{slug}"

    # Check for alias collision and append suffix if needed
    existing = await session.execute(
        select(ProvisionedKey).where(
            ProvisionedKey.litellm_key_alias == key_alias,
            ProvisionedKey.status == "active",
        )
    )
    if existing.scalar_one_or_none():
        key_alias = f"{key_alias}-{uuid4().hex[:8]}"

    expires_at = datetime.now(UTC) + timedelta(days=db_user.default_key_duration_days)

    key_resp = await litellm.generate_key(
        user_id=db_user.litellm_user_id or user.email,
        team_id=team_id,
        models=[],  # Inherit from team
        key_alias=key_alias,
        duration=f"{db_user.default_key_duration_days}d",
    )

    raw_key = key_resp.get("key", "")
    db_key = ProvisionedKey(
        user_id=db_user.id,
        litellm_key_id=key_resp.get("token") or key_resp.get("key_name"),
        litellm_key_alias=key_alias,
        key_preview=_make_key_preview(raw_key),
        team_id=team_id,
        team_alias=member.team_alias,
        portal_expires_at=expires_at,
    )
    session.add(db_key)
    await session.flush()

    await log_action(
        session,
        actor_email=user.email,
        actor_entra_oid=user.oid,
        action=ACTION_KEY_GENERATED,
        target_type="key",
        target_id=str(db_key.id),
        details={"team_id": team_id, "key_alias": key_alias},
    )
    await session.commit()

    return KeyCreateResponse(
        key_id=db_key.id,
        key=raw_key,
        key_alias=key_alias,
        team_alias=member.team_alias,
        portal_expires_at=expires_at,
    )


async def rotate_key(
    session: AsyncSession,
    litellm: LiteLLMClient,
    user: CurrentUser,
    key_id: str,
) -> KeyRotateResponse:
    """Rotate a key: block old, generate new, link via rotated_from_id."""
    db_user = await _get_db_user(session, user)

    # Find the old key
    result = await session.execute(
        select(ProvisionedKey).where(
            ProvisionedKey.id == key_id,
            ProvisionedKey.user_id == db_user.id,
        )
    )
    old_key = result.scalar_one_or_none()
    if not old_key:
        raise LookupError("Key not found")
    if old_key.status != "active":
        raise ValueError("Can only rotate active keys")

    # Delete old key in LiteLLM (rotation expires the key)
    if old_key.litellm_key_id:
        await litellm.delete_key(old_key.litellm_key_id)

    # Mark old key as rotated
    old_key.status = "rotated"
    old_key.revoked_at = datetime.now(UTC)

    # Generate new key
    email_prefix = user.email.split("@")[0]
    slug = slugify(old_key.team_alias)
    new_key_alias = f"{email_prefix}-{slug}"

    # Collision check
    existing = await session.execute(
        select(ProvisionedKey).where(
            ProvisionedKey.litellm_key_alias == new_key_alias,
            ProvisionedKey.status == "active",
        )
    )
    if existing.scalar_one_or_none():
        new_key_alias = f"{new_key_alias}-{uuid4().hex[:8]}"

    expires_at = datetime.now(UTC) + timedelta(days=db_user.default_key_duration_days)

    key_resp = await litellm.generate_key(
        user_id=db_user.litellm_user_id or user.email,
        team_id=old_key.team_id,
        models=[],
        key_alias=new_key_alias,
        duration=f"{db_user.default_key_duration_days}d",
    )

    raw_key = key_resp.get("key", "")
    new_key = ProvisionedKey(
        user_id=db_user.id,
        litellm_key_id=key_resp.get("token") or key_resp.get("key_name"),
        litellm_key_alias=new_key_alias,
        key_preview=_make_key_preview(raw_key),
        team_id=old_key.team_id,
        team_alias=old_key.team_alias,
        portal_expires_at=expires_at,
        rotated_from_id=old_key.id,
    )
    session.add(new_key)
    await session.flush()

    await log_action(
        session,
        actor_email=user.email,
        actor_entra_oid=user.oid,
        action=ACTION_KEY_ROTATED,
        target_type="key",
        target_id=str(new_key.id),
        details={
            "old_key_id": str(old_key.id),
            "team_id": old_key.team_id,
            "new_key_alias": new_key_alias,
        },
    )
    await session.commit()

    return KeyRotateResponse(
        old_key_id=old_key.id,
        new_key_id=new_key.id,
        new_key=raw_key,
        new_key_alias=new_key_alias,
        portal_expires_at=expires_at,
    )


async def revoke_key(
    session: AsyncSession,
    litellm: LiteLLMClient,
    user: CurrentUser,
    key_id: str,
) -> KeyRevokeResponse:
    """Revoke a key — block in LiteLLM, mark as revoked in portal DB."""
    db_user = await _get_db_user(session, user)

    result = await session.execute(
        select(ProvisionedKey).where(
            ProvisionedKey.id == key_id,
            ProvisionedKey.user_id == db_user.id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise LookupError("Key not found")
    if key.status != "active":
        raise ValueError("Can only revoke active keys")

    # Block in LiteLLM (soft-delete for audit trail)
    if key.litellm_key_id:
        await litellm.block_key(key.litellm_key_id)

    now = datetime.now(UTC)
    key.status = "revoked"
    key.revoked_at = now

    await log_action(
        session,
        actor_email=user.email,
        actor_entra_oid=user.oid,
        action=ACTION_KEY_REVOKED,
        target_type="key",
        target_id=str(key.id),
        details={"team_id": key.team_id},
    )
    await session.commit()

    return KeyRevokeResponse(key_id=key.id, revoked_at=now)
