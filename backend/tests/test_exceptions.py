"""Tests for global exception handlers and error response shape."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from app.config import get_settings
from app.core.auth import CurrentUser, get_current_user, require_admin
from app.core.database import get_session
from app.main import app
from app.services.litellm_client import get_litellm_client
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio(loop_scope="function")
async def test_422_validation_error_shape():
    """RequestValidationError returns structured error list."""
    from app.config import get_settings
    from app.core.auth import CurrentUser, require_admin
    from app.core.database import get_session

    mock_admin = CurrentUser(
        oid="admin-oid",
        email="admin@test.com",
        name="Admin",
        roles=[get_settings().portal_admin_role, "Portal.User"],
    )

    async def _mock_session():
        yield None  # pragma: no cover — validation fires before session is used

    app.dependency_overrides[require_admin] = lambda: mock_admin
    app.dependency_overrides[get_session] = _mock_session

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/users?page=not_a_number")
        assert response.status_code == 422
        body = response.json()
        assert "detail" in body
        assert "errors" in body
        assert isinstance(body["errors"], list)
        assert len(body["errors"]) > 0
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="function")
async def test_health_response_consistent_shape():
    """Successful responses maintain expected shape."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert "status" in body
    assert body["status"] == "healthy"


@pytest.mark.asyncio(loop_scope="function")
async def test_ready_endpoint_response_shape():
    """Ready endpoint returns structured status with checks dict."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert "status" in body
    assert "checks" in body
    assert isinstance(body["checks"], dict)


# ---------------------------------------------------------------------------
# Tests that trigger ACTUAL exception handlers on real endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="function")
async def test_unauthenticated_error_shape():
    """Missing Bearer token on a protected endpoint triggers HTTPException handler."""
    app.dependency_overrides.clear()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/keys")
    assert response.status_code in (401, 403)
    body = response.json()
    assert "detail" in body


@pytest.mark.asyncio(loop_scope="function")
async def test_403_non_admin_error_shape():
    """Non-admin hitting admin endpoint returns 403 with structured response."""

    def _mock_user():
        return CurrentUser(oid="user-oid", email="user@test.com", name="User", roles=["Portal.User"])

    async def _sess():
        yield AsyncMock()

    app.dependency_overrides[get_current_user] = _mock_user
    app.dependency_overrides[get_session] = _sess

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/users")
        assert response.status_code == 403
        body = response.json()
        assert "detail" in body
        assert body["errors"] is None
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="function")
async def test_422_validation_error_on_keys_endpoint():
    """Validation error on /keys/new with invalid body triggers 422 handler."""
    _settings = get_settings()

    def _mock_user():
        return CurrentUser(
            oid="user-oid",
            email="user@test.com",
            name="User",
            roles=[_settings.portal_admin_role, "Portal.User"],
        )

    async def _sess():
        yield AsyncMock()

    app.dependency_overrides[get_current_user] = _mock_user
    app.dependency_overrides[get_session] = _sess
    app.dependency_overrides[get_litellm_client] = lambda: AsyncMock()

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # POST with missing required field triggers validation
            response = await client.post("/api/v1/keys/new", json={})
        assert response.status_code == 422
        body = response.json()
        assert "detail" in body
        assert "errors" in body
        assert isinstance(body["errors"], list)
        assert len(body["errors"]) > 0
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio(loop_scope="function")
async def test_422_validation_error_on_admin_keys_status():
    """Invalid status value on admin keys endpoint triggers 422 handler."""
    _settings = get_settings()

    def _mock_admin():
        return CurrentUser(
            oid="admin-oid",
            email="admin@test.com",
            name="Admin",
            roles=[_settings.portal_admin_role, "Portal.User"],
        )

    async def _sess():
        yield AsyncMock()

    app.dependency_overrides[require_admin] = _mock_admin
    app.dependency_overrides[get_session] = _sess

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/keys?status=invalid_status")
        assert response.status_code == 422
        body = response.json()
        assert "detail" in body
        assert "errors" in body
    finally:
        app.dependency_overrides.clear()
