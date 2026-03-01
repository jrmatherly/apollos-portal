from typing import Any

import httpx
import msal
import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

logger = structlog.stdlib.get_logger(__name__)

security = HTTPBearer()


def get_msal_confidential_client(settings: Settings) -> msal.ConfidentialClientApplication:
    """Create MSAL confidential client for token validation and client credentials."""
    authority = f"https://login.microsoftonline.com/{settings.azure_tenant_id}"
    return msal.ConfidentialClientApplication(
        client_id=settings.azure_client_id,
        client_credential=settings.azure_client_secret,
        authority=authority,
    )


async def _get_jwks_keys(tenant_id: str) -> dict[str, Any]:
    """Fetch OpenID Connect signing keys from Entra ID."""
    openid_config_url = f"https://login.microsoftonline.com/{tenant_id}/v2.0/.well-known/openid-configuration"
    async with httpx.AsyncClient() as client:
        config_resp = await client.get(openid_config_url)
        config_resp.raise_for_status()
        jwks_uri = config_resp.json()["jwks_uri"]

        jwks_resp = await client.get(jwks_uri)
        jwks_resp.raise_for_status()
        return jwks_resp.json()


async def _validate_token(token: str, settings: Settings) -> dict[str, Any]:
    """Validate an Entra ID access token and return its claims.

    Uses MSAL's token validation approach: decode the ID token / access token
    by verifying against Microsoft's JWKS endpoint.

    For simplicity in v1, we validate by calling Microsoft Graph /me
    with the token — if Graph accepts it, the token is valid.
    This also gives us the user profile in one call.
    """
    async with httpx.AsyncClient() as client:
        # Validate token by calling Graph API /me
        resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {token}"},
            params={"$select": "id,displayName,mail,userPrincipalName"},
        )
        if resp.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("graph_api_error", status_code=exc.response.status_code)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Identity provider temporarily unavailable",
            ) from exc
        profile = resp.json()

    return {
        "oid": profile["id"],
        "name": profile.get("displayName", ""),
        "email": profile.get("mail") or profile.get("userPrincipalName", ""),
    }


async def _get_token_claims(token: str) -> dict[str, Any]:
    """Extract claims from the token by decoding JWT payload (without full validation).

    The token has already been validated by the Graph API /me call.
    We read the 'roles' claim for admin role checks.

    Note: The v1 auth pattern validates tokens by calling Graph /me, which
    requires the token to be a Graph access token (aud = Graph app ID).
    Audience verification is implicit — Graph rejects tokens not meant for it.
    """
    import base64
    import json

    try:
        # JWT is three base64-encoded parts separated by dots
        payload = token.split(".")[1]
        # Add padding
        payload += "=" * (4 - len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        return {"roles": claims.get("roles", [])}
    except Exception:
        return {"roles": []}


class CurrentUser:
    """Represents the authenticated user extracted from the Bearer token."""

    def __init__(self, oid: str, email: str, name: str, roles: list[str]):
        self.oid = oid
        self.email = email
        self.name = name
        self.roles = roles

    @property
    def is_admin(self) -> bool:
        from app.config import get_settings

        return get_settings().portal_admin_role in self.roles


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """FastAPI dependency that validates the Bearer token and returns the current user."""
    token = credentials.credentials

    # Validate token via Graph API /me call
    claims = await _validate_token(token, settings)

    # Extract roles from JWT (token already validated by Graph /me call above)
    token_claims = await _get_token_claims(token)

    return CurrentUser(
        oid=claims["oid"],
        email=claims["email"],
        name=claims["name"],
        roles=token_claims["roles"],
    )


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """FastAPI dependency that requires the portal_admin role."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user
