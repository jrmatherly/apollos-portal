"""Tests for correlation ID middleware."""

from __future__ import annotations

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio(loop_scope="function")
async def test_generates_correlation_id():
    """Requests without X-Request-ID get one auto-generated in the response."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    cid = response.headers.get("x-request-id")
    assert cid is not None
    assert len(cid) > 0


@pytest.mark.asyncio(loop_scope="function")
async def test_passes_through_provided_correlation_id():
    """Requests with X-Request-ID echo it back in the response."""
    custom_id = "my-custom-request-id-42"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("x-request-id") == custom_id
