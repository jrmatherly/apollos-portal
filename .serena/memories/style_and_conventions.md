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

## Git
- `.scratchpad/` is gitignored — never stage or commit
- `backend/teams.yaml` is gitignored — use `teams.yaml.example` as template
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- Co-author line: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Docker
- Backend context: `./backend`, Frontend context: `./frontend`
- `.dockerignore` files in both `backend/` and `frontend/`
- PostgreSQL 18 with explicit PGDATA, SCRAM-SHA-256 auth
- Frontend: nginx 1.28 with security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy)
- Backend: runs as non-root `appuser` via `useradd` + `USER appuser`
