# Apollos AI Self-Service Portal

## Project Structure
- `backend/` — FastAPI + SQLAlchemy + Alembic (Python 3.12, managed by uv)
- `frontend/` — Vite + React 19 + TypeScript (Node 24)
- `cli/` — Click CLI with MSAL device-code auth (Python 3.12, managed by uv)
- `docker/` — Dockerfiles (backend.Dockerfile, frontend.Dockerfile)
- `.scratchpad/` — Planning docs, NOT tracked in git

## Commands
- Backend tests: `cd backend && uv run pytest -v`
- Backend lint: `cd backend && uv run ruff check .`
- Backend lint fix: `cd backend && uv run ruff check . --fix`
- Frontend type check: `cd frontend && npx tsc --noEmit`
- Frontend dev: `cd frontend && npm run dev`
- CLI help: `cd cli && uv run apollos --help`
- All services: `docker compose up`
- DB migrations: `cd backend && uv run alembic upgrade head`
- Upgrade Python deps: `uv lock --upgrade`
- Check outdated Node deps: `npm outdated`

## Conventions
- Branding: "Apollos AI" — not "NEXUS AI", "LiteLLM Portal", or Stitch artifacts
- Backend config values must come from `app.config.Settings` (never hardcode URLs/secrets)
- SQLAlchemy models use `from __future__ import annotations` + `TYPE_CHECKING` for forward refs
- Frontend env vars use `VITE_` prefix, accessed via `import.meta.env`
- `frontend/src/vite-env.d.ts` must exist for `import.meta.env` TypeScript support
- All Python packages pinned to latest verified versions (use `uv lock --upgrade`)
- `.scratchpad/` is gitignored — never stage or commit these files
- `backend/teams.yaml` is gitignored — use `teams.yaml.example` as template

## Testing
- Backend: pytest with pytest-asyncio (strict mode), httpx ASGITransport for endpoint tests
- Frontend: `tsc --noEmit` as lint step (no test runner yet)
- Run both before committing: `cd backend && uv run pytest -v && uv run ruff check . && cd ../frontend && npx tsc --noEmit`

## Tech Stack (Feb 2026)
- FastAPI 0.133+, SQLAlchemy 2.0.47+, MSAL 1.35+, Pydantic 2.12+
- React 19.2+, Vite 7.3+, @azure/msal-browser 5.3+, TypeScript 5.9+
- PostgreSQL 18 (SCRAM-SHA-256 auth, explicit PGDATA)
- Node 24, Python 3.12

## Serena MCP
- Project name: `apollos-portal` (config: `.serena/project.yml`)
- Languages: Python + TypeScript (dual language server)
- Activate by name, not path: `activate_project("apollos-portal")` — path-based activation creates a new project with defaults
- Index symbols: `uvx --from git+https://github.com/oraios/serena serena project index`
- `$/typescriptVersion` warning during indexing is harmless — ignore it
- Memories stored in `.serena/memories/` — read on session start for project context
