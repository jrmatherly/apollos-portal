"""Rate limiting for provisioning and key management endpoints."""

from __future__ import annotations

import base64
import json

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


def _key_func(request: Request) -> str:
    """Rate limit key: use authenticated user OID if available, else IP."""
    user = getattr(request.state, "rate_limit_user", None)
    if user:
        return user
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 response matching the global error shape."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later.", "errors": None},
        headers={"Retry-After": "60"},
    )


class RateLimitUserMiddleware:
    """ASGI middleware that extracts user OID from JWT for per-user rate limiting.

    Sets request.state.rate_limit_user before slowapi evaluates the key function.
    The token itself is validated later by the auth dependency; this only reads the
    OID claim for rate-limiting purposes.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            auth = headers.get(b"authorization", b"").decode()
            if auth.startswith("Bearer "):
                oid = self._extract_oid(auth[7:])
                if oid:
                    scope.setdefault("state", {})["rate_limit_user"] = oid
        await self.app(scope, receive, send)

    @staticmethod
    def _extract_oid(token: str) -> str | None:
        """Extract OID from JWT payload without validation."""
        try:
            payload = token.split(".")[1]
            payload += "=" * (4 - len(payload) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload))
            return claims.get("oid")
        except Exception:
            return None
