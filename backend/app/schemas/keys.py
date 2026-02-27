from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class KeyListItem(BaseModel):
    id: uuid.UUID
    litellm_key_alias: str
    team_id: str
    team_alias: str
    status: str  # "active", "expiring_soon", "expired", "revoked", "rotated"
    portal_expires_at: datetime
    created_at: datetime
    last_spend: float | None = None
    days_until_expiry: int | None = None


class KeyListResponse(BaseModel):
    active: list[KeyListItem] = []
    revoked: list[KeyListItem] = []


class KeyCreateRequest(BaseModel):
    team_id: str


class KeyCreateResponse(BaseModel):
    key_id: uuid.UUID
    key: str  # Raw key string, shown only once
    key_alias: str
    team_alias: str
    portal_expires_at: datetime


class KeyRotateResponse(BaseModel):
    old_key_id: uuid.UUID
    new_key_id: uuid.UUID
    new_key: str  # New raw key string
    new_key_alias: str
    portal_expires_at: datetime


class KeyRevokeResponse(BaseModel):
    key_id: uuid.UUID
    revoked_at: datetime
