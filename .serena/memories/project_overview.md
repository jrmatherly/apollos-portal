# Apollos AI Self-Service Portal

## Purpose
Self-service portal for managing LiteLLM proxy access through Microsoft Entra ID authentication. Users authenticate via Entra ID, are mapped to LiteLLM teams based on security group memberships, and manage API keys, usage, and team settings.

## Implementation Status
All 6 phases (0–5) are **complete** as of Feb 28, 2026. All TODO items resolved (PR #3, PR #4).

- **Phase 0**: Project scaffolding, DB schema, Docker Compose
- **Phase 1**: Entra ID authentication (browser PKCE + CLI device-code + backend validation)
- **Phase 2**: Provisioning engine (user/team/key lifecycle via LiteLLM admin API)
- **Phase 3**: Self-service dashboard (keys, usage, models, teams, settings)
- **Phase 4**: Key lifecycle automation (email notifications, rotation/deprovisioning/reconciliation cron jobs)
- **Phase 5**: Admin features & hardening (admin dashboard, rate limiting, structured logging, health endpoints, input validation)
- **TODO remediation (PR #4)**: 11 code review items, test coverage expansion (109→149 tests), frontend UX improvements
- **Codebase review (PR #5)**: Security hardening (JWT aud verification, nginx headers, non-root Docker), async fixes, `is_active` enforcement, test expansion (149→169 tests)

No remaining open items. See `.scratchpad/TODO.md` for full history.

## Architecture
```
apollos-portal/
├── backend/          # FastAPI API server (Python 3.12, uv)
│   ├── app/
│   │   ├── api/v1/endpoints/  # auth, keys, teams, usage, models, settings, provision, admin
│   │   ├── core/              # auth, database, graph, teams config, logging, exceptions, rate_limit, scheduler
│   │   ├── models/            # SQLAlchemy models (5 tables + key_notifications)
│   │   ├── services/          # 9 services (provisioning, key, admin, rotation, reconciliation, notification, email, deprovisioning, litellm_client) + audit
│   │   └── templates/email/   # Jinja2 email templates (5 templates)
│   ├── alembic/       # Database migrations
│   └── tests/         # 170 pytest tests (21 test files, ~0.6s)
├── frontend/         # React 19 + Vite 7 SPA (Node 24, TypeScript 5.9)
├── cli/              # Click CLI with MSAL device-code auth (Python 3.12, uv)
├── docs/             # Mintlify documentation site (15 MDX pages)
├── docker/           # Dockerfiles (backend.Dockerfile, frontend.Dockerfile, docs.Dockerfile)
├── docker-compose.yml # PostgreSQL 18 + backend + frontend
├── mise.toml         # Task runner (dev, test, lint, format, migrate, docker, qa)
├── CLAUDE.md         # Project conventions and commands
└── .scratchpad/      # Planning docs (NOT tracked in git)
```

## Documentation Artifacts
- `docs/llms.txt` (1.9KB) — lightweight doc page index for AI agent discovery
- `docs/llms-full.txt` (37KB) — complete docs content concatenated; read on-demand only (never auto-load)
- `docs/skill.md` — AI agent instruction file for docs contributions
- `docs/api-reference/openapi.json` — auto-generated OpenAPI spec from FastAPI
- Generated via `mise run docs:llms` and `mise run docs:openapi`

## Tech Stack (Feb 2026)
- **Backend**: FastAPI 0.133+, SQLAlchemy 2.0.47+, Alembic, MSAL 1.35+, Microsoft Graph SDK 1.55+, Pydantic 2.12+, asyncpg, aiosmtplib, APScheduler 3.x, structlog, slowapi
- **Frontend**: React 19.2+, Vite 7.3+, TypeScript 5.9+, Tailwind CSS 4, @azure/msal-browser 5.3+, Lucide React, React Router 7, Recharts
- **CLI**: Click 8.3+, MSAL 1.35+, httpx 0.28+, Rich 14.3+
- **Database**: PostgreSQL 18 (SCRAM-SHA-256 auth, explicit PGDATA)
- **Auth**: Microsoft Entra ID (PKCE redirect for frontend, client credentials for backend, device-code for CLI)

## Branding
Project name is "Apollos AI" — never "NEXUS AI", "LiteLLM Portal", or Stitch artifacts.
