import logging
from dataclasses import dataclass, field
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)


@dataclass
class TeamConfig:
    """Configuration for a single Entra group -> LiteLLM team mapping."""

    entra_group_id: str
    team_alias: str
    models: list[str] = field(default_factory=list)
    max_budget: float = 0
    budget_duration: str = "30d"
    team_member_budget: float = 0
    litellm_role: str = "internal_user"


@dataclass
class TeamsConfig:
    """Full teams configuration loaded from teams.yaml."""

    teams: list[TeamConfig] = field(default_factory=list)
    required_groups: list[str] = field(default_factory=list)

    def get_team_by_group_id(self, group_id: str) -> TeamConfig | None:
        """Find team config by Entra group ID."""
        for team in self.teams:
            if team.entra_group_id == group_id:
                return team
        return None

    def get_qualifying_teams(self, user_group_ids: list[str]) -> list[TeamConfig]:
        """Return team configs for groups the user belongs to."""
        team_group_ids = {t.entra_group_id for t in self.teams}
        matching = [gid for gid in user_group_ids if gid in team_group_ids]
        return [self.get_team_by_group_id(gid) for gid in matching if self.get_team_by_group_id(gid)]

    def is_user_authorized(self, user_group_ids: list[str]) -> bool:
        """Check if user is in at least one required group (gate check).

        If required_groups is empty, membership in any team group qualifies.
        """
        if self.required_groups:
            return any(gid in self.required_groups for gid in user_group_ids)
        # No gate groups configured — any team group qualifies
        return bool(self.get_qualifying_teams(user_group_ids))


def load_teams_config(config_path: str) -> TeamsConfig:
    """Load and parse teams.yaml configuration."""
    path = Path(config_path)
    if not path.exists():
        logger.warning("Teams config not found at %s, using empty config", config_path)
        return TeamsConfig()

    with open(path) as f:
        raw = yaml.safe_load(f)

    if not raw:
        return TeamsConfig()

    teams = []
    for entry in raw.get("teams", []):
        teams.append(
            TeamConfig(
                entra_group_id=entry["entra_group_id"],
                team_alias=entry["team_alias"],
                models=entry.get("models", []),
                max_budget=entry.get("max_budget", 0),
                budget_duration=entry.get("budget_duration", "30d"),
                team_member_budget=entry.get("team_member_budget", 0),
                litellm_role=entry.get("litellm_role", "internal_user"),
            )
        )

    required_groups = raw.get("required_groups", [])

    return TeamsConfig(teams=teams, required_groups=required_groups)
