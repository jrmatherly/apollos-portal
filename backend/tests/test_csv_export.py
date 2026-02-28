"""Tests for the admin CSV export endpoint (S7)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.auth import require_admin
from app.core.database import get_session
from app.main import app
from httpx import ASGITransport, AsyncClient


def _mock_admin():
    from app.config import get_settings
    from app.core.auth import CurrentUser

    return CurrentUser(
        oid="admin-oid",
        email="admin@test.com",
        name="Admin",
        roles=[get_settings().portal_admin_role, "Portal.User"],
    )


async def _mock_session():
    yield AsyncMock()


@pytest.fixture(autouse=True)
def _override_deps():
    app.dependency_overrides[require_admin] = _mock_admin
    app.dependency_overrides[get_session] = _mock_session
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_export_content_type():
    """CSV export returns text/csv with UTF-8 charset."""
    with patch("app.api.v1.endpoints.admin.query_audit_log", new_callable=AsyncMock, return_value=([], 0)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/audit/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "charset=utf-8" in response.headers["content-type"]


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_export_content_disposition():
    """CSV export has attachment Content-Disposition header."""
    with patch("app.api.v1.endpoints.admin.query_audit_log", new_callable=AsyncMock, return_value=([], 0)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/audit/export")
    assert "attachment" in response.headers.get("content-disposition", "")
    assert "audit_log.csv" in response.headers.get("content-disposition", "")


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_export_header_row():
    """CSV export contains expected column headers."""
    with patch("app.api.v1.endpoints.admin.query_audit_log", new_callable=AsyncMock, return_value=([], 0)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/audit/export")
    lines = response.text.strip().split("\n")
    assert len(lines) >= 1
    header = lines[0]
    for col in ["created_at", "actor_email", "action", "target_id", "details"]:
        assert col in header


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_export_sanitizes_cells():
    """CSV cells starting with formula characters are prefixed with single quote."""
    fake_entry = MagicMock()
    fake_entry.id = "entry-1"
    fake_entry.created_at = MagicMock()
    fake_entry.created_at.isoformat.return_value = "2026-01-01T00:00:00"
    fake_entry.actor_email = "=cmd|'/C calc'!A0"
    fake_entry.action = "test_action"
    fake_entry.target_type = "user"
    fake_entry.target_id = "+dangerous"
    fake_entry.details = "normal detail"

    with patch("app.api.v1.endpoints.admin.query_audit_log", new_callable=AsyncMock, return_value=([fake_entry], 1)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/audit/export")
    lines = response.text.strip().split("\n")
    assert len(lines) == 2  # header + 1 data row
    data_row = lines[1]
    # Formula-prefix characters (=, +, -, @, \t, \r) should be escaped
    assert "'=cmd" in data_row or "\"'=cmd" in data_row
    assert "'+dangerous" in data_row or "\"'+dangerous" in data_row


# ---------------------------------------------------------------------------
# Unit tests for _sanitize_csv_cell (CWE-1236 injection characters)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_sanitize_all_injection_characters():
    """All formula-triggering characters (=, +, -, @, \\t, \\r) are prefixed."""
    injection_chars = [
        ("=cmd|'/C calc'!A0", "'=cmd"),
        ("+1+1", "'+1+1"),
        ("-1-1", "'-1-1"),
        ("@SUM(A1:A2)", "'@SUM"),
        ("\tcmd", "'\tcmd"),
        ("\rcmd", "'\rcmd"),
    ]
    for payload, expected_prefix in injection_chars:
        fake_entry = MagicMock()
        fake_entry.id = "entry-inj"
        fake_entry.created_at = MagicMock()
        fake_entry.created_at.isoformat.return_value = "2026-01-01T00:00:00"
        fake_entry.actor_email = payload
        fake_entry.action = "test"
        fake_entry.target_type = "user"
        fake_entry.target_id = "id-1"
        fake_entry.details = None

        with patch(
            "app.api.v1.endpoints.admin.query_audit_log",
            new_callable=AsyncMock,
            return_value=([fake_entry], 1),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/admin/audit/export")
        data_row = response.text.strip().split("\n")[1]
        assert expected_prefix in data_row, f"Failed to sanitize: {payload!r}"


@pytest.mark.asyncio(loop_scope="function")
async def test_csv_sanitize_normal_cells_unchanged():
    """Normal cells (not starting with injection chars) pass through unchanged."""
    fake_entry = MagicMock()
    fake_entry.id = "entry-safe"
    fake_entry.created_at = MagicMock()
    fake_entry.created_at.isoformat.return_value = "2026-02-01T12:00:00"
    fake_entry.actor_email = "alice@example.com"
    fake_entry.action = "user_provisioned"
    fake_entry.target_type = "user"
    fake_entry.target_id = "user-123"
    fake_entry.details = "normal details"

    with patch(
        "app.api.v1.endpoints.admin.query_audit_log",
        new_callable=AsyncMock,
        return_value=([fake_entry], 1),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/audit/export")
    data_row = response.text.strip().split("\n")[1]
    # Normal values should NOT be prefixed with quote
    assert "alice@example.com" in data_row
    assert "'alice" not in data_row
    assert "user_provisioned" in data_row
    assert "'user_provisioned" not in data_row
