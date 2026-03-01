"""Tests for rotation_service: auto-rotate logic and error handling."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.services.rotation_service import _auto_rotate_key
from app.utils import slugify

from .conftest import FakeProvisionedKey, FakeProvisionedUser


class TestSlugify:
    def test_basic(self):
        assert slugify("Engineering Team") == "engineering-team"


class TestAutoRotateKey:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_deletes_old_key_creates_new(self):
        """Auto-rotate should delete old key, mark rotated, create new key."""
        session = AsyncMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        # Mock the collision-check query to return no existing key
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=mock_result)

        litellm = AsyncMock()
        litellm.delete_key = AsyncMock()
        litellm.generate_key = AsyncMock(
            return_value={
                "key": "sk-new-123",
                "token": "tok-new-123",
            }
        )

        key_id = uuid4()
        key = FakeProvisionedKey(
            id=str(key_id),
            litellm_key_id="tok-old-123",
            litellm_key_alias="alice-eng",
            team_id="team-1",
            team_alias="Engineering",
            portal_expires_at=datetime.now(UTC) - timedelta(days=1),
        )
        user = FakeProvisionedUser(
            email="alice@example.com",
            litellm_user_id="litellm-user-1",
            default_key_duration_days=90,
        )

        settings = MagicMock()
        settings.smtp_host = ""
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.rotation_service.send_email", new_callable=AsyncMock),
            patch("app.services.rotation_service.log_action", new_callable=AsyncMock),
        ):
            await _auto_rotate_key(session, settings, litellm, key, user)

        # Old key deleted from LiteLLM
        litellm.delete_key.assert_called_once_with("tok-old-123")

        # Old key marked rotated
        assert key.status == "rotated"
        assert key.revoked_at is not None

        # New key generated
        litellm.generate_key.assert_called_once()
        gen_kwargs = litellm.generate_key.call_args.kwargs
        assert gen_kwargs["team_id"] == "team-1"
        assert gen_kwargs["user_id"] == "litellm-user-1"

        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_handles_litellm_delete_failure(self):
        """If LiteLLM delete fails, rotation should still proceed."""
        session = AsyncMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=mock_result)

        litellm = AsyncMock()
        litellm.delete_key = AsyncMock(side_effect=Exception("LiteLLM unreachable"))
        litellm.generate_key = AsyncMock(
            return_value={
                "key": "sk-new-456",
                "token": "tok-new-456",
            }
        )

        key = FakeProvisionedKey(
            litellm_key_id="tok-failing",
            litellm_key_alias="alice-eng",
            team_alias="Engineering",
            portal_expires_at=datetime.now(UTC) - timedelta(days=1),
        )
        user = FakeProvisionedUser(email="alice@example.com")

        settings = MagicMock()
        settings.smtp_host = ""
        settings.portal_base_url = "https://portal.example.com"

        with (
            patch("app.services.rotation_service.send_email", new_callable=AsyncMock),
            patch("app.services.rotation_service.log_action", new_callable=AsyncMock),
        ):
            # Should NOT raise despite LiteLLM delete failure
            await _auto_rotate_key(session, settings, litellm, key, user)

        # New key still generated
        litellm.generate_key.assert_called_once()
        assert key.status == "rotated"
