"""Tests for Pydantic input validation constraints."""

from __future__ import annotations

import pytest
from app.schemas.keys import KeyCreateRequest
from app.schemas.settings import UserSettingsUpdate
from pydantic import ValidationError


class TestKeyCreateRequest:
    def test_valid_team_id(self):
        req = KeyCreateRequest(team_id="team-abc-123")
        assert req.team_id == "team-abc-123"

    def test_team_id_too_long_rejects(self):
        with pytest.raises(ValidationError, match="string_too_long"):
            KeyCreateRequest(team_id="x" * 129)

    def test_team_id_at_max_length_accepts(self):
        req = KeyCreateRequest(team_id="x" * 128)
        assert len(req.team_id) == 128


class TestUserSettingsUpdate:
    def test_valid_durations_accepted(self):
        for days in (30, 60, 90, 180):
            update = UserSettingsUpdate(default_key_duration_days=days)
            assert update.default_key_duration_days == days

    def test_invalid_duration_rejects(self):
        with pytest.raises(ValidationError):
            UserSettingsUpdate(default_key_duration_days=45)

    def test_zero_duration_rejects(self):
        with pytest.raises(ValidationError):
            UserSettingsUpdate(default_key_duration_days=0)

    def test_none_duration_is_valid(self):
        update = UserSettingsUpdate()
        assert update.default_key_duration_days is None

    def test_notification_booleans_accepted(self):
        update = UserSettingsUpdate(notify_14d=False, notify_7d=True)
        assert update.notify_14d is False
        assert update.notify_7d is True
