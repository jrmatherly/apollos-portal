"""Admin-only API endpoints requiring portal_admin role."""

from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, require_admin
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.schemas.admin import (
    AdminActionResponse,
    AdminAllKeysItem,
    AdminHealthResponse,
    AdminKeyItem,
    AdminKeysResponse,
    AdminTeamMembershipItem,
    AdminUserDetail,
    AdminUserItem,
    AdminUsersResponse,
    AuditLogEntry,
    AuditLogResponse,
    JobStatus,
)
from app.services.admin_service import (
    admin_deprovision_user,
    admin_reprovision_user,
    admin_revoke_key,
    get_user_detail,
    list_all_keys,
    list_users,
    query_audit_log,
)
from app.services.litellm_client import LiteLLMClient, get_litellm_client

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


# --- Users ---


@router.get("/users", response_model=AdminUsersResponse)
async def admin_list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """List all provisioned users (paginated)."""
    users, total = await list_users(session, page=page, page_size=page_size)
    return AdminUsersResponse(
        users=[
            AdminUserItem(
                id=str(u.id),
                entra_oid=u.entra_oid,
                email=u.email,
                display_name=u.display_name,
                is_active=u.is_active,
                created_at=u.created_at,
                deprovisioned_at=u.deprovisioned_at,
                active_keys_count=sum(1 for k in u.keys if k.status == "active"),
                teams_count=len(u.team_memberships),
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def admin_get_user(
    user_id: str = Path(max_length=36),
    session: AsyncSession = Depends(get_session),
):
    """Get detailed user info with keys, teams, and audit history."""
    user = await get_user_detail(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return AdminUserDetail(
        id=str(user.id),
        entra_oid=user.entra_oid,
        email=user.email,
        display_name=user.display_name,
        litellm_user_id=user.litellm_user_id,
        is_active=user.is_active,
        default_key_duration_days=user.default_key_duration_days,
        deprovisioned_at=user.deprovisioned_at,
        created_at=user.created_at,
        keys=[
            AdminKeyItem(
                id=str(k.id),
                litellm_key_alias=k.litellm_key_alias,
                team_id=k.team_id,
                team_alias=k.team_alias,
                status=k.status,
                portal_expires_at=k.portal_expires_at,
                created_at=k.created_at,
                last_spend=float(k.last_spend) if k.last_spend is not None else None,
            )
            for k in user.keys
        ],
        teams=[
            AdminTeamMembershipItem(
                team_id=tm.team_id,
                team_alias=tm.team_alias,
                entra_group_id=tm.entra_group_id,
                litellm_role=tm.litellm_role,
            )
            for tm in user.team_memberships
        ],
    )


# --- Admin actions ---


@router.post("/users/{user_id}/deprovision", response_model=AdminActionResponse)
@limiter.limit("20/minute")
async def admin_deprovision(
    request: Request,
    user_id: str = Path(max_length=36),
    admin: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Force-deprovision a user: block all keys, mark inactive."""
    try:
        await admin_deprovision_user(session, litellm, admin, user_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    return AdminActionResponse(success=True, message="User deprovisioned")


@router.post("/users/{user_id}/reprovision", response_model=AdminActionResponse)
@limiter.limit("20/minute")
async def admin_reprovision(
    request: Request,
    user_id: str = Path(max_length=36),
    admin: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Re-activate a deprovisioned user."""
    try:
        await admin_reprovision_user(session, admin, user_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    return AdminActionResponse(success=True, message="User reprovisioned")


# --- Keys ---


@router.get("/keys", response_model=AdminKeysResponse)
async def admin_list_keys(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """List all active keys across all users (paginated)."""
    keys, total = await list_all_keys(session, page=page, page_size=page_size)
    return AdminKeysResponse(
        keys=[
            AdminAllKeysItem(
                id=str(k.id),
                litellm_key_alias=k.litellm_key_alias,
                team_id=k.team_id,
                team_alias=k.team_alias,
                status=k.status,
                portal_expires_at=k.portal_expires_at,
                created_at=k.created_at,
                last_spend=float(k.last_spend) if k.last_spend is not None else None,
                user_email=k.user.email,
                user_id=str(k.user_id),
            )
            for k in keys
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/keys/{key_id}/revoke", response_model=AdminActionResponse)
@limiter.limit("20/minute")
async def admin_revoke_any_key(
    request: Request,
    key_id: str = Path(max_length=36),
    admin: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
):
    """Admin-revoke any key by ID."""
    try:
        await admin_revoke_key(session, litellm, admin, key_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    return AdminActionResponse(success=True, message="Key revoked")


# --- Audit log ---


@router.get("/audit", response_model=AuditLogResponse)
async def admin_get_audit_log(
    actor_email: str | None = Query(None, max_length=320),
    action: str | None = Query(None, max_length=64),
    target_type: str | None = Query(None, max_length=64),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """Query audit log with filters and pagination."""
    entries, total = await query_audit_log(
        session,
        actor_email=actor_email,
        action=action,
        target_type=target_type,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return AuditLogResponse(
        entries=[
            AuditLogEntry(
                id=str(e.id),
                actor_email=e.actor_email,
                action=e.action,
                target_type=e.target_type,
                target_id=e.target_id,
                details=e.details,
                created_at=e.created_at,
            )
            for e in entries
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/audit/export")
async def admin_export_audit_log(
    actor_email: str | None = Query(None, max_length=320),
    action: str | None = Query(None, max_length=64),
    target_type: str | None = Query(None, max_length=64),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    """Export audit log as CSV (same filters, capped at 10k rows)."""
    # Cap at 10k rows to prevent OOM; true streaming deferred to v2
    max_export_rows = 10000
    entries, _ = await query_audit_log(
        session,
        actor_email=actor_email,
        action=action,
        target_type=target_type,
        start_date=start_date,
        end_date=end_date,
        page=1,
        page_size=max_export_rows,
    )

    def _sanitize_csv_cell(value: str) -> str:
        """Prevent CSV injection by escaping formula-triggering characters (CWE-1236)."""
        if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
            return f"'{value}"
        return value

    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "actor_email", "action", "target_type", "target_id", "details", "created_at"])
        for e in entries:
            writer.writerow(
                [
                    str(e.id),
                    _sanitize_csv_cell(e.actor_email),
                    _sanitize_csv_cell(e.action),
                    _sanitize_csv_cell(e.target_type),
                    _sanitize_csv_cell(e.target_id),
                    _sanitize_csv_cell(str(e.details) if e.details else ""),
                    e.created_at.isoformat(),
                ]
            )
        return output.getvalue()

    return StreamingResponse(
        iter([generate_csv()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"},
    )


# --- Scheduler health ---


@router.get("/health", response_model=AdminHealthResponse)
async def admin_scheduler_health(request: Request):
    """Get scheduler status and job information."""
    scheduler = getattr(request.app.state, "scheduler", None)
    if scheduler is None:
        return AdminHealthResponse(scheduler_running=False, jobs=[])

    jobs = scheduler.get_jobs()
    return AdminHealthResponse(
        scheduler_running=scheduler.running,
        jobs=[
            JobStatus(
                job_id=job.id,
                next_run_time=job.next_run_time,
                trigger=str(job.trigger),
            )
            for job in jobs
        ],
    )
