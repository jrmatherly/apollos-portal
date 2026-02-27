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

## Steps

### 1. Create the endpoint file

Create `backend/app/api/v1/endpoints/{name}.py` following the pattern of existing endpoints:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


@router.get("/{path}", response_model={ResponseModel})
async def {function_name}(request: Request, user: dict = Depends(get_current_user)):
    """Description."""
    litellm = request.app.state.litellm
    # Implementation
```

Key patterns to follow:
- `from __future__ import annotations` at top
- `Depends(get_current_user)` for auth
- Access LiteLLM client via `request.app.state.litellm`
- Access Graph client via `request.app.state.graph`
- Access teams config via `request.app.state.teams_config`
- Pydantic response models in the same file or a shared models module

### 2. Register the router

Add to `backend/app/api/v1/router.py`:

```python
from app.api.v1.endpoints import {name}
router.include_router({name}.router, tags=["{name}"])
```

### 3. Create the response model

Define Pydantic models in the endpoint file (for simple endpoints) or in `backend/app/models/` (for shared models). Use `BaseModel` from pydantic.

### 4. Create a test file

Create `backend/tests/test_{name}.py` following existing test patterns:

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_{function_name}():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/{path}")
        # Assert based on auth requirements
```

### 5. Update API docs

Add the new endpoint to the table in `docs/api-reference/introduction.mdx` and update the endpoint list in `docs/AGENTS.md`.

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
