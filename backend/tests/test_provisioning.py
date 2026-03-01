"""Tests for the provisioning service orchestrator (I4).

Covers get_provision_status and provision_user with mocked DB + LiteLLM client.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.core.teams import TeamConfig, TeamsConfig

from tests.conftest import FakeProvisionedKey, FakeProvisionedUser, FakeTeamMembership

# --- Helpers ---


def _make_teams_config(
    teams: list[TeamConfig] | None = None,
    required_groups: list[str] | None = None,
) -> TeamsConfig:
    if teams is None:
        teams = [
            TeamConfig(
                entra_group_id="group-1",
                team_alias="Alpha Team",
                models=["gpt-4"],
                max_budget=100,
                budget_duration="30d",
                team_member_budget=10,
                litellm_role="internal_user",
            ),
        ]
    return TeamsConfig(teams=teams, required_groups=required_groups or [])


def _mock_session_returning(result_value):
    """Mock session that always returns the same result from execute()."""
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = result_value
    session.execute = AsyncMock(return_value=mock_result)
    return session


def _mock_session_multi(*results):
    """Mock session returning different results for successive execute() calls.

    Auto-assigns UUIDs to objects on add() since flush() is mocked.
    """
    session = AsyncMock()
    mock_results = []
    for val in results:
        r = MagicMock()
        r.scalar_one_or_none.return_value = val
        mock_results.append(r)
    session.execute = AsyncMock(side_effect=mock_results)
    session.flush = AsyncMock()
    session.commit = AsyncMock()

    def _auto_id(obj):
        if hasattr(obj, "id") and obj.id is None:
            obj.id = uuid4()

    session.add = MagicMock(side_effect=_auto_id)
    return session


# --- get_provision_status ---


class TestGetProvisionStatus:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_unprovisioned_user(self, mock_user):
        """Returns is_provisioned=False when user not in DB."""
        session = _mock_session_returning(None)

        from app.services.provisioning import get_provision_status

        result = await get_provision_status(session, mock_user)

        assert result.is_provisioned is False
        assert result.user is None
        assert result.teams == []
        assert result.keys == []

    @pytest.mark.asyncio(loop_scope="function")
    async def test_provisioned_user(self, mock_user):
        """Returns full response with teams and active keys."""
        membership = FakeTeamMembership(team_id="group-1", team_alias="Alpha Team", litellm_role="internal_user")
        key = FakeProvisionedKey(
            litellm_key_id="tok-1",
            litellm_key_alias="alice-alpha",
            team_id="group-1",
            team_alias="Alpha Team",
            status="active",
        )
        db_user = FakeProvisionedUser(
            team_memberships=[membership],
            keys=[key],
        )
        session = _mock_session_returning(db_user)

        from app.services.provisioning import get_provision_status

        result = await get_provision_status(session, mock_user)

        assert result.is_provisioned is True
        assert result.user is not None
        assert result.user.email == "alice@example.com"
        assert len(result.teams) == 1
        assert result.teams[0].team_alias == "Alpha Team"
        assert len(result.keys) == 1
        assert result.keys[0].key_alias == "alice-alpha"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_filters_revoked_keys(self, mock_user):
        """Only active keys appear in the response."""
        active_key = FakeProvisionedKey(status="active", litellm_key_alias="active-key")
        revoked_key = FakeProvisionedKey(status="revoked", litellm_key_alias="revoked-key")
        db_user = FakeProvisionedUser(
            keys=[active_key, revoked_key],
            team_memberships=[],
        )
        session = _mock_session_returning(db_user)

        from app.services.provisioning import get_provision_status

        result = await get_provision_status(session, mock_user)

        assert len(result.keys) == 1
        assert result.keys[0].key_alias == "active-key"


# --- provision_user ---


class TestProvisionUser:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_happy_path_new_user(self, mock_user, mock_litellm_client):
        """Full provisioning: new user, new team, new key generated."""
        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]

        teams_config = _make_teams_config()
        # execute calls: 1) user check→None, 2) membership check→None, 3) key check→None, 4) alias collision→None
        session = _mock_session_multi(None, None, None, None)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            result = await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        assert result.litellm_user_id == "litellm-user-1"
        assert len(result.teams_provisioned) == 1
        assert result.teams_provisioned[0].team_alias == "Alpha Team"
        assert len(result.keys_generated) == 1
        assert result.keys_generated[0].key == "sk-test-123456"

        mock_litellm_client.create_team.assert_called_once()
        mock_litellm_client.create_user.assert_called_once()
        mock_litellm_client.add_team_member.assert_called_once()
        mock_litellm_client.generate_key.assert_called_once()
        session.commit.assert_called_once()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_existing_team_skips_creation(self, mock_user, mock_litellm_client):
        """When team already exists in LiteLLM, skip create_team."""
        mock_litellm_client.get_team.return_value = {"team_id": "group-1"}

        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()
        session = _mock_session_multi(None, None, None, None)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        mock_litellm_client.create_team.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_existing_user_skips_creation(self, mock_user, mock_litellm_client):
        """When user already in DB, skip LiteLLM user creation."""
        db_user = FakeProvisionedUser(litellm_user_id="existing-litellm-id")

        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()
        session = _mock_session_multi(db_user, None, None, None)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        mock_litellm_client.get_user.assert_not_called()
        mock_litellm_client.create_user.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_existing_active_key_skips_generation(self, mock_user, mock_litellm_client):
        """When active key exists for team, skip key generation."""
        existing_key = FakeProvisionedKey(team_id="group-1", status="active")

        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()
        session = _mock_session_multi(None, None, existing_key)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            result = await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        mock_litellm_client.generate_key.assert_not_called()
        assert len(result.keys_generated) == 0

    @pytest.mark.asyncio(loop_scope="function")
    async def test_existing_membership_skips_add(self, mock_user, mock_litellm_client):
        """When team membership already exists, skip add_team_member."""
        existing_membership = FakeTeamMembership(team_id="group-1")

        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()
        # user new, membership exists, key new, alias collision check
        session = _mock_session_multi(None, existing_membership, None, None)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        mock_litellm_client.add_team_member.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_authorized_groups_raises(self, mock_user, mock_litellm_client):
        """PermissionError when user has no authorized security groups."""
        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "unrelated-group"}]

        teams_config = _make_teams_config(required_groups=["required-group-1"])
        session = AsyncMock()

        from app.services.provisioning import provision_user

        with pytest.raises(PermissionError, match="not in any authorized"):
            await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_qualifying_teams_raises(self, mock_user, mock_litellm_client):
        """PermissionError when user has no qualifying team memberships."""
        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "required-group-1"}]

        teams_config = _make_teams_config(
            teams=[TeamConfig(entra_group_id="other-team-group", team_alias="Other")],
            required_groups=["required-group-1"],
        )
        session = AsyncMock()

        from app.services.provisioning import provision_user

        with pytest.raises(PermissionError, match="no qualifying team"):
            await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

    @pytest.mark.asyncio(loop_scope="function")
    async def test_existing_litellm_user_not_in_db(self, mock_user, mock_litellm_client):
        """User exists in LiteLLM but not in portal DB — reuse LiteLLM user ID."""
        mock_litellm_client.get_user.return_value = {"user_id": "existing-litellm-id"}

        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()
        session = _mock_session_multi(None, None, None, None)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            result = await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        mock_litellm_client.create_user.assert_not_called()
        assert result.litellm_user_id == "existing-litellm-id"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_alias_collision_appends_uuid_suffix(self, mock_user, mock_litellm_client):
        """When key alias already exists, a UUID suffix is appended."""
        graph = AsyncMock()
        graph.get_user_groups.return_value = [{"id": "group-1"}]
        teams_config = _make_teams_config()

        existing_key = FakeProvisionedKey(litellm_key_alias="alice-alpha-team", status="active")
        # execute calls: 1) user→None, 2) membership→None, 3) key→None, 4) alias collision→existing_key
        session = _mock_session_multi(None, None, None, existing_key)

        with patch("app.services.provisioning.log_action", new_callable=AsyncMock):
            from app.services.provisioning import provision_user

            result = await provision_user(
                session,
                mock_litellm_client,
                graph,
                teams_config,
                mock_user,
                default_key_duration_days=90,
            )

        # Key alias should have a UUID suffix (8 hex chars): alice-alpha-team-<8hex>
        alias = result.keys_generated[0].key_alias
        assert alias.startswith("alice-alpha-team-")
        suffix = alias.removeprefix("alice-alpha-team-")
        assert len(suffix) == 8


# --- slugify ---


class TestSlugify:
    def test_basic(self):
        from app.utils import slugify

        assert slugify("Alpha Team") == "alpha-team"

    def test_special_characters(self):
        from app.utils import slugify

        assert slugify("ML/AI-Research (dev)") == "ml-ai-research-dev"

    def test_strips_leading_trailing_hyphens(self):
        from app.utils import slugify

        assert slugify("--hello--") == "hello"
