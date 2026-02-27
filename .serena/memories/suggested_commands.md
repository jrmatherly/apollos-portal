# Development Commands

## Backend (in backend/)
- `uv run pytest -v` — run tests (pytest + pytest-asyncio strict mode)
- `uv run ruff check .` — lint Python code
- `uv run ruff check . --fix` — auto-fix lint issues
- `uv run ruff format .` — format Python code
- `uv run uvicorn app.main:app --reload --port 8000` — run dev server
- `uv run alembic upgrade head` — run database migrations
- `uv run alembic revision --autogenerate -m "description"` — generate migration
- `uv sync` — install/sync dependencies
- `uv lock --upgrade` — upgrade all deps to latest

## Frontend (in frontend/)
- `npx tsc --noEmit` — TypeScript type check (lint step)
- `npm run dev` — start Vite dev server on port 3000
- `npm run build` — production build
- `npm install` — install dependencies
- `npm outdated` — check for outdated packages

## CLI (in cli/)
- `uv run apollos --help` — show CLI help
- `uv run apollos configure` — set tenant, client ID, portal URL
- `uv run apollos login` — device-code flow auth
- `uv run apollos whoami` — show current user
- `uv run apollos me` — fetch profile from backend

## Docker
- `docker compose up` — start all services (db, backend, frontend)
- `docker compose up -d db` — start just PostgreSQL
- `docker compose down -v` — stop and remove volumes
- `docker compose exec db psql -U portal -d apollos_portal` — psql shell

## mise (task runner)
- `mise run dev` — docker compose up
- `mise run test` — backend pytest
- `mise run lint` — ruff + tsc
- `mise run format` — ruff format
- `mise run migrate` — alembic upgrade head
- `mise run docker:reset` — reset Docker services and volumes

## Pre-commit Checklist
```bash
cd backend && uv run pytest -v && uv run ruff check . && cd ../frontend && npx tsc --noEmit
```
