from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.core.graph import GraphClient
from app.core.teams import TeamsConfig
from app.schemas.provision import ProvisionResponse, ProvisionStatusResponse
from app.services.litellm_client import LiteLLMClient, get_graph_client, get_litellm_client, get_teams_config
from app.services.provisioning import get_provision_status, provision_user

router = APIRouter()


@router.get("/status", response_model=ProvisionStatusResponse)
async def check_status(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Check the current user's provisioning status."""
    return await get_provision_status(session, user)


@router.post("/provision", response_model=ProvisionResponse)
async def provision(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
    graph: GraphClient = Depends(get_graph_client),
    teams_config: TeamsConfig = Depends(get_teams_config),
):
    """Run the full provisioning flow for the current user."""
    settings = get_settings()
    try:
        return await provision_user(
            session,
            litellm,
            graph,
            teams_config,
            user,
            settings.default_key_duration_days,
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from None
