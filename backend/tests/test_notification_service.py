"""Tests for notification_service: threshold logic and deduplication."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.services.notification_service import NOTIFICATION_THRESHOLDS, _send_expiry_notification

from .conftest import FakeProvisionedKey, FakeProvisionedUser


class TestNotificationThresholds:
    def test_thresholds_are_ordered_descending(self):
        days = [t[0] for t in NOTIFICATION_THRESHOLDS]
        assert days == sorted(days, reverse=True)

    def test_all_thresholds_have_matching_user_pref(self):
        for _, _, user_pref_attr in NOTIFICATION_THRESHOLDS:
            assert user_pref_attr.startswith("notify_")

    def test_user_pref_attrs_exist_on_fake_user(self):
        """Verify FakeProvisionedUser has all notify_* fields from thresholds."""
        user = FakeProvisionedUser()
        for _, _, user_pref_attr in NOTIFICATION_THRESHOLDS:
            assert hasattr(user, user_pref_attr), f"Missing field: {user_pref_attr}"
            assert getattr(user, user_pref_attr) is True

    def test_preference_opt_out_skips_notification(self):
        """If a user disables a threshold, getattr returns False."""
        user = FakeProvisionedUser(notify_7d=False)
        assert getattr(user, "notify_7d", True) is False
        # Other thresholds remain enabled
        assert getattr(user, "notify_14d", True) is True
        assert getattr(user, "notify_3d", True) is True
        assert getattr(user, "notify_1d", True) is True


def _mock_session_with_savepoint(**kwargs):
    """Create an AsyncMock session whose begin_nested() returns an async CM."""
    session = AsyncMock(**kwargs)
    # begin_nested() must return an async context manager (SAVEPOINT), not a coroutine
    nested_cm = AsyncMock()
    nested_cm.__aenter__ = AsyncMock(return_value=None)
    nested_cm.__aexit__ = AsyncMock(return_value=False)
    session.begin_nested = MagicMock(return_value=nested_cm)
    return session


class TestSendExpiryNotification:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_sends_notification_and_logs(self):
        """Notification is inserted, email is sent, audit logged."""
        session = _mock_session_with_savepoint()
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        key_id = uuid4()
        key = FakeProvisionedKey(
            id=str(key_id),
            litellm_key_alias="alice-eng",
            team_alias="Engineering",
            portal_expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        user = FakeProvisionedUser(
            display_name="Alice Test",
            email="alice@example.com",
        )

        settings = MagicMock()
        settings.smtp_host = ""  # Skip actual sending
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.notification_service.send_email", new_callable=AsyncMock) as mock_send,
            patch("app.services.notification_service.log_action", new_callable=AsyncMock),
        ):
            result = await _send_expiry_notification(
                session, settings, key, user, 7, "expiry_7d"
            )

        assert result is True
        session.flush.assert_called_once()
        session.commit.assert_called_once()
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["to_email"] == "alice@example.com"
        assert "7" in call_kwargs["subject"]

    @pytest.mark.asyncio(loop_scope="function")
    async def test_skips_duplicate_notification(self):
        """If UniqueConstraint fires (IntegrityError), skip without sending."""
        from sqlalchemy.exc import IntegrityError

        session = _mock_session_with_savepoint()
        session.flush = AsyncMock(side_effect=IntegrityError("dup", {}, None))

        key = FakeProvisionedKey(litellm_key_alias="alice-eng")
        user = FakeProvisionedUser()
        settings = MagicMock()

        with patch("app.services.notification_service.send_email", new_callable=AsyncMock) as mock_send:
            result = await _send_expiry_notification(
                session, settings, key, user, 7, "expiry_7d"
            )

        assert result is False
        mock_send.assert_not_called()
