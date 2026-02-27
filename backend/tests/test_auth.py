import pytest

from app.core.teams import TeamConfig, TeamsConfig, load_teams_config


class TestTeamsConfig:
    def test_get_team_by_group_id(self):
        config = TeamsConfig(
            teams=[
                TeamConfig(entra_group_id="group-1", team_alias="Team A"),
                TeamConfig(entra_group_id="group-2", team_alias="Team B"),
            ]
        )
        team = config.get_team_by_group_id("group-1")
        assert team is not None
        assert team.team_alias == "Team A"

    def test_get_team_by_group_id_not_found(self):
        config = TeamsConfig(
            teams=[TeamConfig(entra_group_id="group-1", team_alias="Team A")]
        )
        assert config.get_team_by_group_id("nonexistent") is None

    def test_get_qualifying_teams(self):
        config = TeamsConfig(
            teams=[
                TeamConfig(entra_group_id="group-1", team_alias="Team A"),
                TeamConfig(entra_group_id="group-2", team_alias="Team B"),
                TeamConfig(entra_group_id="group-3", team_alias="Team C"),
            ]
        )
        qualifying = config.get_qualifying_teams(["group-1", "group-3", "other-group"])
        assert len(qualifying) == 2
        assert qualifying[0].team_alias == "Team A"
        assert qualifying[1].team_alias == "Team C"

    def test_is_user_authorized_with_gate_groups(self):
        config = TeamsConfig(
            teams=[TeamConfig(entra_group_id="team-group", team_alias="Team A")],
            required_groups=["gate-group"],
        )
        assert config.is_user_authorized(["gate-group", "team-group"]) is True
        assert config.is_user_authorized(["team-group"]) is False
        assert config.is_user_authorized(["other"]) is False

    def test_is_user_authorized_no_gate_groups(self):
        config = TeamsConfig(
            teams=[TeamConfig(entra_group_id="team-group", team_alias="Team A")],
            required_groups=[],
        )
        assert config.is_user_authorized(["team-group"]) is True
        assert config.is_user_authorized(["other"]) is False


class TestLoadTeamsConfig:
    def test_load_existing_config(self, tmp_path):
        config_file = tmp_path / "teams.yaml"
        config_file.write_text("""
teams:
  - entra_group_id: "abc-123"
    team_alias: "Test Team"
    models:
      - "gpt-4o"
    max_budget: 100
    budget_duration: "30d"
    team_member_budget: 10
    litellm_role: "internal_user"
required_groups:
  - "gate-123"
""")
        config = load_teams_config(str(config_file))
        assert len(config.teams) == 1
        assert config.teams[0].team_alias == "Test Team"
        assert config.teams[0].models == ["gpt-4o"]
        assert config.teams[0].max_budget == 100
        assert config.required_groups == ["gate-123"]

    def test_load_missing_config(self, tmp_path):
        config = load_teams_config(str(tmp_path / "nonexistent.yaml"))
        assert len(config.teams) == 0
        assert len(config.required_groups) == 0


class TestCurrentUser:
    def test_current_user_is_admin(self):
        from app.core.auth import CurrentUser
        user = CurrentUser(oid="oid", email="test@example.com", name="Test", roles=["portal_admin"])
        assert user.is_admin is True

    def test_current_user_not_admin(self):
        from app.core.auth import CurrentUser
        user = CurrentUser(oid="oid", email="test@example.com", name="Test", roles=[])
        assert user.is_admin is False


@pytest.mark.asyncio
async def test_me_endpoint_requires_auth():
    """Test that /api/v1/me returns 401 without a valid Bearer token."""
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # No token — HTTPBearer returns 401 (Unauthorized)
        resp = await client.get("/api/v1/me")
        assert resp.status_code == 401
