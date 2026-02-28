"""Tests for cron job orchestrators: rotation, deprovisioning, notification."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.services.deprovisioning_service import run_deprovisioning_job
from app.services.notification_service import run_notification_job
from app.services.rotation_service import run_rotation_job

from .conftest import FakeProvisionedKey, FakeProvisionedUser


def _make_settings():
    settings = MagicMock()
    settings.litellm_base_url = "http://litellm:4000"
    settings.litellm_master_key = "sk-test"
    settings.portal_base_url = "https://portal.example.com"
    settings.smtp_host = ""
    settings.teams_config_path = "teams.yaml"
    settings.azure_client_id = "test-client-id"
    settings.azure_client_secret = "test-secret"  # noqa: S105
    settings.azure_tenant_id = "test-tenant"
    return settings


# ---------------------------------------------------------------------------
# run_rotation_job
# ---------------------------------------------------------------------------


class TestRunRotationJob:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_processes_all_expired_keys(self):
        """Job processes all expired keys, not just the first one."""
        settings = _make_settings()
        key1_id = str(uuid4())
        key2_id = str(uuid4())

        # Two expired keys returned from bulk query
        expired_key1 = FakeProvisionedKey(
            id=key1_id,
            status="active",
            portal_expires_at=datetime.now(UTC) - timedelta(days=1),
            litellm_key_id="tok-1",
            litellm_key_alias="alice-eng",
            team_alias="Engineering",
        )
        expired_key2 = FakeProvisionedKey(
            id=key2_id,
            status="active",
            portal_expires_at=datetime.now(UTC) - timedelta(days=2),
            litellm_key_id="tok-2",
            litellm_key_alias="bob-data",
            team_alias="Data Science",
        )

        user1 = FakeProvisionedUser(email="alice@example.com", is_active=True)
        user2 = FakeProvisionedUser(email="bob@example.com", is_active=True)
        expired_key1.user = user1
        expired_key2.user = user2

        call_count = 0

        def mock_session_factory():
            nonlocal call_count
            call_count += 1
            session = AsyncMock()

            if call_count == 1:
                # Bulk query — return expired key IDs
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [expired_key1, expired_key2]
                session.execute = AsyncMock(return_value=mock_result)
            elif call_count == 2:
                # Per-key session for key1
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = expired_key1
                session.execute = AsyncMock(return_value=mock_result)
                session.flush = AsyncMock()
                session.commit = AsyncMock()
            else:
                # Per-key session for key2
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = expired_key2
                session.execute = AsyncMock(return_value=mock_result)
                session.flush = AsyncMock()
                session.commit = AsyncMock()

            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        mock_litellm = AsyncMock()
        mock_litellm.delete_key = AsyncMock()
        mock_litellm.generate_key = AsyncMock(return_value={"key": "sk-new", "token": "tok-new"})
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.rotation_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.rotation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.rotation_service.send_email", new_callable=AsyncMock),
            patch("app.services.rotation_service.log_action", new_callable=AsyncMock),
        ):
            await run_rotation_job(settings)

        # Both keys should have been processed
        assert mock_litellm.delete_key.call_count == 2
        assert mock_litellm.generate_key.call_count == 2
        mock_litellm.close.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_one_failure_doesnt_stop_others(self):
        """If one key rotation fails, the rest continue."""
        settings = _make_settings()
        key1_id = str(uuid4())
        key2_id = str(uuid4())

        expired_key1 = FakeProvisionedKey(id=key1_id, status="active", litellm_key_id="tok-1")
        expired_key2 = FakeProvisionedKey(
            id=key2_id,
            status="active",
            litellm_key_id="tok-2",
            litellm_key_alias="bob-eng",
            team_alias="Engineering",
            portal_expires_at=datetime.now(UTC) - timedelta(days=1),
        )

        user2 = FakeProvisionedUser(email="bob@example.com", is_active=True)
        expired_key2.user = user2

        call_count = 0

        def mock_session_factory():
            nonlocal call_count
            call_count += 1
            session = AsyncMock()

            if call_count == 1:
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [expired_key1, expired_key2]
                session.execute = AsyncMock(return_value=mock_result)
            elif call_count == 2:
                # First key session — will raise exception
                session.execute = AsyncMock(side_effect=Exception("DB error"))
            else:
                # Second key session — succeeds
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = expired_key2
                session.execute = AsyncMock(return_value=mock_result)
                session.flush = AsyncMock()
                session.commit = AsyncMock()

            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        mock_litellm = AsyncMock()
        mock_litellm.delete_key = AsyncMock()
        mock_litellm.generate_key = AsyncMock(return_value={"key": "sk-new", "token": "tok-new"})
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.rotation_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.rotation_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.rotation_service.send_email", new_callable=AsyncMock),
            patch("app.services.rotation_service.log_action", new_callable=AsyncMock),
        ):
            await run_rotation_job(settings)

        # Second key was still processed despite first failure
        assert mock_litellm.generate_key.call_count >= 1
        mock_litellm.close.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_expired_keys(self):
        """No expired keys means no work done."""
        settings = _make_settings()

        def mock_session_factory():
            session = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            session.execute = AsyncMock(return_value=mock_result)
            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        mock_litellm = AsyncMock()
        mock_litellm.close = AsyncMock()

        with (
            patch("app.services.rotation_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.rotation_service.LiteLLMClient", return_value=mock_litellm),
        ):
            await run_rotation_job(settings)

        mock_litellm.generate_key.assert_not_called()
        mock_litellm.close.assert_called_once()


# ---------------------------------------------------------------------------
# run_deprovisioning_job
# ---------------------------------------------------------------------------


class TestRunDeprovisioningJob:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_deprovisions_unauthorized_users(self):
        """Users no longer in authorized groups are deprovisioned."""
        settings = _make_settings()
        user_id = str(uuid4())

        user = FakeProvisionedUser(
            id=user_id,
            email="alice@example.com",
            is_active=True,
            keys=[FakeProvisionedKey(litellm_key_id="tok-1", status="active")],
        )

        call_count = 0

        def mock_session_factory():
            nonlocal call_count
            call_count += 1
            session = AsyncMock()

            if call_count == 1:
                # Bulk query returns active users
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [user]
                session.execute = AsyncMock(return_value=mock_result)
            else:
                # Per-user query returns user with keys
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = user
                session.execute = AsyncMock(return_value=mock_result)
                session.commit = AsyncMock()

            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        mock_litellm = AsyncMock()
        mock_litellm.block_key = AsyncMock()
        mock_litellm.close = AsyncMock()

        mock_graph = MagicMock()
        mock_graph.get_user_groups = AsyncMock(return_value=[])  # No groups = unauthorized

        from app.core.teams import TeamsConfig

        mock_teams_config = TeamsConfig()

        with (
            patch("app.services.deprovisioning_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.deprovisioning_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.deprovisioning_service.GraphClient", return_value=mock_graph),
            patch("app.services.deprovisioning_service.load_teams_config", return_value=mock_teams_config),
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock),
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock),
        ):
            await run_deprovisioning_job(settings)

        assert user.is_active is False
        assert user.deprovisioned_at is not None
        mock_litellm.close.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_error_in_one_user_doesnt_stop_others(self):
        """If processing one user fails, others continue."""
        settings = _make_settings()
        user1 = FakeProvisionedUser(id=str(uuid4()), email="fail@example.com", is_active=True)
        user2 = FakeProvisionedUser(
            id=str(uuid4()),
            email="ok@example.com",
            is_active=True,
            keys=[FakeProvisionedKey(litellm_key_id="tok-ok", status="active")],
        )

        call_count = 0

        def mock_session_factory():
            nonlocal call_count
            call_count += 1
            session = AsyncMock()

            if call_count == 1:
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [user1, user2]
                session.execute = AsyncMock(return_value=mock_result)
            elif call_count == 2:
                # First user session fails
                session.execute = AsyncMock(side_effect=Exception("DB error"))
            else:
                # Second user session succeeds
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = user2
                session.execute = AsyncMock(return_value=mock_result)
                session.commit = AsyncMock()

            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        mock_litellm = AsyncMock()
        mock_litellm.block_key = AsyncMock()
        mock_litellm.close = AsyncMock()

        mock_graph = MagicMock()
        mock_graph.get_user_groups = AsyncMock(return_value=[])

        from app.core.teams import TeamsConfig

        with (
            patch("app.services.deprovisioning_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.deprovisioning_service.LiteLLMClient", return_value=mock_litellm),
            patch("app.services.deprovisioning_service.GraphClient", return_value=mock_graph),
            patch("app.services.deprovisioning_service.load_teams_config", return_value=TeamsConfig()),
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock),
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock),
        ):
            await run_deprovisioning_job(settings)

        # user2 was still processed
        assert user2.is_active is False
        mock_litellm.close.assert_called_once()


# ---------------------------------------------------------------------------
# run_notification_job
# ---------------------------------------------------------------------------


class TestRunNotificationJob:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_sends_notifications_for_expiring_keys(self):
        """Job finds keys expiring within thresholds and sends notifications."""
        settings = _make_settings()
        key_id = str(uuid4())

        key = FakeProvisionedKey(
            id=key_id,
            status="active",
            litellm_key_alias="alice-eng",
            team_alias="Engineering",
            portal_expires_at=datetime.now(UTC) + timedelta(days=5),  # Within 7d threshold
        )
        user = FakeProvisionedUser(
            email="alice@example.com",
            display_name="Alice",
            is_active=True,
        )
        key.user = user

        call_count = 0

        def mock_session_factory():
            nonlocal call_count
            call_count += 1
            session = AsyncMock()

            if call_count == 1:
                # Bulk query returns active keys
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [key]
                session.execute = AsyncMock(return_value=mock_result)
            else:
                # Per-key query returns key with user
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = key
                session.execute = AsyncMock(return_value=mock_result)
                # begin_nested for SAVEPOINT
                nested_cm = AsyncMock()
                nested_cm.__aenter__ = AsyncMock(return_value=None)
                nested_cm.__aexit__ = AsyncMock(return_value=False)
                session.begin_nested = MagicMock(return_value=nested_cm)
                session.flush = AsyncMock()
                session.commit = AsyncMock()

            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        with (
            patch("app.services.notification_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.notification_service.send_email", new_callable=AsyncMock) as mock_send,
            patch("app.services.notification_service.log_action", new_callable=AsyncMock),
        ):
            await run_notification_job(settings)

        # At least one notification sent (for 7d and possibly 14d)
        assert mock_send.call_count >= 1

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_keys_means_no_notifications(self):
        """Job with no active keys does nothing."""
        settings = _make_settings()

        def mock_session_factory():
            session = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = []
            session.execute = AsyncMock(return_value=mock_result)
            return AsyncMock(__aenter__=AsyncMock(return_value=session), __aexit__=AsyncMock(return_value=False))

        with (
            patch("app.services.notification_service.async_session_factory", side_effect=mock_session_factory),
            patch("app.services.notification_service.send_email", new_callable=AsyncMock) as mock_send,
        ):
            await run_notification_job(settings)

        mock_send.assert_not_called()
