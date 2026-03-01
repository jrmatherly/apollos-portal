import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.core.teams import TeamsConfig
from app.models.provisioned_user import ProvisionedUser
from app.schemas.common import ModelInfo, ModelsResponse
from app.services.litellm_client import LiteLLMClient, get_litellm_client, get_teams_config

logger = structlog.stdlib.get_logger(__name__)

router = APIRouter()


@router.get("/models", response_model=ModelsResponse)
@limiter.limit("60/minute")
async def get_models(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
    teams_config: TeamsConfig = Depends(get_teams_config),
):
    """List available models filtered by user's team access."""
    result = await session.execute(
        select(ProvisionedUser)
        .where(ProvisionedUser.entra_oid == user.oid)
        .options(selectinload(ProvisionedUser.team_memberships))
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not provisioned")
    if not db_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deprovisioned")

    # Collect all models the user has access to via their teams
    allowed_models: set[str] = set()
    for membership in db_user.team_memberships:
        team_cfg = teams_config.get_team_by_group_id(membership.entra_group_id)
        if team_cfg:
            allowed_models.update(team_cfg.models)

    # Get model info from LiteLLM
    try:
        all_models = await litellm.list_models()
    except Exception:
        logger.exception("Failed to fetch models from LiteLLM, falling back to config")
        # Return just the model names from teams config if LiteLLM is unreachable
        return ModelsResponse(models=[ModelInfo(model_name=m) for m in sorted(allowed_models)])

    # Filter to only allowed models
    filtered = []
    for model_data in all_models:
        model_name = model_data.get("model_name", "")
        litellm_model_name = model_data.get("litellm_params", {}).get("model", "")

        if model_name in allowed_models or litellm_model_name in allowed_models:
            filtered.append(
                ModelInfo(
                    model_name=model_name,
                    litellm_model_name=litellm_model_name or None,
                    model_info=model_data.get("model_info"),
                )
            )

    return ModelsResponse(models=filtered)
