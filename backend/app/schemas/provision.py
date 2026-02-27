from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class TeamProvisionDetail(BaseModel):
    team_id: str
    team_alias: str
    role: str


class KeyDetail(BaseModel):
    key_id: uuid.UUID
    litellm_key_id: str
    key_alias: str
    team_id: str
    team_alias: str
    portal_expires_at: datetime
    key: str | None = None  # Raw key value, only shown once at creation


class UserSummary(BaseModel):
    user_id: uuid.UUID
    email: str
    display_name: str
    litellm_user_id: str | None
    is_active: bool
    created_at: datetime


class ProvisionStatusResponse(BaseModel):
    is_provisioned: bool
    user: UserSummary | None = None
    teams: list[TeamProvisionDetail] = []
    keys: list[KeyDetail] = []


class ProvisionResponse(BaseModel):
    user_id: uuid.UUID
    litellm_user_id: str
    teams_provisioned: list[TeamProvisionDetail]
    keys_generated: list[KeyDetail]
