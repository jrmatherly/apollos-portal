from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

# Action constants
ACTION_USER_PROVISIONED = "user.provisioned"
ACTION_TEAM_SYNCED = "team.synced"
ACTION_MEMBERSHIP_ADDED = "membership.added"
ACTION_KEY_GENERATED = "key.generated"
ACTION_KEY_ROTATED = "key.rotated"
ACTION_KEY_REVOKED = "key.revoked"
ACTION_SETTINGS_UPDATED = "settings.updated"

# Phase 4: Key lifecycle & notifications
ACTION_KEY_NOTIFIED = "key.notified"
ACTION_KEY_AUTO_ROTATED = "key.auto_rotated"
ACTION_USER_DEPROVISIONED = "user.deprovisioned"
ACTION_KEY_DEPROVISIONED = "key.deprovisioned"
ACTION_RECONCILIATION_DRIFT = "key.reconciliation_drift"

# Phase 5: Admin actions
ACTION_ADMIN_KEY_REVOKED = "admin.key_revoked"
ACTION_ADMIN_USER_DEPROVISIONED = "admin.user_deprovisioned"
ACTION_ADMIN_USER_REPROVISIONED = "admin.user_reprovisioned"


async def log_action(
    session: AsyncSession,
    *,
    actor_email: str,
    actor_entra_oid: str,
    action: str,
    target_type: str,
    target_id: str,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Write an audit log entry. Caller must commit the session."""
    entry = AuditLog(
        actor_email=actor_email,
        actor_entra_oid=actor_entra_oid,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    session.add(entry)
    return entry
