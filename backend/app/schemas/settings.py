from __future__ import annotations

from pydantic import BaseModel


class UserSettingsResponse(BaseModel):
    default_key_duration_days: int
    notify_14d: bool
    notify_7d: bool
    notify_3d: bool
    notify_1d: bool


class UserSettingsUpdate(BaseModel):
    default_key_duration_days: int | None = None
    notify_14d: bool | None = None
    notify_7d: bool | None = None
    notify_3d: bool | None = None
    notify_1d: bool | None = None
