import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.config import get_settings
from app.core import database
from app.core.database import init_db
from app.core.graph import GraphClient
from app.core.teams import load_teams_config

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Initialize database
    init_db(settings.database_url)

    # Initialize LiteLLM client (import here to avoid circular at module level)
    from app.services.litellm_client import LiteLLMClient

    app.state.litellm = LiteLLMClient(settings)

    # Load teams configuration
    app.state.teams_config = load_teams_config(settings.teams_config_path)

    # Initialize Graph API client
    app.state.graph = GraphClient(settings)

    logger.info("Apollos AI Portal started")
    yield

    # Cleanup
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().portal_base_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include API routers
app.include_router(v1_router)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/ready")
async def ready():
    # TODO: Check DB + LiteLLM connectivity
    return {"status": "healthy"}
