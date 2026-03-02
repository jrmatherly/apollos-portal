from __future__ import annotations

from typing import Any

import httpx
import structlog
from fastapi import Request

from app.config import Settings

logger = structlog.stdlib.get_logger(__name__)


def _raise_with_body(resp: httpx.Response) -> None:
    """Call raise_for_status but log the response body first for debugging."""
    if resp.is_error:
        logger.error(
            "LiteLLM API error",
            status=resp.status_code,
            url=str(resp.url),
            body=resp.text[:500],
        )
    resp.raise_for_status()


class LiteLLMClient:
    """Async client for the LiteLLM Admin API.

    Uses a persistent httpx.AsyncClient for connection pooling.
    All requests are authenticated with the master key.
    """

    def __init__(self, settings: Settings):
        self._base_url = settings.litellm_base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {settings.litellm_master_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def close(self):
        await self._client.aclose()

    async def check_health(self, *, timeout: float = 5.0) -> bool:
        """Check if LiteLLM proxy is reachable and healthy."""
        resp = await self._client.get("/health", timeout=timeout)
        return resp.status_code == 200

    # --- Teams ---

    async def get_team(self, team_id: str) -> dict[str, Any] | None:
        """GET /team/info — returns team info or None if not found."""
        resp = await self._client.get("/team/info", params={"team_id": team_id})
        if resp.status_code == 404:
            return None
        _raise_with_body(resp)
        return resp.json()

    async def create_team(
        self,
        *,
        team_id: str,
        team_alias: str,
        models: list[str],
        max_budget: float,
        budget_duration: str,
        max_budget_in_team: float | None = None,
    ) -> dict[str, Any]:
        """POST /team/new — create a team with explicit team_id."""
        payload: dict[str, Any] = {
            "team_id": team_id,
            "team_alias": team_alias,
            "models": models,
            "max_budget": max_budget,
            "budget_duration": budget_duration,
        }
        if max_budget_in_team is not None:
            payload["max_budget_in_team"] = max_budget_in_team
        resp = await self._client.post("/team/new", json=payload)
        _raise_with_body(resp)
        return resp.json()

    async def list_teams(self) -> list[dict[str, Any]]:
        """GET /team/list — list all teams."""
        resp = await self._client.get("/team/list")
        _raise_with_body(resp)
        data = resp.json()
        # LiteLLM returns either a list or {"data": [...]}
        if isinstance(data, list):
            return data
        return data.get("data", data.get("teams", []))

    # --- Users ---

    async def create_user(
        self,
        *,
        user_id: str,
        user_email: str,
        user_alias: str,
    ) -> dict[str, Any]:
        """POST /user/new — create a user in LiteLLM."""
        resp = await self._client.post(
            "/user/new",
            json={
                "user_id": user_id,
                "user_email": user_email,
                "user_alias": user_alias,
                "auto_create_key": False,
            },
        )
        _raise_with_body(resp)
        return resp.json()

    async def get_user(self, user_id: str) -> dict[str, Any] | None:
        """GET /user/info — returns user info or None if not found."""
        resp = await self._client.get("/user/info", params={"user_id": user_id})
        if resp.status_code == 404:
            return None
        _raise_with_body(resp)
        return resp.json()

    # --- Team Membership ---

    async def add_team_member(
        self,
        *,
        team_id: str,
        user_id: str,
        role: str = "user",
    ) -> dict[str, Any]:
        """POST /team/member_add — add a user to a team (idempotent)."""
        resp = await self._client.post(
            "/team/member_add",
            json={
                "team_id": team_id,
                "member": {"user_id": user_id, "role": role},
            },
        )
        if resp.status_code == 400:
            body = resp.json()
            error_type = body.get("error", {}).get("type", "")
            if error_type == "team_member_already_in_team":
                logger.info("User already in team, skipping", user_id=user_id, team_id=team_id)
                return body
        _raise_with_body(resp)
        return resp.json()

    # --- Keys ---

    async def generate_key(
        self,
        *,
        user_id: str,
        team_id: str,
        models: list[str],
        key_alias: str,
        duration: str | None = None,
    ) -> dict[str, Any]:
        """POST /key/generate — create an API key with optional native expiry."""
        payload: dict[str, Any] = {
            "user_id": user_id,
            "team_id": team_id,
            "models": models,
            "key_alias": key_alias,
        }
        if duration is not None:
            payload["duration"] = duration
        resp = await self._client.post("/key/generate", json=payload)
        _raise_with_body(resp)
        return resp.json()

    async def get_key_info(self, key: str) -> dict[str, Any] | None:
        """GET /key/info — returns key info or None."""
        resp = await self._client.get("/key/info", params={"key": key})
        if resp.status_code == 404:
            return None
        _raise_with_body(resp)
        return resp.json()

    async def list_keys(self, *, user_id: str | None = None, team_id: str | None = None) -> list[dict[str, Any]]:
        """GET /key/list — list keys, optionally filtered."""
        params: dict[str, str] = {}
        if user_id:
            params["user_id"] = user_id
        if team_id:
            params["team_id"] = team_id
        resp = await self._client.get("/key/list", params=params)
        _raise_with_body(resp)
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("keys", data.get("data", []))

    async def block_key(self, key: str) -> dict[str, Any]:
        """POST /key/block — soft-disable a key (preserves audit trail)."""
        resp = await self._client.post("/key/block", json={"key": key})
        _raise_with_body(resp)
        return resp.json()

    async def delete_key(self, key: str) -> dict[str, Any]:
        """POST /key/delete — permanently delete a key."""
        resp = await self._client.post("/key/delete", json={"keys": [key]})
        _raise_with_body(resp)
        return resp.json()

    # --- Models ---

    async def list_models(self) -> list[dict[str, Any]]:
        """GET /model/info — list all available models."""
        resp = await self._client.get("/model/info")
        _raise_with_body(resp)
        data = resp.json()
        return data.get("data", [])

    # --- Spend ---

    async def get_spend_logs(
        self,
        *,
        user_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> list[dict[str, Any]]:
        """GET /spend/logs — spend data, optionally filtered by user and date range."""
        params: dict[str, str] = {}
        if user_id:
            params["user_id"] = user_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        resp = await self._client.get("/spend/logs", params=params)
        _raise_with_body(resp)
        data = resp.json()
        if isinstance(data, list):
            return data
        return data.get("data", [])


def get_litellm_client(request: Request) -> LiteLLMClient:
    """FastAPI dependency that retrieves the LiteLLM client from app state."""
    return request.app.state.litellm


def get_teams_config(request: Request):
    """FastAPI dependency that retrieves the teams config from app state."""
    from app.core.teams import TeamsConfig

    config: TeamsConfig = request.app.state.teams_config
    return config


def get_graph_client(request: Request):
    """FastAPI dependency that retrieves the Graph client from app state."""
    from app.core.graph import GraphClient

    client: GraphClient = request.app.state.graph
    return client
