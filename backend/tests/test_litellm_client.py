"""Tests for LiteLLMClient HTTP interactions using mock transport."""

from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import pytest
from app.services.litellm_client import LiteLLMClient


def _make_settings(**overrides):
    """Build a mock Settings with defaults for LiteLLM."""
    settings = MagicMock()
    settings.litellm_base_url = overrides.get("base_url", "http://litellm:4000")
    settings.litellm_master_key = overrides.get("master_key", "sk-master-key")
    return settings


def _make_client(handler) -> LiteLLMClient:
    """Create a LiteLLMClient with a mock transport."""
    settings = _make_settings()
    client = LiteLLMClient(settings)
    # Replace the internal httpx client with one using a mock transport
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://litellm:4000",
        headers={
            "Authorization": "Bearer sk-master-key",
            "Content-Type": "application/json",
        },
    )
    return client


@pytest.mark.asyncio(loop_scope="function")
async def test_get_team_found():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/team/info" in str(request.url)
        return httpx.Response(200, json={"team_id": "team-1", "team_alias": "Alpha"})

    client = _make_client(handler)
    result = await client.get_team("team-1")
    assert result is not None
    assert result["team_id"] == "team-1"
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_get_team_not_found():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    client = _make_client(handler)
    result = await client.get_team("nonexistent")
    assert result is None
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_create_team():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        return httpx.Response(200, json={"team_id": "team-new"})

    client = _make_client(handler)
    result = await client.create_team(
        team_id="team-new",
        team_alias="New Team",
        models=["gpt-4"],
        max_budget=100.0,
        budget_duration="monthly",
    )
    assert result["team_id"] == "team-new"
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_generate_key():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/key/generate" in str(request.url)
        return httpx.Response(200, json={"key": "sk-new-123", "token": "tok-new"})

    client = _make_client(handler)
    result = await client.generate_key(
        user_id="user-1",
        team_id="team-1",
        models=["gpt-4"],
        key_alias="test-key",
    )
    assert result["key"] == "sk-new-123"
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_block_key():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/key/block" in str(request.url)
        return httpx.Response(200, json={"blocked": True})

    client = _make_client(handler)
    result = await client.block_key("tok-123")
    assert result["blocked"] is True
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_list_models():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"model_name": "gpt-4"}]})

    client = _make_client(handler)
    result = await client.list_models()
    assert len(result) == 1
    assert result[0]["model_name"] == "gpt-4"
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_list_teams_list_format():
    """LiteLLM sometimes returns teams as a plain list."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[{"team_id": "t1"}, {"team_id": "t2"}])

    client = _make_client(handler)
    result = await client.list_teams()
    assert len(result) == 2
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_list_teams_dict_format():
    """LiteLLM sometimes returns teams wrapped in {"data": [...]}."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"team_id": "t1"}]})

    client = _make_client(handler)
    result = await client.list_teams()
    assert len(result) == 1
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_get_spend_logs():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=[
                {"date": "2026-01-01", "model": "gpt-4", "spend": 1.50},
            ],
        )

    client = _make_client(handler)
    result = await client.get_spend_logs(user_id="user-1", start_date="2026-01-01")
    assert len(result) == 1
    assert result[0]["spend"] == 1.50
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_get_user_found():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"user_id": "alice@example.com"})

    client = _make_client(handler)
    result = await client.get_user("alice@example.com")
    assert result is not None
    assert result["user_id"] == "alice@example.com"
    await client.close()


@pytest.mark.asyncio(loop_scope="function")
async def test_get_user_not_found():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    client = _make_client(handler)
    result = await client.get_user("missing@example.com")
    assert result is None
    await client.close()
