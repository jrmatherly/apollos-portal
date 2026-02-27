"""Tests for key_service pure functions and status computation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.key_service import _compute_status, _days_until_expiry, _slugify

from .conftest import FakeProvisionedKey


class TestSlugify:
    def test_basic(self):
        assert _slugify("Core Engine") == "core-engine"

    def test_special_characters(self):
        assert _slugify("Hello World!! Test") == "hello-world-test"

    def test_leading_trailing_hyphens(self):
        assert _slugify("---Hello---") == "hello"

    def test_numbers(self):
        assert _slugify("Team 42 Alpha") == "team-42-alpha"

    def test_already_slug(self):
        assert _slugify("already-slug") == "already-slug"


class TestComputeStatus:
    def test_revoked_stays_revoked(self):
        key = FakeProvisionedKey(status="revoked")
        assert _compute_status(key) == "revoked"

    def test_rotated_stays_rotated(self):
        key = FakeProvisionedKey(status="rotated")
        assert _compute_status(key) == "rotated"

    def test_expired_key(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) - timedelta(days=1),
        )
        assert _compute_status(key) == "expired"

    def test_expiring_soon(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        assert _compute_status(key) == "expiring_soon"

    def test_expiring_soon_boundary_14_days(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) + timedelta(days=14),
        )
        assert _compute_status(key) == "expiring_soon"

    def test_active_key(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        assert _compute_status(key) == "active"

    def test_naive_datetime_treated_as_utc(self):
        """Keys with naive datetimes (no tzinfo) should still work."""
        naive_future = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=30)
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=naive_future,
        )
        assert _compute_status(key) == "active"


class TestDaysUntilExpiry:
    def test_revoked_returns_none(self):
        key = FakeProvisionedKey(status="revoked")
        assert _days_until_expiry(key) is None

    def test_rotated_returns_none(self):
        key = FakeProvisionedKey(status="rotated")
        assert _days_until_expiry(key) is None

    def test_future_expiry(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        result = _days_until_expiry(key)
        assert result is not None
        assert 29 <= result <= 30

    def test_past_expiry_returns_zero(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC) - timedelta(days=5),
        )
        assert _days_until_expiry(key) == 0

    def test_today_expiry(self):
        key = FakeProvisionedKey(
            status="active",
            portal_expires_at=datetime.now(UTC),
        )
        assert _days_until_expiry(key) == 0
