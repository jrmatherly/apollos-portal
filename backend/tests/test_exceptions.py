"""Tests for global exception handlers and error response shape."""

from __future__ import annotations

import pytest
from app.main import app
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
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
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
