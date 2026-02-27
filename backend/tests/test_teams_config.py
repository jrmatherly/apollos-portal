"""Tests for TeamsConfig data model and authorization logic."""

from __future__ import annotations

import pytest
from app.core.teams import TeamConfig, TeamsConfig


@pytest.fixture
def teams_config() -> TeamsConfig:
    return TeamsConfig(
        teams=[
            TeamConfig(
                entra_group_id="group-alpha",
                team_alias="Alpha Team",
                models=["gpt-4"],
                max_budget=500.0,
            ),
            TeamConfig(
                entra_group_id="group-beta",
                team_alias="Beta Team",
                models=["claude-3"],
                max_budget=200.0,
            ),
        ],
        required_groups=["group-gate"],
    )


@pytest.fixture
def teams_config_no_gate() -> TeamsConfig:
    """Config without required_groups — any team group qualifies."""
    return TeamsConfig(
        teams=[
            TeamConfig(entra_group_id="group-alpha", team_alias="Alpha Team"),
        ],
    )


class TestGetTeamByGroupId:
    def test_found(self, teams_config: TeamsConfig):
        team = teams_config.get_team_by_group_id("group-alpha")
        assert team is not None
        assert team.team_alias == "Alpha Team"

    def test_not_found(self, teams_config: TeamsConfig):
        assert teams_config.get_team_by_group_id("nonexistent") is None


class TestGetQualifyingTeams:
    def test_single_match(self, teams_config: TeamsConfig):
        result = teams_config.get_qualifying_teams(["group-alpha", "group-other"])
        assert len(result) == 1
        assert result[0].team_alias == "Alpha Team"

    def test_multiple_matches(self, teams_config: TeamsConfig):
        result = teams_config.get_qualifying_teams(["group-alpha", "group-beta"])
        assert len(result) == 2

    def test_no_matches(self, teams_config: TeamsConfig):
        result = teams_config.get_qualifying_teams(["group-other"])
        assert result == []


class TestIsUserAuthorized:
    def test_authorized_with_gate_group(self, teams_config: TeamsConfig):
        """User is in the required gate group."""
        assert teams_config.is_user_authorized(["group-gate", "group-alpha"]) is True

    def test_unauthorized_missing_gate(self, teams_config: TeamsConfig):
        """User is in a team group but NOT the required gate group."""
        assert teams_config.is_user_authorized(["group-alpha"]) is False

    def test_no_gate_any_team_qualifies(self, teams_config_no_gate: TeamsConfig):
        """Without required_groups, membership in any team group qualifies."""
        assert teams_config_no_gate.is_user_authorized(["group-alpha"]) is True

    def test_no_gate_no_team_fails(self, teams_config_no_gate: TeamsConfig):
        """Without required_groups, user in no team group is unauthorized."""
        assert teams_config_no_gate.is_user_authorized(["unrelated"]) is False
