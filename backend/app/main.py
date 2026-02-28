from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.core import database
from app.core.database import init_db
from app.core.exceptions import register_exception_handlers
from app.core.graph import GraphClient
from app.core.logging import CorrelationIdMiddleware, setup_logging
from app.core.rate_limit import RateLimitUserMiddleware, limiter, rate_limit_exceeded_handler
from app.core.teams import load_teams_config
from app.services.litellm_client import LiteLLMClient

setup_logging(json_output=get_settings().log_json, log_level=get_settings().log_level)
logger = structlog.stdlib.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Initialize database
    init_db(settings.database_url)

    # Initialize LiteLLM client
    app.state.litellm = LiteLLMClient(settings)

    # Load teams configuration
    app.state.teams_config = load_teams_config(settings.teams_config_path)

    # Initialize Graph API client
    app.state.graph = GraphClient(settings)

    # Initialize and start background scheduler
    from app.core.scheduler import setup_scheduler

    scheduler = setup_scheduler(settings)
    scheduler.start()
    app.state.scheduler = scheduler

    logger.info("Apollos AI Portal started")
    yield

    # Cleanup
    scheduler.shutdown(wait=False)
    await app.state.litellm.close()
    if database.engine:
        await database.engine.dispose()
    logger.info("Apollos AI Portal shutdown")


# Create app
app = FastAPI(
    title="Apollos AI Self-Service Portal",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Middleware execution order (Starlette LIFO — last added = outermost):
#   Request → RateLimitUserMiddleware → CorrelationIdMiddleware → CORSMiddleware → app
_settings = get_settings()
_cors_origins = (
    [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
    if _settings.cors_origins
    else [_settings.portal_base_url]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Correlation ID middleware (adds X-Request-ID to every request/response)
app.add_middleware(CorrelationIdMiddleware)

# Rate limiting (user OID extraction must run before slowapi evaluates the key function)
app.add_middleware(RateLimitUserMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Global exception handlers
register_exception_handlers(app)

# Include API routers
app.include_router(v1_router)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/ready")
async def ready():
    checks: dict[str, str] = {}

    # Check database connectivity
    if database.async_session_factory is None:
        checks["database"] = "unavailable"
    else:
        try:
            async with database.async_session_factory() as session:
                await session.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "unavailable"

    # Check LiteLLM connectivity
    try:
        litellm_client: LiteLLMClient = app.state.litellm
        checks["litellm"] = "ok" if await litellm_client.check_health() else "degraded"
    except Exception:
        checks["litellm"] = "unavailable"

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
    }
