from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.graph import GraphClient
from app.core.teams import TeamsConfig
from app.models.provisioned_key import ProvisionedKey
from app.models.provisioned_user import ProvisionedUser
from app.models.user_team_membership import UserTeamMembership
from app.schemas.provision import (
    KeyDetail,
    ProvisionResponse,
    ProvisionStatusResponse,
    TeamProvisionDetail,
    UserSummary,
)
from app.services.audit import (
    ACTION_KEY_GENERATED,
    ACTION_MEMBERSHIP_ADDED,
    ACTION_TEAM_SYNCED,
    ACTION_USER_PROVISIONED,
    log_action,
)
from app.services.litellm_client import LiteLLMClient

logger = structlog.stdlib.get_logger(__name__)


def _slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


async def get_provision_status(
    session: AsyncSession,
    user: CurrentUser,
) -> ProvisionStatusResponse:
    """Check if a user is already provisioned."""
    result = await session.execute(select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid))
    db_user = result.scalar_one_or_none()

    if not db_user:
        return ProvisionStatusResponse(is_provisioned=False)

    teams = [
        TeamProvisionDetail(
            team_id=m.team_id,
            team_alias=m.team_alias,
            role=m.litellm_role,
        )
        for m in db_user.team_memberships
    ]
    keys = [
        KeyDetail(
            key_id=k.id,
            litellm_key_id=k.litellm_key_id or "",
            key_alias=k.litellm_key_alias,
            team_id=k.team_id,
            team_alias=k.team_alias,
            portal_expires_at=k.portal_expires_at,
        )
        for k in db_user.keys
        if k.status == "active"
    ]

    return ProvisionStatusResponse(
        is_provisioned=True,
        user=UserSummary(
            user_id=db_user.id,
            email=db_user.email,
            display_name=db_user.display_name,
            litellm_user_id=db_user.litellm_user_id,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
        ),
        teams=teams,
        keys=keys,
    )


async def provision_user(
    session: AsyncSession,
    litellm: LiteLLMClient,
    graph: GraphClient,
    teams_config: TeamsConfig,
    user: CurrentUser,
    default_key_duration_days: int,
) -> ProvisionResponse:
    """Full provisioning orchestrator.

    1. Fetch user's Entra groups via Graph API
    2. Gate check via teams_config
    3. Get qualifying teams
    4. Sync each team to LiteLLM (idempotent)
    5. Create or find user in portal DB + LiteLLM
    6. Add team memberships
    7. Generate one key per team
    8. Audit log all actions
    """

    # 1. Get user's groups
    groups = await graph.get_user_groups(user.oid)
    group_ids = [g["id"] for g in groups]

    # 2. Authorization check
    if not teams_config.is_user_authorized(group_ids):
        raise PermissionError("User is not in any authorized security group")

    # 3. Qualifying teams
    qualifying = teams_config.get_qualifying_teams(group_ids)
    if not qualifying:
        raise PermissionError("User has no qualifying team memberships")

    # 4. Sync teams to LiteLLM (idempotent — check existence first)
    for team_cfg in qualifying:
        existing_team = await litellm.get_team(team_cfg.entra_group_id)
        if not existing_team:
            await litellm.create_team(
                team_id=team_cfg.entra_group_id,
                team_alias=team_cfg.team_alias,
                models=team_cfg.models,
                max_budget=team_cfg.max_budget,
                budget_duration=team_cfg.budget_duration,
                max_budget_in_team=team_cfg.team_member_budget if team_cfg.team_member_budget > 0 else None,
            )
            await log_action(
                session,
                actor_email=user.email,
                actor_entra_oid=user.oid,
                action=ACTION_TEAM_SYNCED,
                target_type="team",
                target_id=team_cfg.entra_group_id,
                details={"team_alias": team_cfg.team_alias},
            )

    # 5. Create or find user in DB + LiteLLM
    result = await session.execute(select(ProvisionedUser).where(ProvisionedUser.entra_oid == user.oid))
    db_user = result.scalar_one_or_none()

    if not db_user:
        # Check if user exists in LiteLLM
        litellm_user = await litellm.get_user(user.email)
        if not litellm_user:
            litellm_resp = await litellm.create_user(
                user_id=user.email,
                user_email=user.email,
                user_alias=user.name,
            )
            litellm_user_id = litellm_resp.get("user_id", user.email)
        else:
            litellm_user_id = litellm_user.get("user_id", user.email)

        db_user = ProvisionedUser(
            entra_oid=user.oid,
            email=user.email,
            display_name=user.name,
            litellm_user_id=litellm_user_id,
            default_key_duration_days=default_key_duration_days,
        )
        session.add(db_user)
        await session.flush()

        await log_action(
            session,
            actor_email=user.email,
            actor_entra_oid=user.oid,
            action=ACTION_USER_PROVISIONED,
            target_type="user",
            target_id=str(db_user.id),
        )

    # 6 + 7. Team memberships + key generation
    teams_provisioned: list[TeamProvisionDetail] = []
    keys_generated: list[KeyDetail] = []

    for team_cfg in qualifying:
        # Check if membership already exists
        existing = await session.execute(
            select(UserTeamMembership).where(
                UserTeamMembership.user_id == db_user.id,
                UserTeamMembership.team_id == team_cfg.entra_group_id,
            )
        )
        if not existing.scalar_one_or_none():
            await litellm.add_team_member(
                team_id=team_cfg.entra_group_id,
                user_id=db_user.litellm_user_id or user.email,
                role=team_cfg.litellm_role,
            )
            membership = UserTeamMembership(
                user_id=db_user.id,
                team_id=team_cfg.entra_group_id,
                team_alias=team_cfg.team_alias,
                entra_group_id=team_cfg.entra_group_id,
                litellm_role=team_cfg.litellm_role,
            )
            session.add(membership)

            await log_action(
                session,
                actor_email=user.email,
                actor_entra_oid=user.oid,
                action=ACTION_MEMBERSHIP_ADDED,
                target_type="membership",
                target_id=f"{db_user.id}:{team_cfg.entra_group_id}",
            )

        teams_provisioned.append(
            TeamProvisionDetail(
                team_id=team_cfg.entra_group_id,
                team_alias=team_cfg.team_alias,
                role=team_cfg.litellm_role,
            )
        )

        # Check if active key already exists for this team
        existing_key = await session.execute(
            select(ProvisionedKey).where(
                ProvisionedKey.user_id == db_user.id,
                ProvisionedKey.team_id == team_cfg.entra_group_id,
                ProvisionedKey.status == "active",
            )
        )
        if existing_key.scalar_one_or_none():
            continue

        # Generate key
        slug = _slugify(team_cfg.team_alias)
        email_prefix = user.email.split("@")[0]
        key_alias = f"{email_prefix}-{slug}"

        expires_at = datetime.now(UTC) + timedelta(days=db_user.default_key_duration_days)

        key_resp = await litellm.generate_key(
            user_id=db_user.litellm_user_id or user.email,
            team_id=team_cfg.entra_group_id,
            models=team_cfg.models,
            key_alias=key_alias,
        )

        db_key = ProvisionedKey(
            user_id=db_user.id,
            litellm_key_id=key_resp.get("token") or key_resp.get("key_name"),
            litellm_key_alias=key_alias,
            team_id=team_cfg.entra_group_id,
            team_alias=team_cfg.team_alias,
            portal_expires_at=expires_at,
        )
        session.add(db_key)
        await session.flush()

        await log_action(
            session,
            actor_email=user.email,
            actor_entra_oid=user.oid,
            action=ACTION_KEY_GENERATED,
            target_type="key",
            target_id=str(db_key.id),
            details={"team_id": team_cfg.entra_group_id, "key_alias": key_alias},
        )

        keys_generated.append(
            KeyDetail(
                key_id=db_key.id,
                litellm_key_id=db_key.litellm_key_id or "",
                key_alias=key_alias,
                team_id=team_cfg.entra_group_id,
                team_alias=team_cfg.team_alias,
                portal_expires_at=expires_at,
                key=key_resp.get("key"),
            )
        )

    await session.commit()

    return ProvisionResponse(
        user_id=db_user.id,
        litellm_user_id=db_user.litellm_user_id or "",
        teams_provisioned=teams_provisioned,
        keys_generated=keys_generated,
    )
