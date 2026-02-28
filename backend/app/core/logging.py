"""Structured JSON logging with correlation IDs via structlog."""

from __future__ import annotations

import logging
import re
import uuid

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send


def setup_logging(*, json_output: bool = True, log_level: str = "INFO") -> None:
    """Configure structlog with JSON rendering and stdlib integration."""
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer = structlog.processors.JSONRenderer() if json_output else structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Quiet noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class CorrelationIdMiddleware:
    """Pure ASGI middleware that sets a correlation ID for every request.

    Uses raw ASGI protocol instead of BaseHTTPMiddleware to avoid
    response body materialization issues with streaming responses.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Extract or generate correlation ID from request headers
        headers = dict(scope.get("headers", []))
        raw_cid = headers.get(b"x-request-id", b"").decode()
        # Sanitize: allow only alphanumeric, hyphens, underscores; max 64 chars
        cid = re.sub(r"[^a-zA-Z0-9\-_]", "", raw_cid)[:64]
        if not cid:
            cid = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(correlation_id=cid)

        async def send_with_cid(message: Message) -> None:
            if message["type"] == "http.response.start":
                response_headers = list(message.get("headers", []))
                response_headers.append((b"x-request-id", cid.encode()))
                message["headers"] = response_headers
            await send(message)

        await self.app(scope, receive, send_with_cid)
        structlog.contextvars.unbind_contextvars("correlation_id")
