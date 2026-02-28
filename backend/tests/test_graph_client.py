"""Tests for GraphClient: token acquisition, pagination, error handling."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from app.core.graph import GraphClient


def _make_settings():
    settings = MagicMock()
    settings.azure_client_id = "test-client-id"
    settings.azure_client_secret = "test-client-secret"  # noqa: S105
    settings.azure_tenant_id = "test-tenant-id"
    return settings


def _make_client():
    """Create a GraphClient with MSAL mocked to skip real HTTP calls."""
    settings = _make_settings()
    with patch("app.core.graph.msal.ConfidentialClientApplication") as mock_msal:
        mock_msal.return_value = MagicMock()
        client = GraphClient(settings)
    return client


def _mock_async_client(transport):
    """Build an async context manager that yields an httpx.AsyncClient with mock transport."""
    real_client = httpx.AsyncClient(transport=transport)
    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=real_client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


# ---------------------------------------------------------------------------
# Token acquisition
# ---------------------------------------------------------------------------


class TestGetAppToken:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_successful_token_acquisition(self):
        """Token is returned when MSAL succeeds."""
        client = _make_client()
        client._msal_app.acquire_token_for_client.return_value = {"access_token": "test-token-123"}

        token = await client._get_app_token()
        assert token == "test-token-123"  # noqa: S105

    @pytest.mark.asyncio(loop_scope="function")
    async def test_token_acquisition_failure_raises(self):
        """RuntimeError raised when MSAL fails."""
        client = _make_client()
        client._msal_app.acquire_token_for_client.return_value = {
            "error": "invalid_client",
            "error_description": "Bad credentials",
        }

        with pytest.raises(RuntimeError, match="Bad credentials"):
            await client._get_app_token()


# ---------------------------------------------------------------------------
# get_user_groups — pagination
# ---------------------------------------------------------------------------


class TestGetUserGroups:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_single_page_response(self):
        """Single page of groups returns all groups."""
        client = _make_client()

        transport = httpx.MockTransport(
            lambda request: httpx.Response(
                200,
                json={
                    "value": [
                        {"id": "group-1", "displayName": "Engineering"},
                        {"id": "group-2", "displayName": "Data Science"},
                    ]
                },
            )
        )

        with (
            patch.object(client, "_get_app_token", return_value="mock-token"),
            patch("httpx.AsyncClient", return_value=_mock_async_client(transport)),
        ):
            groups = await client.get_user_groups("user-oid-1")

        assert len(groups) == 2
        assert groups[0]["id"] == "group-1"
        assert groups[1]["id"] == "group-2"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_pagination_follows_next_link(self):
        """Multiple pages are followed via @odata.nextLink."""
        client = _make_client()
        call_count = 0

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return httpx.Response(
                    200,
                    json={
                        "value": [{"id": "group-1", "displayName": "Page 1"}],
                        "@odata.nextLink": "https://graph.microsoft.com/v1.0/next-page",
                    },
                )
            else:
                return httpx.Response(
                    200,
                    json={
                        "value": [{"id": "group-2", "displayName": "Page 2"}],
                    },
                )

        transport = httpx.MockTransport(handler)

        with (
            patch.object(client, "_get_app_token", return_value="mock-token"),
            patch("httpx.AsyncClient", return_value=_mock_async_client(transport)),
        ):
            groups = await client.get_user_groups("user-oid-1")

        assert call_count == 2
        assert len(groups) == 2
        assert groups[0]["id"] == "group-1"
        assert groups[1]["id"] == "group-2"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_empty_groups(self):
        """Empty group list returns empty."""
        client = _make_client()

        transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"value": []}))

        with (
            patch.object(client, "_get_app_token", return_value="mock-token"),
            patch("httpx.AsyncClient", return_value=_mock_async_client(transport)),
        ):
            groups = await client.get_user_groups("user-oid-1")

        assert groups == []


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestGraphClientErrors:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_graph_api_http_error_propagates(self):
        """HTTP error from Graph API raises httpx.HTTPStatusError."""
        client = _make_client()

        transport = httpx.MockTransport(lambda request: httpx.Response(500, text="Internal Server Error"))

        with (
            patch.object(client, "_get_app_token", return_value="mock-token"),
            patch("httpx.AsyncClient", return_value=_mock_async_client(transport)),
            pytest.raises(httpx.HTTPStatusError),
        ):
            await client.get_user_groups("user-oid-1")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_user_profile_success(self):
        """get_user_profile returns profile dict on success."""
        client = _make_client()

        profile_data = {
            "id": "user-oid-1",
            "displayName": "Alice Test",
            "mail": "alice@example.com",
            "userPrincipalName": "alice@example.com",
        }

        transport = httpx.MockTransport(lambda request: httpx.Response(200, json=profile_data))

        with (
            patch.object(client, "_get_app_token", return_value="mock-token"),
            patch("httpx.AsyncClient", return_value=_mock_async_client(transport)),
        ):
            profile = await client.get_user_profile("user-oid-1")

        assert profile["id"] == "user-oid-1"
        assert profile["displayName"] == "Alice Test"
