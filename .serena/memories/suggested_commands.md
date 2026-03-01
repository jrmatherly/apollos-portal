# Development Commands

## Backend (in backend/)
- `uv run pytest -v` — run tests (pytest + pytest-asyncio strict mode)
- `uv run ruff check .` — lint Python code
- `uv run ruff check . --fix` — auto-fix lint issues
- `uv run ruff format --check .` — verify formatting (CI runs this separately from lint)
- `uv run ruff format .` — format Python code
- `uv run uvicorn app.main:app --reload --port 8000` — run dev server
- `uv run alembic upgrade head` — run database migrations
- `uv run alembic revision --autogenerate -m "description"` — generate migration
- `uv sync` — install/sync dependencies
- `uv lock --upgrade` — upgrade all deps to latest

## Frontend (in frontend/)
- `npx biome ci .` — combined format + lint check (matches CI pipeline, fails on formatting drift)
- `npx biome check .` — lint TypeScript/TSX/JSX code
- `npx biome format --write .` — format TypeScript/TSX/JSX code
- `npx tsc --noEmit` — TypeScript type check
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
- `docker compose -f docker-compose.dev.yml up --build` — start all dev services (db, migrate, backend, frontend with hot reload)
- `docker compose -f docker-compose.dev.yml up -d db` — start just PostgreSQL (dev)
- `docker compose -f docker-compose.dev.yml down -v` — stop dev services and remove volumes
- `docker compose -f docker-compose.dev.yml exec db psql -U portal -d apollos_portal` — psql shell
- `docker compose pull && docker compose up -d` — start production services (pulls GHCR images, requires `POSTGRES_PASSWORD` and `DATABASE_URL` env vars)
- Migrations run automatically via the `migrate` one-shot service before backend starts (both dev and prod)

## mise (task runner)
- `mise run dev` — start all dev services with `--build` (docker-compose.dev.yml)
- `mise run test` — run all tests (backend pytest + frontend vitest)
- `mise run test:backend` — backend pytest only
- `mise run test:frontend` — frontend vitest only
- `mise run lint` — ruff (backend + CLI) + biome (frontend)
- `mise run format` — ruff format + biome format
- `mise run migrate` — alembic upgrade head (local only; Docker uses migrate service)
- `mise run check` — read-only lint + format + typecheck (CI equivalent, no writes)
- `mise run check:docs` — docs validation (mint validate + broken-links)
- `mise run qa` — full quality gate (check + test — run before committing)
- `mise run docker:reset` — reset dev Docker services and volumes (with `--build`)
- `mise run docker:dev` — start dev services detached (with `--build`)
- `mise run docker:up` — start production services (`docker compose pull && docker compose up -d`)
- `mise run docs:openapi` — regenerate OpenAPI spec from FastAPI app (run after endpoint changes; skips if sources unchanged)
- `mise run docs:llms` — regenerate llms.txt/llms-full.txt from docs (skips if sources unchanged)

## Docs (in docs/)
- `mint dev` — preview docs locally at localhost:3000
- `mint validate` — validate documentation builds
- `mint broken-links` — check for broken internal links

## Pre-commit Checklist
```bash
mise run qa
```
Or manually:
```bash
cd backend && uv run pytest -v && uv run ruff check . && uv run ruff format --check . && cd ../frontend && npx biome check . && npx tsc --noEmit
```
