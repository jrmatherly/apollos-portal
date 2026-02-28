"""Tests for rate limiting key function and middleware."""

from __future__ import annotations

from unittest.mock import MagicMock

from app.core.rate_limit import RateLimitUserMiddleware, _key_func


class TestKeyFunc:
    def test_returns_user_oid_when_available(self):
        """Authenticated requests rate-limit by user OID."""
        request = MagicMock()
        request.state.rate_limit_user = "user-oid-123"
        assert _key_func(request) == "user-oid-123"

    def test_falls_back_to_ip_when_no_user(self):
        """Unauthenticated requests rate-limit by IP address."""
        request = MagicMock()
        request.state = MagicMock(spec=[])  # no rate_limit_user attr
        request.client = MagicMock()
        request.client.host = "192.168.1.1"
        result = _key_func(request)
        assert result == "192.168.1.1"


class TestRateLimitUserMiddleware:
    def test_extracts_oid_from_valid_jwt(self):
        """OID is correctly extracted from a JWT payload."""
        import base64
        import json

        payload = base64.urlsafe_b64encode(json.dumps({"oid": "user-123"}).encode()).rstrip(b"=")
        token = f"header.{payload.decode()}.signature"
        result = RateLimitUserMiddleware._extract_oid(token)
        assert result == "user-123"

    def test_returns_none_for_invalid_jwt(self):
        """Invalid JWT returns None without raising."""
        assert RateLimitUserMiddleware._extract_oid("not-a-jwt") is None

    def test_returns_none_for_missing_oid(self):
        """JWT without oid claim returns None."""
        import base64
        import json

        payload = base64.urlsafe_b64encode(json.dumps({"sub": "user-123"}).encode()).rstrip(b"=")
        token = f"header.{payload.decode()}.signature"
        assert RateLimitUserMiddleware._extract_oid(token) is None
