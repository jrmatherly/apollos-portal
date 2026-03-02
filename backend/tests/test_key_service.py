"""Tests for key_service pure functions and status computation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.core.teams import TeamConfig, TeamsConfig
from app.services.key_service import (
    _compute_status,
    _days_until_expiry,
    create_key,
    rotate_key,
)
from app.utils import slugify

from .conftest import FakeProvisionedKey, FakeProvisionedUser


class TestSlugify:
    def test_basic(self):
        assert slugify("Core Engine") == "core-engine"

    def test_special_characters(self):
        assert slugify("Hello World!! Test") == "hello-world-test"

    def test_leading_trailing_hyphens(self):
        assert slugify("---Hello---") == "hello"

    def test_numbers(self):
        assert slugify("Team 42 Alpha") == "team-42-alpha"

    def test_already_slug(self):
        assert slugify("already-slug") == "already-slug"


class TestComputeStatus:
    def test_revoked_stays_revoked(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(status="revoked")
        assert _compute_status(key, now) == "revoked"

    def test_rotated_stays_rotated(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(status="rotated")
        assert _compute_status(key, now) == "rotated"

    def test_expired_key(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now - timedelta(days=1),
        )
        assert _compute_status(key, now) == "expired"

    def test_exact_expiry_boundary_is_expired(self):
        """A key whose portal_expires_at equals now should be 'expired', not 'expiring_soon'."""
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now,
        )
        assert _compute_status(key, now) == "expired"

    def test_expiring_soon(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now + timedelta(days=7),
        )
        assert _compute_status(key, now) == "expiring_soon"

    def test_expiring_soon_boundary_14_days(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now + timedelta(days=14),
        )
        assert _compute_status(key, now) == "expiring_soon"

    def test_active_key(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now + timedelta(days=30),
        )
        assert _compute_status(key, now) == "active"

    def test_naive_datetime_treated_as_utc(self):
        """Keys with naive datetimes (no tzinfo) should still work."""
        now = datetime.now(UTC)
        naive_future = now.replace(tzinfo=None) + timedelta(days=30)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=naive_future,
        )
        assert _compute_status(key, now) == "active"


class TestDaysUntilExpiry:
    def test_revoked_returns_none(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(status="revoked")
        assert _days_until_expiry(key, now) is None

    def test_rotated_returns_none(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(status="rotated")
        assert _days_until_expiry(key, now) is None

    def test_future_expiry(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now + timedelta(days=30),
        )
        result = _days_until_expiry(key, now)
        assert result is not None
        assert 29 <= result <= 30

    def test_past_expiry_returns_zero(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now - timedelta(days=5),
        )
        assert _days_until_expiry(key, now) == 0

    def test_today_expiry(self):
        now = datetime.now(UTC)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=now,
        )
        assert _days_until_expiry(key, now) == 0


def _auto_assign_id(obj):
    """Side-effect for session.add: assign a UUID id if the object lacks one."""
    if hasattr(obj, "id") and obj.id is None:
        obj.id = uuid4()


class TestCreateKeyDuration:
    @pytest.mark.asyncio(loop_scope="function")
    @patch("app.services.key_service.log_action", new_callable=AsyncMock)
    async def test_create_key_passes_duration_to_litellm(self, mock_log_action):
        """create_key should pass duration='{days}d' to litellm.generate_key."""
        db_user = FakeProvisionedUser(
            email="alice@example.com",
            litellm_user_id="litellm-user-1",
            default_key_duration_days=90,
        )
        db_user.id = uuid4()

        # Mock session — session.add is synchronous in real SQLAlchemy
        session = AsyncMock()
        session.add = MagicMock(side_effect=_auto_assign_id)
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        # Mock _get_db_user lookup
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = db_user

        # Mock membership lookup (returns a membership)
        membership = MagicMock()
        membership.team_alias = "Engineering"

        member_result = MagicMock()
        member_result.scalar_one_or_none.return_value = membership

        # Mock collision check (no collision)
        collision_result = MagicMock()
        collision_result.scalar_one_or_none.return_value = None

        session.execute = AsyncMock(side_effect=[user_result, member_result, collision_result])

        litellm = AsyncMock()
        litellm.generate_key = AsyncMock(return_value={"key": "sk-test-123", "token": "tok-test-123"})

        current_user = MagicMock()
        current_user.email = "alice@example.com"
        current_user.oid = "oid-123"

        teams_config = TeamsConfig(
            teams=[
                TeamConfig(entra_group_id="team-1", team_alias="Engineering", models=["gpt-5", "gpt-5.2"]),
            ]
        )

        await create_key(session, litellm, current_user, "team-1", teams_config)

        gen_kwargs = litellm.generate_key.call_args.kwargs
        assert gen_kwargs["duration"] == "90d"
        assert gen_kwargs["models"] == ["gpt-5", "gpt-5.2"]


class TestRotateKeyDuration:
    @pytest.mark.asyncio(loop_scope="function")
    @patch("app.services.key_service.log_action", new_callable=AsyncMock)
    async def test_rotate_key_passes_duration_to_litellm(self, mock_log_action):
        """rotate_key should pass duration='{days}d' to litellm.generate_key."""
        key_id = uuid4()
        db_user = FakeProvisionedUser(
            email="alice@example.com",
            litellm_user_id="litellm-user-1",
            default_key_duration_days=60,
        )
        db_user.id = uuid4()

        old_key = FakeProvisionedKey(
            id=str(key_id),
            user_id=str(db_user.id),
            litellm_key_id="tok-old-123",
            litellm_key_alias="alice-eng",
            team_id="team-1",
            team_alias="Engineering",
            status="active",
        )

        # Mock session — session.add is synchronous in real SQLAlchemy
        session = AsyncMock()
        session.add = MagicMock(side_effect=_auto_assign_id)
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        # Mock _get_db_user lookup
        user_result = MagicMock()
        user_result.scalar_one_or_none.return_value = db_user

        # Mock old key lookup
        key_result = MagicMock()
        key_result.scalar_one_or_none.return_value = old_key

        # Mock collision check (no collision)
        collision_result = MagicMock()
        collision_result.scalar_one_or_none.return_value = None

        session.execute = AsyncMock(side_effect=[user_result, key_result, collision_result])

        litellm = AsyncMock()
        litellm.delete_key = AsyncMock()
        litellm.generate_key = AsyncMock(return_value={"key": "sk-new-456", "token": "tok-new-456"})

        current_user = MagicMock()
        current_user.email = "alice@example.com"
        current_user.oid = "oid-123"

        teams_config = TeamsConfig(
            teams=[
                TeamConfig(entra_group_id="team-1", team_alias="Engineering", models=["gpt-5", "gpt-5.2"]),
            ]
        )

        await rotate_key(session, litellm, current_user, str(key_id), teams_config)

        gen_kwargs = litellm.generate_key.call_args.kwargs
        assert gen_kwargs["duration"] == "60d"
        assert gen_kwargs["models"] == ["gpt-5", "gpt-5.2"]
