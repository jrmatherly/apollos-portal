"""Tests for email_service: template rendering and send_email behavior."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from app.config import Settings
from app.services.email_service import render_template, send_email


class TestRenderTemplate:
    def test_expiry_warning_renders_days(self):
        html = render_template(
            "expiry_warning.html",
            {
                "user_name": "Alice",
                "key_alias": "alice-engineering",
                "team_alias": "Engineering",
                "days_until_expiry": 7,
                "portal_url": "https://portal.example.com",
            },
        )
        assert "Alice" in html
        assert "alice-engineering" in html
        assert "Engineering" in html
        assert "7 days" in html
        assert "https://portal.example.com/keys" in html

    def test_expiry_warning_singular_day(self):
        html = render_template(
            "expiry_warning.html",
            {
                "user_name": "Bob",
                "key_alias": "bob-data",
                "team_alias": "Data",
                "days_until_expiry": 1,
                "portal_url": "https://portal.example.com",
            },
        )
        assert "1 day" in html
        # Should NOT say "1 days"
        assert "1 days" not in html

    def test_rotation_complete_renders(self):
        html = render_template(
            "rotation_complete.html",
            {
                "user_name": "Alice",
                "old_key_alias": "alice-eng-old",
                "new_key_alias": "alice-eng",
                "team_alias": "Engineering",
                "expires_at": "2026-06-01",
                "portal_url": "https://portal.example.com",
            },
        )
        assert "alice-eng-old" in html
        assert "alice-eng" in html
        assert "2026-06-01" in html

    def test_key_revoked_renders(self):
        html = render_template(
            "key_revoked.html",
            {
                "user_name": "Alice",
                "key_alias": "alice-eng",
                "team_alias": "Engineering",
                "portal_url": "https://portal.example.com",
            },
        )
        assert "revoked" in html.lower()
        assert "alice-eng" in html

    def test_deprovisioned_renders(self):
        html = render_template(
            "deprovisioned.html",
            {
                "user_name": "Alice",
                "portal_url": "https://portal.example.com",
            },
        )
        assert "Alice" in html
        assert "removed" in html.lower()

    def test_base_template_branding(self):
        html = render_template(
            "expiry_warning.html",
            {
                "user_name": "Test",
                "key_alias": "test",
                "team_alias": "Test",
                "days_until_expiry": 7,
                "portal_url": "https://example.com",
            },
        )
        assert "Apollos AI" in html


class TestSendEmail:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_skips_when_no_smtp_host(self):
        """send_email should silently skip when smtp_host is empty."""
        settings = Settings(smtp_host="", smtp_from="noreply@example.com")
        # Should not raise, should not call aiosmtplib
        await send_email(
            settings=settings,
            to_email="user@example.com",
            subject="Test",
            html_body="<p>Test</p>",
        )

    @pytest.mark.asyncio(loop_scope="function")
    async def test_swallows_smtp_errors(self):
        """send_email should log but not raise on SMTP failure."""
        settings = Settings(
            smtp_host="smtp.example.com",
            smtp_from="noreply@example.com",
        )
        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            mock_send.side_effect = ConnectionRefusedError("SMTP down")
            # Should not raise
            await send_email(
                settings=settings,
                to_email="user@example.com",
                subject="Test",
                html_body="<p>Test</p>",
            )
            mock_send.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_sends_email_when_configured(self):
        """send_email should call aiosmtplib.send with correct params."""
        settings = Settings(
            smtp_host="smtp.example.com",
            smtp_port=587,
            smtp_from="noreply@example.com",
            smtp_use_tls=True,
        )
        with patch("app.services.email_service.aiosmtplib.send", new_callable=AsyncMock) as mock_send:
            await send_email(
                settings=settings,
                to_email="user@example.com",
                subject="Test Subject",
                html_body="<p>Hello</p>",
            )
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args
            assert call_kwargs.kwargs["hostname"] == "smtp.example.com"
            assert call_kwargs.kwargs["port"] == 587
