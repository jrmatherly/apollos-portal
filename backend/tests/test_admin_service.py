"""Tests for admin_service: admin key revoke, user deprovision/reprovision."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.auth import CurrentUser

from .conftest import FakeProvisionedKey, FakeProvisionedUser


def _mock_admin() -> CurrentUser:
    return CurrentUser(
        oid="admin-oid-456",
        email="admin@example.com",
        name="Admin User",
        roles=["Portal.User", "Portal.Admin"],
    )


def _mock_session_returning(result_value):
    """Create an AsyncMock session whose execute() returns a mock with scalar_one_or_none()."""
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = result_value
    session.execute = AsyncMock(return_value=mock_result)
    session.commit = AsyncMock()
    return session


class TestAdminRevokeKey:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_revokes_active_key(self):
        """Active key is blocked in LiteLLM, revoked in DB, and audit logged."""
        key = FakeProvisionedKey(litellm_key_id="tok-123", status="active")
        session = _mock_session_returning(key)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock) as mock_log:
            from app.services.admin_service import admin_revoke_key

            await admin_revoke_key(session, litellm, admin, str(key.id))

        litellm.block_key.assert_called_once_with("tok-123")
        assert key.status == "revoked"
        assert key.revoked_at is not None
        mock_log.assert_called_once()
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_key_not_found_raises_lookup_error(self):
        session = _mock_session_returning(None)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_revoke_key

            with pytest.raises(LookupError, match="not found"):
                await admin_revoke_key(session, litellm, admin, "nonexistent-id")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_already_revoked_key_raises_value_error(self):
        key = FakeProvisionedKey(status="revoked")
        session = _mock_session_returning(key)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_revoke_key

            with pytest.raises(ValueError, match="already revoked"):
                await admin_revoke_key(session, litellm, admin, str(key.id))

    @pytest.mark.asyncio(loop_scope="function")
    async def test_skips_litellm_when_no_key_id(self):
        """Keys without litellm_key_id should still be revoked locally."""
        key = FakeProvisionedKey(litellm_key_id=None, status="active")
        session = _mock_session_returning(key)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_revoke_key

            await admin_revoke_key(session, litellm, admin, str(key.id))

        litellm.block_key.assert_not_called()
        assert key.status == "revoked"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_handles_litellm_block_failure(self):
        """Key is still revoked locally even if LiteLLM block fails."""
        key = FakeProvisionedKey(litellm_key_id="tok-fail", status="active")
        session = _mock_session_returning(key)
        litellm = AsyncMock()
        litellm.block_key = AsyncMock(side_effect=Exception("LiteLLM unreachable"))
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_revoke_key

            await admin_revoke_key(session, litellm, admin, str(key.id))

        assert key.status == "revoked"
        session.commit.assert_called_once()


class TestAdminDeprovisionUser:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_deprovisions_active_user(self):
        """Active keys blocked, user deactivated, audit logged."""
        active_key = FakeProvisionedKey(litellm_key_id="tok-1", status="active")
        user = FakeProvisionedUser(
            is_active=True,
            keys=[active_key],
        )
        session = _mock_session_returning(user)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock) as mock_log:
            from app.services.admin_service import admin_deprovision_user

            await admin_deprovision_user(session, litellm, admin, str(user.id))

        litellm.block_key.assert_called_once_with("tok-1")
        assert active_key.status == "revoked"
        assert user.is_active is False
        assert user.deprovisioned_at is not None
        # One call for key deprovisioned + one for user deprovisioned
        assert mock_log.call_count == 2
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_user_not_found_raises_lookup_error(self):
        session = _mock_session_returning(None)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_deprovision_user

            with pytest.raises(LookupError, match="not found"):
                await admin_deprovision_user(session, litellm, admin, "nonexistent-id")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_already_deprovisioned_raises_value_error(self):
        user = FakeProvisionedUser(is_active=False)
        session = _mock_session_returning(user)
        litellm = AsyncMock()
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_deprovision_user

            with pytest.raises(ValueError, match="already deprovisioned"):
                await admin_deprovision_user(session, litellm, admin, str(user.id))

    @pytest.mark.asyncio(loop_scope="function")
    async def test_handles_litellm_block_failure(self):
        """User is still deprovisioned locally even if LiteLLM block fails."""
        key = FakeProvisionedKey(litellm_key_id="tok-fail", status="active")
        user = FakeProvisionedUser(is_active=True, keys=[key])
        session = _mock_session_returning(user)
        litellm = AsyncMock()
        litellm.block_key = AsyncMock(side_effect=Exception("LiteLLM unreachable"))
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_deprovision_user

            await admin_deprovision_user(session, litellm, admin, str(user.id))

        assert key.status == "revoked"
        assert user.is_active is False
        session.commit.assert_called_once()


class TestAdminReprovisionUser:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_reprovisions_inactive_user(self):
        """Deprovisioned user is re-activated and audit logged."""
        user = FakeProvisionedUser(is_active=False)
        session = _mock_session_returning(user)
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock) as mock_log:
            from app.services.admin_service import admin_reprovision_user

            await admin_reprovision_user(session, admin, str(user.id))

        assert user.is_active is True
        assert user.deprovisioned_at is None
        mock_log.assert_called_once()
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_user_not_found_raises_lookup_error(self):
        session = _mock_session_returning(None)
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_reprovision_user

            with pytest.raises(LookupError, match="not found"):
                await admin_reprovision_user(session, admin, "nonexistent-id")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_already_active_raises_value_error(self):
        user = FakeProvisionedUser(is_active=True)
        session = _mock_session_returning(user)
        admin = _mock_admin()

        with patch("app.services.admin_service.log_action", new_callable=AsyncMock):
            from app.services.admin_service import admin_reprovision_user

            with pytest.raises(ValueError, match="already active"):
                await admin_reprovision_user(session, admin, str(user.id))
