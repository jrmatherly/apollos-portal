import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.core.teams import TeamsConfig
from app.models.provisioned_user import ProvisionedUser
from app.schemas.common import TeamsResponse, TeamSummary
from app.services.litellm_client import LiteLLMClient, get_litellm_client, get_teams_config

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/teams", response_model=TeamsResponse)
async def get_teams(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
    teams_config: TeamsConfig = Depends(get_teams_config),
):
    """List the current user's team memberships with spend data."""
    result = await session.execute(
        select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not provisioned")

    summaries = []
    for membership in db_user.team_memberships:
        # Get team config for models and budget info
        team_cfg = teams_config.get_team_by_group_id(membership.entra_group_id)

        # Try to get spend data from LiteLLM
        spend = None
        member_count = None
        try:
            team_info = await litellm.get_team(membership.team_id)
            if team_info:
                spend = team_info.get("spend")
                members = team_info.get("members_with_roles") or team_info.get("members") or []
                member_count = len(members)
        except Exception:
            logger.exception("Failed to fetch team info from LiteLLM for team %s", membership.team_id)

        summaries.append(
            TeamSummary(
                team_id=membership.team_id,
                team_alias=membership.team_alias,
                models=team_cfg.models if team_cfg else [],
                max_budget=team_cfg.max_budget if team_cfg else 0,
                budget_duration=team_cfg.budget_duration if team_cfg else "30d",
                spend=spend,
                member_count=member_count,
            )
        )

    return TeamsResponse(teams=summaries)
