"""Tests for key_service pure functions and status computation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.key_service import _compute_status, _days_until_expiry
from app.utils import slugify

from .conftest import FakeProvisionedKey


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
