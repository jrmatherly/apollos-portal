---
name: new-endpoint
description: Scaffold a new FastAPI endpoint with response model, test, and docs page
disable-model-invocation: true
---

# Scaffold a new API endpoint

Create a new FastAPI endpoint following existing project patterns.

## Arguments

The user provides:
- **Name**: the resource name (e.g., "notifications")
- **Method + path**: e.g., `GET /notifications` or `POST /notifications/mark-read`
- **Description**: what the endpoint does
- **Auth level**: user (default) or admin

## Steps

### 1. Create the endpoint file

Create `backend/app/api/v1/endpoints/{name}.py` following the pattern of existing endpoints:

```python
from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/{path}", response_model={ResponseModel})
async def {function_name}(
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Description."""
    ...
```

Key patterns to follow:
- `from __future__ import annotations` at top
- `Depends(get_current_user)` for user auth, `Depends(require_admin)` for admin endpoints
- `Depends(get_session)` for database access
- `Depends(get_litellm_client)` for LiteLLM API calls (from `app.services.litellm_client`)
- `Depends(get_graph_client)` for Microsoft Graph API (from `app.core.graph`)
- `Depends(get_teams_config)` for teams configuration (from `app.core.teams`)
- Error translation: `LookupError` → 404, `ValueError` → 400, `PermissionError` → 403

### 2. Register the router

Add to `backend/app/api/v1/router.py`:

```python
from app.api.v1.endpoints import {name}
router.include_router({name}.router, tags=["{name}"])
```

### 3. Create the response model

Define Pydantic schemas in `backend/app/schemas/{name}.py` (or add to an existing schemas file if closely related). Use `BaseModel` from pydantic with `model_config = ConfigDict(from_attributes=True)` when mapping from ORM models.

### 4. Create a test file

Create `backend/tests/test_{name}.py` following existing test patterns with dependency overrides:

```python
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_session
from app.main import app


def _mock_user():
    return CurrentUser(oid="test-oid", email="test@example.com", name="Test", roles=[])


async def _empty_session():
    yield AsyncMock()


class TestEndpointName:
    @pytest.fixture(autouse=True)
    def _setup(self):
        app.dependency_overrides[get_current_user] = _mock_user
        app.dependency_overrides[get_session] = _empty_session
        yield
        app.dependency_overrides.clear()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_success(self):
        with patch("app.api.v1.endpoints.{name}.{service_function}") as mock_svc:
            mock_svc.return_value = ...
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.get("/api/v1/{path}")
            assert resp.status_code == 200
```

### 5. Update API docs

Add the new endpoint to the table in `docs/api-reference/introduction.mdx` and update `docs/AGENTS.md`.

### 6. Run checks

After scaffolding, run:
```bash
uv run --package apollos-portal-backend ruff check --fix backend/
uv run --package apollos-portal-backend pytest -v
```

## Do not

- Do not hardcode URLs or secrets — use `app.config.Settings`
- Do not skip the auth dependency unless the endpoint is intentionally public
- Do not create a docs concept page — only update the API reference table
- Do not use `request.app.state.*` — use FastAPI `Depends()` for all injected dependencies
