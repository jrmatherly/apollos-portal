"""Integration tests for API endpoints using httpx ASGITransport (I4).

Tests the HTTP layer: status codes, error-to-HTTP translation, and response shapes.
Service logic is tested separately in dedicated service test files.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from app.config import get_settings
from app.core.auth import CurrentUser, get_current_user, require_admin
from app.core.database import get_session
from app.core.teams import TeamsConfig
from app.main import app
from app.schemas.keys import KeyListResponse
from app.schemas.provision import ProvisionResponse, ProvisionStatusResponse

# Re-export dependency functions so patches target the endpoint module imports
from app.services.litellm_client import get_graph_client, get_litellm_client, get_teams_config
from httpx import ASGITransport, AsyncClient

from tests.conftest import FakeProvisionedKey, FakeProvisionedUser, FakeTeamMembership

# --- Helpers ---


def _mock_user() -> CurrentUser:
    return CurrentUser(
        oid="test-oid-123",
        email="alice@example.com",
        name="Alice Test",
        roles=["Portal.User"],
    )


def _mock_admin() -> CurrentUser:
    return CurrentUser(
        oid="admin-oid-456",
        email="admin@example.com",
        name="Admin User",
        roles=[get_settings().portal_admin_role, "Portal.User"],
    )


async def _empty_session():
    yield AsyncMock()


def _session_with_user(db_user):
    """Create an async generator override that yields a session returning db_user."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = db_user
    session = AsyncMock()
    session.execute = AsyncMock(return_value=mock_result)
    session.commit = AsyncMock()

    async def _gen():
        yield session

    return _gen


# ==================================================================
# Auth Security Boundary Tests
# ==================================================================


class TestAuthBoundary:
    """Auth security boundary tests — no dependency overrides.

    These tests hit endpoints WITHOUT overriding get_current_user or require_admin,
    verifying that FastAPI's HTTPBearer scheme rejects unauthenticated requests.
    """

    @pytest.fixture(autouse=True)
    def _setup(self):
        # Intentionally NO auth dependency overrides — testing real auth rejection
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_user_endpoint_requires_bearer_token(self):
        """GET /me without Authorization header returns 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/me")
        assert response.status_code == 401

    @pytest.mark.asyncio(loop_scope="function")
    async def test_keys_endpoint_requires_bearer_token(self):
        """GET /keys without Authorization header returns 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/keys")
        assert response.status_code == 401

    @pytest.mark.asyncio(loop_scope="function")
    async def test_admin_endpoint_requires_bearer_token(self):
        """GET /admin/users without Authorization header returns 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/users")
        assert response.status_code == 401


# ==================================================================
# User Endpoint Tests
# ==================================================================


class TestMeEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[get_current_user] = _mock_user
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_returns_user_info(self):
        """GET /me returns the authenticated user's identity."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/me")

        assert response.status_code == 200
        body = response.json()
        assert body["oid"] == "test-oid-123"
        assert body["email"] == "alice@example.com"
        assert body["name"] == "Alice Test"
        assert body["is_admin"] is False


class TestStatusEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[get_current_user] = _mock_user
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unprovisioned(self):
        """GET /status returns is_provisioned=false for new user."""
        mock_resp = ProvisionStatusResponse(is_provisioned=False)
        with patch(
            "app.api.v1.endpoints.provision.get_provision_status",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/status")

        assert response.status_code == 200
        assert response.json()["is_provisioned"] is False

    @pytest.mark.asyncio(loop_scope="function")
    async def test_provisioned(self):
        """GET /status returns full response for provisioned user."""
        mock_resp = ProvisionStatusResponse(
            is_provisioned=True,
            user={
                "user_id": str(uuid4()),
                "email": "alice@example.com",
                "display_name": "Alice Test",
                "litellm_user_id": "litellm-1",
                "is_active": True,
                "created_at": "2026-01-01T00:00:00",
            },
            teams=[],
            keys=[],
        )
        with patch(
            "app.api.v1.endpoints.provision.get_provision_status",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/status")

        assert response.status_code == 200
        body = response.json()
        assert body["is_provisioned"] is True
        assert body["user"]["email"] == "alice@example.com"


class TestProvisionEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[get_current_user] = _mock_user
        app.dependency_overrides[get_session] = _empty_session
        app.dependency_overrides[get_litellm_client] = lambda: AsyncMock()
        app.dependency_overrides[get_graph_client] = lambda: AsyncMock()
        app.dependency_overrides[get_teams_config] = lambda: TeamsConfig()
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_success(self):
        """POST /provision returns 200 with provision response."""
        mock_resp = ProvisionResponse(
            user_id=uuid4(),
            litellm_user_id="litellm-user-1",
            teams_provisioned=[],
            keys_generated=[],
        )
        with patch(
            "app.api.v1.endpoints.provision.provision_user",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/provision")

        assert response.status_code == 200
        assert response.json()["litellm_user_id"] == "litellm-user-1"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_permission_denied(self):
        """POST /provision returns 403 when PermissionError raised."""
        with patch(
            "app.api.v1.endpoints.provision.provision_user",
            new_callable=AsyncMock,
            side_effect=PermissionError("User is not in any authorized security group"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/provision")

        assert response.status_code == 403
        assert "not in any authorized" in response.json()["detail"]


class TestKeysEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[get_current_user] = _mock_user
        app.dependency_overrides[get_session] = _empty_session
        app.dependency_overrides[get_litellm_client] = lambda: AsyncMock()
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_keys_success(self):
        """GET /keys returns 200 with key lists."""
        mock_resp = KeyListResponse(active=[], revoked=[])
        with patch(
            "app.api.v1.endpoints.keys.list_user_keys",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/keys")

        assert response.status_code == 200
        body = response.json()
        assert "active" in body
        assert "revoked" in body

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_keys_user_not_found(self):
        """GET /keys returns 404 when LookupError raised."""
        with patch(
            "app.api.v1.endpoints.keys.list_user_keys",
            new_callable=AsyncMock,
            side_effect=LookupError("User not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/keys")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_rotate_key_not_found(self):
        """POST /keys/{id}/rotate returns 404 when key not found."""
        with patch(
            "app.api.v1.endpoints.keys.rotate_key",
            new_callable=AsyncMock,
            side_effect=LookupError("Key not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/keys/some-key-id/rotate")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_rotate_key_bad_status(self):
        """POST /keys/{id}/rotate returns 400 when key is revoked."""
        with patch(
            "app.api.v1.endpoints.keys.rotate_key",
            new_callable=AsyncMock,
            side_effect=ValueError("Key is revoked"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/keys/some-key-id/rotate")

        assert response.status_code == 400

    @pytest.mark.asyncio(loop_scope="function")
    async def test_revoke_key_not_found(self):
        """POST /keys/{id}/revoke returns 404 when key not found."""
        with patch(
            "app.api.v1.endpoints.keys.revoke_key",
            new_callable=AsyncMock,
            side_effect=LookupError("Key not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/keys/some-key-id/revoke")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_revoke_key_already_revoked(self):
        """POST /keys/{id}/revoke returns 400 when already revoked."""
        with patch(
            "app.api.v1.endpoints.keys.revoke_key",
            new_callable=AsyncMock,
            side_effect=ValueError("Key already revoked"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/keys/some-key-id/revoke")

        assert response.status_code == 400


# ==================================================================
# Admin Endpoint Tests
# ==================================================================


class TestAdminUsersEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[require_admin] = _mock_admin
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_users_success(self):
        """GET /admin/users returns 200 with paginated user list."""
        fake_user = FakeProvisionedUser(
            keys=[FakeProvisionedKey(status="active")],
            team_memberships=[FakeTeamMembership()],
        )
        with patch(
            "app.api.v1.endpoints.admin.list_users",
            new_callable=AsyncMock,
            return_value=([fake_user], 1),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/admin/users")

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["page"] == 1
        assert len(body["users"]) == 1
        assert body["users"][0]["active_keys_count"] == 1
        assert body["users"][0]["teams_count"] == 1

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_user_detail_success(self):
        """GET /admin/users/{id} returns 200 with full user detail."""
        key = FakeProvisionedKey(status="active", litellm_key_alias="alice-key")
        membership = FakeTeamMembership(team_alias="Alpha Team")
        fake_user = FakeProvisionedUser(keys=[key], team_memberships=[membership])

        with patch(
            "app.api.v1.endpoints.admin.get_user_detail",
            new_callable=AsyncMock,
            return_value=fake_user,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get(f"/api/v1/admin/users/{fake_user.id}")

        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "alice@example.com"
        assert len(body["keys"]) == 1
        assert len(body["teams"]) == 1

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_user_detail_not_found(self):
        """GET /admin/users/{id} returns 404 when user not found."""
        with patch(
            "app.api.v1.endpoints.admin.get_user_detail",
            new_callable=AsyncMock,
            return_value=None,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/admin/users/nonexistent-id")

        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"


class TestAdminActionsEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[require_admin] = _mock_admin
        app.dependency_overrides[get_current_user] = _mock_admin
        app.dependency_overrides[get_session] = _empty_session
        app.dependency_overrides[get_litellm_client] = lambda: AsyncMock()
        yield
        app.dependency_overrides.clear()

    # --- Deprovision ---

    @pytest.mark.asyncio(loop_scope="function")
    async def test_deprovision_success(self):
        """POST /admin/users/{id}/deprovision returns success."""
        with patch(
            "app.api.v1.endpoints.admin.admin_deprovision_user",
            new_callable=AsyncMock,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/test-id/deprovision")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "User deprovisioned"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_deprovision_not_found(self):
        """POST /admin/users/{id}/deprovision returns 404 on LookupError."""
        with patch(
            "app.api.v1.endpoints.admin.admin_deprovision_user",
            new_callable=AsyncMock,
            side_effect=LookupError("User not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/missing-id/deprovision")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_deprovision_already_inactive(self):
        """POST /admin/users/{id}/deprovision returns 400 when already deprovisioned."""
        with patch(
            "app.api.v1.endpoints.admin.admin_deprovision_user",
            new_callable=AsyncMock,
            side_effect=ValueError("User already deprovisioned"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/test-id/deprovision")

        assert response.status_code == 400

    # --- Reprovision ---

    @pytest.mark.asyncio(loop_scope="function")
    async def test_reprovision_success(self):
        """POST /admin/users/{id}/reprovision returns success."""
        with patch(
            "app.api.v1.endpoints.admin.admin_reprovision_user",
            new_callable=AsyncMock,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/test-id/reprovision")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "User reprovisioned"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_reprovision_not_found(self):
        """POST /admin/users/{id}/reprovision returns 404 on LookupError."""
        with patch(
            "app.api.v1.endpoints.admin.admin_reprovision_user",
            new_callable=AsyncMock,
            side_effect=LookupError("User not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/missing-id/reprovision")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_reprovision_already_active(self):
        """POST /admin/users/{id}/reprovision returns 400 when already active."""
        with patch(
            "app.api.v1.endpoints.admin.admin_reprovision_user",
            new_callable=AsyncMock,
            side_effect=ValueError("User is already active"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/users/test-id/reprovision")

        assert response.status_code == 400

    # --- Admin key revoke ---

    @pytest.mark.asyncio(loop_scope="function")
    async def test_admin_revoke_key_success(self):
        """POST /admin/keys/{id}/revoke returns success."""
        with patch(
            "app.api.v1.endpoints.admin.admin_revoke_key",
            new_callable=AsyncMock,
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/keys/test-key-id/revoke")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["message"] == "Key revoked"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_admin_revoke_key_not_found(self):
        """POST /admin/keys/{id}/revoke returns 404 on LookupError."""
        with patch(
            "app.api.v1.endpoints.admin.admin_revoke_key",
            new_callable=AsyncMock,
            side_effect=LookupError("Key not found"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/keys/missing-id/revoke")

        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_admin_revoke_key_already_revoked(self):
        """POST /admin/keys/{id}/revoke returns 400 when already revoked."""
        with patch(
            "app.api.v1.endpoints.admin.admin_revoke_key",
            new_callable=AsyncMock,
            side_effect=ValueError("Key already revoked"),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post("/api/v1/admin/keys/test-key-id/revoke")

        assert response.status_code == 400


class TestAdminKeysListEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[require_admin] = _mock_admin
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_keys_success(self):
        """GET /admin/keys returns 200 with paginated key list."""
        fake_user = FakeProvisionedUser()
        fake_key = FakeProvisionedKey(status="active")
        fake_key.user = fake_user  # admin endpoint accesses k.user.email
        fake_key.user_id = fake_user.id

        with patch(
            "app.api.v1.endpoints.admin.list_all_keys",
            new_callable=AsyncMock,
            return_value=([fake_key], 1),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/admin/keys")

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert len(body["keys"]) == 1
        assert "user_email" in body["keys"][0]


class TestAdminAuditEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[require_admin] = _mock_admin
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_audit_log_success(self):
        """GET /admin/audit returns 200 with paginated audit entries."""
        fake_entry = MagicMock()
        fake_entry.id = str(uuid4())
        fake_entry.actor_email = "alice@example.com"
        fake_entry.action = "user.provisioned"
        fake_entry.target_type = "user"
        fake_entry.target_id = "user-123"
        fake_entry.details = None
        fake_entry.created_at = MagicMock()
        fake_entry.created_at.isoformat.return_value = "2026-01-01T00:00:00"

        with patch(
            "app.api.v1.endpoints.admin.query_audit_log",
            new_callable=AsyncMock,
            return_value=([fake_entry], 1),
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/api/v1/admin/audit")

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert len(body["entries"]) == 1
        assert body["entries"][0]["action"] == "user.provisioned"


class TestAdminHealthEndpoint:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[require_admin] = _mock_admin
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_scheduler(self):
        """GET /admin/health returns 200 with scheduler_running=false when no scheduler."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/health")

        assert response.status_code == 200
        body = response.json()
        assert body["scheduler_running"] is False
        assert body["jobs"] == []
