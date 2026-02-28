from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator


class UserSettingsResponse(BaseModel):
    default_key_duration_days: int
    notify_14d: bool
    notify_7d: bool
    notify_3d: bool
    notify_1d: bool


class UserSettingsUpdate(BaseModel):
    default_key_duration_days: Literal[30, 60, 90, 180] | None = None
    notify_14d: bool | None = None
    notify_7d: bool | None = None
    notify_3d: bool | None = None
    notify_1d: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_null_duration(cls, data: dict) -> dict:
        if isinstance(data, dict) and "default_key_duration_days" in data and data["default_key_duration_days"] is None:
            msg = "default_key_duration_days cannot be null; omit the field or provide 30, 60, 90, or 180"
            raise ValueError(msg)
        return data
