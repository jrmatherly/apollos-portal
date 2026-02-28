"""Tests for auth module: CurrentUser, token role extraction."""

from __future__ import annotations

import base64
import json
from unittest.mock import patch

import pytest
from app.core.auth import CurrentUser, _get_token_claims


class TestCurrentUser:
    def test_basic_properties(self):
        user = CurrentUser(
            oid="oid-1",
            email="test@example.com",
            name="Test User",
            roles=["Portal.User"],
        )
        assert user.oid == "oid-1"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.roles == ["Portal.User"]

    def test_is_admin_true(self):
        user = CurrentUser(
            oid="oid-1",
            email="admin@example.com",
            name="Admin",
            roles=["Portal.Admin"],
        )
        with patch("app.config.get_settings") as mock_settings:
            mock_settings.return_value.portal_admin_role = "Portal.Admin"
            assert user.is_admin is True

    def test_is_admin_false(self):
        user = CurrentUser(
            oid="oid-1",
            email="user@example.com",
            name="User",
            roles=["Portal.User"],
        )
        with patch("app.config.get_settings") as mock_settings:
            mock_settings.return_value.portal_admin_role = "Portal.Admin"
            assert user.is_admin is False


class TestGetTokenClaims:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_extracts_roles_and_aud(self):
        """Build a fake JWT with roles and aud in payload and verify extraction."""
        header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).rstrip(b"=")
        payload = base64.urlsafe_b64encode(
            json.dumps({"roles": ["Portal.User", "Portal.Admin"], "aud": "my-client-id"}).encode()
        ).rstrip(b"=")
        signature = base64.urlsafe_b64encode(b"fakesig").rstrip(b"=")
        token = f"{header.decode()}.{payload.decode()}.{signature.decode()}"

        claims = await _get_token_claims(token)
        assert claims["roles"] == ["Portal.User", "Portal.Admin"]
        assert claims["aud"] == "my-client-id"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_roles_claim(self):
        """JWT without roles claim returns empty list."""
        header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).rstrip(b"=")
        payload = base64.urlsafe_b64encode(json.dumps({"sub": "user-1"}).encode()).rstrip(b"=")
        signature = base64.urlsafe_b64encode(b"fakesig").rstrip(b"=")
        token = f"{header.decode()}.{payload.decode()}.{signature.decode()}"

        claims = await _get_token_claims(token)
        assert claims["roles"] == []
        assert claims["aud"] == ""

    @pytest.mark.asyncio(loop_scope="function")
    async def test_malformed_token(self):
        """Malformed token returns empty defaults instead of crashing."""
        claims = await _get_token_claims("not-a-jwt")
        assert claims["roles"] == []
        assert claims["aud"] == ""
