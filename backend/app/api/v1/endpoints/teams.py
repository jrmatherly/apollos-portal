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
from app.schemas.common import TeamMember, TeamsResponse, TeamSummary
from app.services.litellm_client import LiteLLMClient, get_litellm_client, get_teams_config

logger = structlog.stdlib.get_logger(__name__)

router = APIRouter()


@router.get("/teams", response_model=TeamsResponse)
@limiter.limit("60/minute")
async def get_teams(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    litellm: LiteLLMClient = Depends(get_litellm_client),
    teams_config: TeamsConfig = Depends(get_teams_config),
):
    """List the current user's team memberships with spend data."""
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

    summaries = []
    for membership in db_user.team_memberships:
        # Get team config for models and budget info
        team_cfg = teams_config.get_team_by_group_id(membership.entra_group_id)

        # Try to get spend data from LiteLLM
        spend = None
        member_count = None
        team_members: list[TeamMember] = []
        try:
            team_info = await litellm.get_team(membership.team_id)
            if team_info:
                # LiteLLM nests team data under "team_info" key
                inner = team_info.get("team_info") or team_info
                spend = inner.get("spend")
                raw_members = inner.get("members_with_roles") or inner.get("members") or []
                for m in raw_members:
                    uid = m.get("user_id", "")
                    if uid != "default_user_id":
                        team_members.append(TeamMember(user_id=uid, role=m.get("role", "user")))
                member_count = len(team_members)
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
                members=team_members,
            )
        )

    return TeamsResponse(teams=summaries)
