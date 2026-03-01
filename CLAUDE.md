# Apollos AI Self-Service Portal

## Project Structure
- `backend/` — FastAPI + SQLAlchemy + Alembic (Python 3.12, managed by uv)
- `frontend/` — Vite + React 19 + TypeScript (Node 24)
- `cli/` — Click CLI with MSAL device-code auth (Python 3.12, managed by uv)
- `docs/` — Mintlify documentation site (MDX + docs.json)
- `docker/` — Dockerfiles (backend.Dockerfile, frontend.Dockerfile, docs.Dockerfile)
- `scripts/` — Build scripts (generate_llms.py)
- `.scratchpad/` — Planning docs, NOT tracked in git

## Commands
- Pre-commit gate: `mise run qa`
- Backend tests: `uv run --package apollos-portal-backend pytest -v` (from backend/)
- Backend lint: `uv run --package apollos-portal-backend ruff check backend/`
- Backend lint fix: `uv run --package apollos-portal-backend ruff check --fix backend/`
- Backend format check: `uv run --package apollos-portal-backend ruff format --check backend/`
- CLI lint: `uv run --package apollos-cli ruff check cli/`
- Frontend tests: `cd frontend && npx vitest run` (or `mise run test:frontend`)
- Frontend test watch: `cd frontend && npx vitest`
- Frontend coverage: `cd frontend && npx vitest run --coverage`
- Frontend CI check: `cd frontend && npx biome ci .` (format + lint combined, matches CI pipeline)
- Frontend lint: `cd frontend && npx biome check .`
- Frontend format: `cd frontend && npx biome format --write .`
- Frontend type check: `cd frontend && npx tsc --noEmit`
- Frontend dev: `cd frontend && npm run dev`
- CLI help: `cd cli && uv run apollos --help`
- Docs dev: `cd docs && mint dev` (or `mise run dev:docs`)
- Docs validate: `cd docs && mint validate && mint broken-links` (or `mise run check:docs`)
- Dev services: `docker compose -f docker-compose.dev.yml up --build` (or `mise run dev`)
- Prod services: `docker compose pull && docker compose up -d` (or `mise run docker:up`; requires `POSTGRES_PASSWORD` and `DATABASE_URL` env vars)
- DB migrations: `cd backend && uv run alembic upgrade head` (local only; Docker Compose runs migrations automatically via `migrate` service)
- Upgrade Python deps: `uv lock --upgrade`
- Check outdated Node deps: `cd frontend && npm outdated`
- Regenerate OpenAPI spec: `mise run docs:openapi` (run after any endpoint change)
- Regenerate llms.txt files: `mise run docs:llms` (run after adding/modifying docs pages)
- Read-only CI check: `mise run check` (lint + format + typecheck, no writes)
- Validate docs: `mise run check:docs` (mint validate + broken-links)

## Conventions
- Branding: "Apollos AI" — not "NEXUS AI", "LiteLLM Portal", or Stitch artifacts
- GitHub repo: `jrmatherly/apollos-portal`
- Backend config values must come from `app.config.Settings` (never hardcode URLs/secrets)
- SQLAlchemy models use `from __future__ import annotations` + `TYPE_CHECKING` for forward refs
- Frontend env vars use `VITE_` prefix, accessed via `import.meta.env`
- `frontend/src/vite-env.d.ts` must exist for `import.meta.env` TypeScript support
- React 19 does NOT bundle type definitions — `@types/react` and `@types/react-dom` are required devDependencies
- After `npm install` in frontend, always run `npx biome format --write .` — new packages can cause formatting drift across many files
- All Python packages pinned to latest verified versions (use `uv lock --upgrade`)
- `.scratchpad/` is gitignored — never stage or commit these files
- `backend/teams.yaml` is gitignored — use `teams.yaml.example` as template
- SQLAlchemy async: always use `selectinload()` for relationship access — lazy loading causes silent `MissingGreenlet` crashes
- Background/cron jobs use `async_session_factory()` directly (not FastAPI's `Depends(get_session)`) with fresh clients per run
- Deprovisioning uses `block_key` (preserves spend history); rotation uses `delete_key` (key is expired)
- Email templates live in `backend/app/templates/email/` using Jinja2 inheritance from `base.html`
- APScheduler 3.x (`AsyncIOScheduler`) — 4.x is not released on PyPI (only alpha)
- slowapi rate limiting: key function runs before endpoint body — use `RateLimitUserMiddleware` (pure ASGI) for per-user OID extraction from JWT; register handler by `RateLimitExceeded` exception class, not status code 429
- structlog logging: use `structlog.stdlib.get_logger(__name__)` at module level, after all imports (avoids ruff E402)
- structlog correlation IDs: use `structlog.contextvars.bind_contextvars(correlation_id=cid)` — never custom ContextVar
- External API error handling pattern: wrap calls (e.g. `litellm.block_key()`) in try/except, log with structlog, continue — reconciliation jobs resolve drift
- Shared utilities: `backend/app/utils.py` contains `slugify()` — imported by key_service, provisioning, and rotation_service
- Entra ID group resolution: NEVER use JWT `groups` claim (200-group overage limit silently breaks) — always use Graph API `/users/{oid}/memberOf` with client credentials
- Token validation: v1 validates by calling Graph `/me` with user's bearer token (not local JWKS) — see `backend/app/core/auth.py`
- `_get_token_claims()` in auth.py extracts `roles` from the JWT payload — v1 auth uses a Graph-scoped token so `aud` is Graph's app ID, not our client ID
- `is_active` check required on ALL user-facing endpoints that query `ProvisionedUser` — not just key_service
- `asyncio.get_running_loop()` in async functions — never `get_event_loop()` (deprecated, warns in 3.12+)
- Docker security: frontend nginx adds X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; backend runs as non-root `appuser`
- React ErrorBoundary requires class component (React 19 has no hooks equivalent)
- MSAL browser init: module-level singleton promise pattern prevents double-init in React Strict Mode
- Graph API pagination: always follow `@odata.nextLink` pages; use `$top=999` to minimize round trips — see `backend/app/core/graph.py`

## Documentation (docs/)
- Built with Mintlify — no `mint build` command exists; `mint dev` is the only serve option
- `docs/AGENTS.md` defines terminology, style, and content boundaries for AI-assisted docs work
- `docs/docs.json` controls navigation — every page listed must have a matching `.mdx` file
- Verify API endpoints and CLI commands against actual source before documenting
- OpenAPI spec wired into docs.json via tab-level `openapi` field — endpoint pages auto-generated from spec
- Mintlify `openapi` field goes on the tab object, NOT at docs.json top level — top-level causes validation errors
- `mint validate` and `mint broken-links` must run from `docs/` directory (requires `docs.json` in CWD)
- `docs/llms.txt` (1.9KB) — lightweight doc index; read to discover what docs exist
- `docs/llms-full.txt` (37KB) — full docs content; read on-demand only when you need comprehensive documentation context (never auto-load)
- `docs/skill.md` — AI agent instruction file for docs contributions
- All three are auto-generated (`mise run docs:llms`) and self-hosted via `mint dev`, not Mintlify cloud
- Docker: `docker/docs.Dockerfile` runs `mint dev` on port 3000 (mapped to 3001 in both compose files)
- Docker Compose: `docker-compose.yml` = production (GHCR images, no source mounts, required env vars); `docker-compose.dev.yml` = development (local builds, bind mounts, hot reload, hardcoded dev credentials)
- Both compose files include a `migrate` one-shot service (`restart: "no"`) that runs `alembic upgrade head` before the backend starts (uses `service_completed_successfully` dependency condition)
- Frontend Dockerfile uses 3 stages: `deps` (Node + npm ci), `builder` (+ build), runtime (nginx); dev compose targets `deps` stage
- Use `uv run --frozen` in Docker containers to prevent lockfile write errors on read-only mounts
- `TEAMS_CONFIG_PATH: backend/teams.yaml` env var needed in dev compose (bind mount places file at `/app/backend/teams.yaml` not `/app/teams.yaml`)

## Testing
- Backend: pytest with pytest-asyncio (strict mode), httpx ASGITransport for endpoint tests
- Mock `session.begin_nested()`: use `MagicMock(return_value=async_cm)` — `AsyncMock` returns a coroutine, not an async context manager
- Test fakes in `conftest.py`: `FakeProvisionedKey`, `FakeProvisionedUser`, `FakeTeamMembership` — keep fields in sync with ORM models
- Frontend: Vitest 4 + React Testing Library 16 + MSW 2 (jsdom environment)
- Frontend test utilities: `src/test/render.tsx` (renderWithProviders), `src/test/mocks/` (MSAL, auth, MSW handlers)
- Frontend mock strategy: mock `useAuth` directly for component tests (Strategy A); mock MSAL + real AuthProvider for auth-flow tests (Strategy B)
- Frontend coverage thresholds: 35% statements, 40% branches, 30% functions, 35% lines (ratchet up as coverage grows)
- Run before committing: `mise run qa` (runs all checks + tests)
- Pydantic `string_too_long` is the error type for `Field(max_length=...)` — not `max_length`
- Use `Literal[30, 60, 90, 180]` (not `ge/le` range) when business logic restricts to specific values
- Starlette 404s from unmatched routes bypass custom `HTTPException` handlers — test against real endpoints
- Admin endpoints: `Path(max_length=36)` on ID params, `Query(max_length=...)` on string filters
- Admin endpoint tests: must override both `require_admin` and `get_session` dependencies
- CSV export tests: mock target is `app.api.v1.endpoints.admin.query_audit_log` (standalone import, not module attr)
- `ruff format --check` and `ruff check` are independent — CI runs both, local hooks only run `ruff check`; run `ruff format` before pushing

## Tech Stack (Feb 2026)
- Mintlify (docs platform, CLI v4.2+)
- FastAPI 0.133+, SQLAlchemy 2.0.47+, MSAL 1.35+, Pydantic 2.12+
- React 19.2+, Vite 7.3+, @azure/msal-browser 5.3+, TypeScript 5.9+
- Biome 2.4.4 (frontend linter + formatter)
- Ruff 0.15.4+ (Python linter + formatter, workspace-level config)
- PostgreSQL 18 (SCRAM-SHA-256 auth, explicit PGDATA)
- Node 24, Python 3.12, uv workspace (root pyproject.toml)

## Claude Code Automations
- MCP servers: `cp .mcp.json.example .mcp.json` — `.mcp.json` is gitignored, `.mcp.json.example` is checked in
- Skills: `/api-doc` (sync endpoint docs), `/new-endpoint` (scaffold FastAPI endpoint), `/precheck` (QA suite), `/migration` (Alembic)
- Agents: `security-reviewer` (OWASP review), `docs-reviewer` (cross-ref docs vs code)
- Hooks auto-format Python (ruff) and TS/MDX (biome) on edit; block `.env`, `teams.yaml`, and lock files
- Editing `.claude/settings.json` with the Edit tool fails on long escaped commands — use Write instead
- Before creating PRs, verify `origin/main` is up to date (`git push origin main`) — unpushed main commits pollute the PR diff
- Squash & merge is preferred for feature branches — keeps main history clean with one commit per phase
- Cross-session memory: use `.serena/memories/` only — do not create Claude Code auto-memory directories

## Renovate
- Config: `renovate.json` — `config:best-practices` preset, weekly schedule (Mon before 4am ET)
- Runtime pins: Python 3.12, Node 24, PostgreSQL 18 — major/minor bumps disabled
- Auto-merge: patch updates for devDependencies and Python dependency-groups (7-day release age)
- Grouping: Python deps, npm deps, Docker images, and GitHub Actions each get a single grouped PR

## Serena MCP
- Project name: `apollos-portal` (config: `.serena/project.yml`)
- Languages: Python + TypeScript (dual language server)
- Activate by name, not path: `activate_project("apollos-portal")` — path-based activation creates a new project with defaults
- Index symbols: `uvx --from git+https://github.com/oraios/serena serena project index`
- `$/typescriptVersion` warning during indexing is harmless — ignore it
- Memories stored in `.serena/memories/` — read on session start for project context
