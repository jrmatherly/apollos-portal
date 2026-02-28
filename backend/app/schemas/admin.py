"""Admin-specific API schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

# --- User schemas ---


class AdminKeyItem(BaseModel):
    id: str
    litellm_key_alias: str
    team_id: str
    team_alias: str
    status: str
    portal_expires_at: datetime
    created_at: datetime
    last_spend: float | None = None


class AdminTeamMembershipItem(BaseModel):
    team_id: str
    team_alias: str
    entra_group_id: str
    litellm_role: str


class AdminUserItem(BaseModel):
    id: str
    entra_oid: str
    email: str
    display_name: str
    is_active: bool
    created_at: datetime
    deprovisioned_at: datetime | None = None
    active_keys_count: int = 0
    teams_count: int = 0


class AdminUserDetail(BaseModel):
    id: str
    entra_oid: str
    email: str
    display_name: str
    litellm_user_id: str | None = None
    is_active: bool
    default_key_duration_days: int
    deprovisioned_at: datetime | None = None
    created_at: datetime
    keys: list[AdminKeyItem] = []
    teams: list[AdminTeamMembershipItem] = []


class AdminUsersResponse(BaseModel):
    users: list[AdminUserItem]
    total: int
    page: int
    page_size: int


# --- Key schemas ---


class AdminAllKeysItem(BaseModel):
    id: str
    litellm_key_alias: str
    team_id: str
    team_alias: str
    status: str
    portal_expires_at: datetime
    created_at: datetime
    last_spend: float | None = None
    user_email: str
    user_id: str


class AdminKeysResponse(BaseModel):
    keys: list[AdminAllKeysItem]
    total: int
    page: int
    page_size: int


# --- Audit schemas ---


class AuditLogEntry(BaseModel):
    id: str
    actor_email: str
    action: str
    target_type: str
    target_id: str
    details: dict | None = None
    created_at: datetime


class AuditLogResponse(BaseModel):
    entries: list[AuditLogEntry]
    total: int
    page: int
    page_size: int


# --- Health schemas ---


class JobStatus(BaseModel):
    job_id: str
    next_run_time: datetime | None = None
    trigger: str


class AdminHealthResponse(BaseModel):
    scheduler_running: bool
    jobs: list[JobStatus]


# --- Action response schemas ---


class AdminActionResponse(BaseModel):
    success: bool
    message: str
