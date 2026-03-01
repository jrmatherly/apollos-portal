# Code Style and Conventions

## Python (Backend + CLI)
- **Package manager**: uv (not pip)
- **Linter**: ruff (line-length=120, target=py312, select=E,W,F,I,N,UP,B,SIM,C4,RUF,S,PT,DTZ,ASYNC)
- **Formatter**: ruff format (separate from lint — CI checks both independently)
- **Type hints**: Use throughout, `from __future__ import annotations` in model files
- **SQLAlchemy models**: Use `TYPE_CHECKING` imports for forward references to avoid ruff F821
- **Config**: All values via `app.config.Settings` (Pydantic BaseSettings), never hardcode URLs/secrets
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Imports**: Sorted by ruff (isort-compatible), stdlib → third-party → local
- **Tests**: pytest with pytest-asyncio (strict mode), httpx ASGITransport for endpoint tests
- **Test mocking**: `session.begin_nested()` uses `MagicMock(return_value=async_cm)`, not `AsyncMock`

## TypeScript (Frontend)
- **Framework**: React 19 with functional components and hooks
- **Build**: Vite 7 with @vitejs/plugin-react
- **Styling**: Tailwind CSS 4 with custom design tokens (bg-primary, text-text-primary, etc.)
- **Env vars**: Must use `VITE_` prefix, accessed via `import.meta.env`
- **Type declarations**: `frontend/src/vite-env.d.ts` must exist (Vite client types)
- **React types**: React 19 does NOT bundle `.d.ts` files — `@types/react` + `@types/react-dom` required as devDependencies
- **Auth**: MSAL browser v5, PKCE redirect flow, `useAuth()` hook from `AuthContext`
- **Routing**: React Router v7 with `ProtectedRoute` wrapper
- **Lint/Format**: Biome 2.4.4 (`npx biome check .` for lint, `npx biome format --write .` for format) + `tsc --noEmit` for type checking
- **Tests**: Vitest 4 (globals mode, jsdom), React Testing Library 16.3+, MSW 2.12+ for API mocking
- **Test utilities**: `src/test/setup.ts` (MSW lifecycle + jest-dom), `src/test/render.tsx` (QueryClient + MemoryRouter wrapper), `src/test/mocks/` (MSAL, auth, MSW handlers)
- **Test patterns**: Mock MSAL via `vi.mock("../lib/msal")` with dynamic import; mock `useAuth` for component tests (Strategy A); use MSW for API layer tests
- **Biome override**: `useArrowFunction` rule disabled for `*.test.{ts,tsx}` files

## Git
- `.scratchpad/` is gitignored — never stage or commit
- `backend/teams.yaml` is gitignored — use `teams.yaml.example` as template
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- Co-author line: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Docker
- Backend context: `.` (root), Frontend context: `./frontend`
- `.dockerignore` files in both `backend/` and `frontend/`
- PostgreSQL 18 with explicit PGDATA, SCRAM-SHA-256 auth
- Frontend Dockerfile: 3-stage build (`deps` → `builder` → runtime nginx). Dev compose targets `deps` stage for Node.js access
- Frontend runtime: nginx 1.29-alpine with security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy)
- Backend: runs as non-root `appuser` via `useradd` + `USER appuser`
- `uv run --frozen` in Docker containers — prevents lockfile writes into read-only mounts
- Migrations: dedicated `migrate` one-shot service using `service_completed_successfully` dependency condition; backend waits for migrations to complete before starting
- Production: GHCR images (`ghcr.io/jrmatherly/apollos-portal/{backend,frontend,docs}:latest`); dev: local builds with `--build` flag
- `TEAMS_CONFIG_PATH: backend/teams.yaml` env var in dev compose — maps bind-mounted path relative to WORKDIR
