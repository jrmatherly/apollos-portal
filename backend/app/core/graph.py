import asyncio
from typing import Any, ClassVar

import msal
import structlog

from app.config import Settings

logger = structlog.stdlib.get_logger(__name__)


class GraphClient:
    """Microsoft Graph API client using client credentials (app-only) flow."""

    GRAPH_BASE = "https://graph.microsoft.com/v1.0"
    GRAPH_SCOPE: ClassVar[list[str]] = ["https://graph.microsoft.com/.default"]

    def __init__(self, settings: Settings):
        self.settings = settings
        self._msal_app = msal.ConfidentialClientApplication(
            client_id=settings.azure_client_id,
            client_credential=settings.azure_client_secret,
            authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
        )

    async def _get_app_token(self) -> str:
        """Acquire an app-only token via client credentials flow."""
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, lambda: self._msal_app.acquire_token_for_client(scopes=self.GRAPH_SCOPE)
        )
        if "access_token" not in result:
            error = result.get("error_description", "Unknown error")
            logger.error("Failed to acquire Graph API token: %s", error)
            raise RuntimeError(f"Graph API token acquisition failed: {error}")
        return result["access_token"]

    async def get_user_groups(self, user_oid: str) -> list[dict[str, Any]]:
        """Get all security group memberships for a user.

        Uses /users/{oid}/memberOf with pagination to get the complete list.
        Returns list of group dicts with 'id' and 'displayName'.
        """
        import httpx

        token = await self._get_app_token()
        groups: list[dict[str, Any]] = []

        url = f"{self.GRAPH_BASE}/users/{user_oid}/memberOf/microsoft.graph.group?$select=id,displayName&$top=999"

        async with httpx.AsyncClient() as client:
            while url:
                resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
                resp.raise_for_status()
                data = resp.json()
                groups.extend(data.get("value", []))
                url = data.get("@odata.nextLink")

        return groups

    async def get_user_profile(self, user_oid: str) -> dict[str, Any]:
        """Get user profile from Graph API."""
        import httpx

        token = await self._get_app_token()

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.GRAPH_BASE}/users/{user_oid}",
                headers={"Authorization": f"Bearer {token}"},
                params={"$select": "id,displayName,mail,userPrincipalName"},
            )
            resp.raise_for_status()
            return resp.json()
