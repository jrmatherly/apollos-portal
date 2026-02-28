"""Tests for deprovisioning_service: user removal and key blocking."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.services.deprovisioning_service import _deprovision_user

from .conftest import FakeProvisionedKey, FakeProvisionedUser


class TestDeprovisionUser:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_blocks_active_keys_and_deactivates_user(self):
        """Active keys are blocked in LiteLLM, revoked in DB, user deactivated."""
        session = AsyncMock()
        session.commit = AsyncMock()

        litellm = AsyncMock()
        litellm.block_key = AsyncMock()

        active_key = FakeProvisionedKey(
            litellm_key_id="tok-active-1",
            status="active",
        )
        revoked_key = FakeProvisionedKey(
            litellm_key_id="tok-revoked-1",
            status="revoked",
        )
        user = FakeProvisionedUser(
            email="alice@example.com",
            display_name="Alice Test",
            keys=[active_key, revoked_key],
        )

        settings = MagicMock()
        settings.smtp_host = ""
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock),
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock) as mock_log,
        ):
            await _deprovision_user(session, settings, litellm, user)

        # Only active key blocked in LiteLLM
        litellm.block_key.assert_called_once_with("tok-active-1")

        # Active key revoked, revoked key untouched
        assert active_key.status == "revoked"
        assert active_key.revoked_at is not None
        assert revoked_key.status == "revoked"  # was already revoked
        assert revoked_key.revoked_at is None  # unchanged

        # User deactivated
        assert user.is_active is False
        assert user.deprovisioned_at is not None

        # Audit: one key deprovisioned + one user deprovisioned = 2 calls
        assert mock_log.call_count == 2
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_handles_litellm_block_failure(self):
        """If LiteLLM block fails, key is still revoked locally."""
        session = AsyncMock()
        session.commit = AsyncMock()

        litellm = AsyncMock()
        litellm.block_key = AsyncMock(side_effect=Exception("LiteLLM unreachable"))

        key = FakeProvisionedKey(litellm_key_id="tok-fail", status="active")
        user = FakeProvisionedUser(keys=[key])

        settings = MagicMock()
        settings.smtp_host = ""
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock),
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock),
        ):
            # Should NOT raise despite LiteLLM failure
            await _deprovision_user(session, settings, litellm, user)

        # Key still marked revoked locally
        assert key.status == "revoked"
        assert user.is_active is False
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_sends_deprovisioned_email(self):
        """Deprovisioned email is sent to the user after commit."""
        session = AsyncMock()
        session.commit = AsyncMock()

        litellm = AsyncMock()
        user = FakeProvisionedUser(
            email="bob@example.com",
            display_name="Bob Test",
            keys=[],
        )

        settings = MagicMock()
        settings.smtp_host = "smtp.example.com"
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock) as mock_send,
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock),
        ):
            await _deprovision_user(session, settings, litellm, user)

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["to_email"] == "bob@example.com"
        assert "Removed" in call_kwargs["subject"]

    @pytest.mark.asyncio(loop_scope="function")
    async def test_skips_keys_without_litellm_id(self):
        """Keys with no litellm_key_id should be revoked locally without LiteLLM call."""
        session = AsyncMock()
        session.commit = AsyncMock()

        litellm = AsyncMock()

        key = FakeProvisionedKey(litellm_key_id=None, status="active")
        user = FakeProvisionedUser(keys=[key])

        settings = MagicMock()
        settings.smtp_host = ""
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.deprovisioning_service.send_email", new_callable=AsyncMock),
            patch("app.services.deprovisioning_service.log_action", new_callable=AsyncMock),
        ):
            await _deprovision_user(session, settings, litellm, user)

        litellm.block_key.assert_not_called()
        assert key.status == "revoked"
