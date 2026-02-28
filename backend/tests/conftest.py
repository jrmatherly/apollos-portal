"""Shared test fixtures for Apollos AI Portal backend tests."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from app.core.auth import CurrentUser


@pytest.fixture
def mock_user() -> CurrentUser:
    """A standard test user."""
    return CurrentUser(
        oid="test-oid-123",
        email="alice@example.com",
        name="Alice Test",
        roles=["Portal.User"],
    )


@pytest.fixture
def mock_admin_user() -> CurrentUser:
    """A test user with admin role."""
    return CurrentUser(
        oid="admin-oid-456",
        email="admin@example.com",
        name="Admin User",
        roles=["Portal.User", "Portal.Admin"],
    )


@dataclass
class FakeProvisionedKey:
    """Lightweight stand-in for ProvisionedKey ORM model."""

    id: str = ""
    user_id: str = ""
    litellm_key_id: str | None = None
    litellm_key_alias: str = "test-key"
    team_id: str = "team-1"
    team_alias: str = "Test Team"
    status: str = "active"
    portal_expires_at: datetime = field(default_factory=lambda: datetime.now(UTC) + timedelta(days=30))
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    revoked_at: datetime | None = None
    last_spend: float | None = None
    rotated_from_id: str | None = None

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())


@dataclass
class FakeProvisionedUser:
    """Lightweight stand-in for ProvisionedUser ORM model."""

    id: str = ""
    entra_oid: str = "test-oid-123"
    email: str = "alice@example.com"
    display_name: str = "Alice Test"
    litellm_user_id: str | None = "litellm-user-1"
    is_active: bool = True
    default_key_duration_days: int = 90
    notify_14d: bool = True
    notify_7d: bool = True
    notify_3d: bool = True
    notify_1d: bool = True
    deprovisioned_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    keys: list = field(default_factory=list)
    team_memberships: list = field(default_factory=list)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())


@dataclass
class FakeTeamMembership:
    """Lightweight stand-in for UserTeamMembership ORM model."""

    id: str = ""
    user_id: str = ""
    team_id: str = "team-1"
    team_alias: str = "Test Team"
    entra_group_id: str = "team-1"
    litellm_role: str = "user"

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())


@pytest.fixture
def mock_litellm_client() -> AsyncMock:
    """Mock LiteLLMClient with default return values."""
    client = AsyncMock()
    client.get_team.return_value = None
    client.create_team.return_value = {"team_id": "team-1"}
    client.get_user.return_value = None
    client.create_user.return_value = {"user_id": "litellm-user-1"}
    client.add_team_member.return_value = {"team_id": "team-1"}
    client.generate_key.return_value = {
        "key": "sk-test-123456",
        "token": "tok-test-123",
        "key_name": "test-key",
    }
    client.block_key.return_value = {"blocked": True}
    client.list_models.return_value = []
    client.get_spend_logs.return_value = []
    client.list_teams.return_value = []
    return client
