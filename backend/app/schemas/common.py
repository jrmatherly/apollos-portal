from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class TeamSummary(BaseModel):
    team_id: str
    team_alias: str
    models: list[str] = []
    max_budget: float = 0
    budget_duration: str = "30d"
    spend: float | None = None
    member_count: int | None = None


class TeamsResponse(BaseModel):
    teams: list[TeamSummary]


class ModelInfo(BaseModel):
    model_name: str
    litellm_model_name: str | None = None
    model_info: dict[str, Any] | None = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


class UsageDataPoint(BaseModel):
    date: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    spend: float = 0
    requests: int = 0


class UsageSummary(BaseModel):
    total_spend: float = 0
    total_tokens: int = 0
    total_requests: int = 0


class UsageResponse(BaseModel):
    data: list[UsageDataPoint] = []
    summary: UsageSummary = UsageSummary()


class DashboardSummary(BaseModel):
    active_keys: int = 0
    total_spend: float = 0
    total_budget: float = 0
    teams_count: int = 0
    next_expiry_key_alias: str | None = None
    next_expiry_days: int | None = None
