# Apollos AI Self-Service Portal

## Purpose
Self-service portal for managing LiteLLM proxy access through Microsoft Entra ID authentication. Users authenticate via Entra ID, are mapped to LiteLLM teams based on security group memberships, and manage API keys, usage, and team settings.

## Implementation Status
All 6 phases (0–5) are **complete** as of Feb 28, 2026:
- **Phase 0**: Project scaffolding, DB schema, Docker Compose
- **Phase 1**: Entra ID authentication (browser PKCE + CLI device-code + backend validation)
- **Phase 2**: Provisioning engine (user/team/key lifecycle via LiteLLM admin API)
- **Phase 3**: Self-service dashboard (keys, usage, models, teams, settings)
- **Phase 4**: Key lifecycle automation (email notifications, rotation/deprovisioning/reconciliation cron jobs)
- **Phase 5**: Admin features & hardening (admin dashboard, rate limiting, structured logging, health endpoints, input validation, 90+ tests)

Remaining work: deferred TODO items (frontend UX polish, additional test coverage, minor code quality). See `.scratchpad/TODO.md`.

## Architecture
```
apollos-portal/
├── backend/          # FastAPI API server (Python 3.12, uv)
│   ├── app/
│   │   ├── api/v1/endpoints/  # auth, keys, teams, usage, models, settings, provision, admin
│   │   ├── core/              # auth, database, graph, teams config, logging, exceptions, rate_limit, scheduler
│   │   ├── models/            # SQLAlchemy models (5 tables + key_notifications)
│   │   ├── services/          # litellm_client, provisioning, key/rotation/notification/deprovisioning/reconciliation/email/admin services, audit
│   │   └── templates/email/   # Jinja2 email templates (5 templates)
│   ├── alembic/       # Database migrations
│   └── tests/         # 90+ pytest tests (16 test files)
├── frontend/         # React 19 + Vite 7 SPA (Node 24, TypeScript 5.9)
├── cli/              # Click CLI with MSAL device-code auth (Python 3.12, uv)
├── docs/             # Mintlify documentation site (MDX + docs.json)
├── docker/           # Dockerfiles (backend.Dockerfile, frontend.Dockerfile, docs.Dockerfile)
├── docker-compose.yml # PostgreSQL 18 + backend + frontend
├── mise.toml         # Task runner (dev, test, lint, format, migrate, docker, qa)
├── CLAUDE.md         # Project conventions and commands
└── .scratchpad/      # Planning docs (NOT tracked in git)
```

## Tech Stack (Feb 2026)
- **Backend**: FastAPI 0.133+, SQLAlchemy 2.0.47+, Alembic, MSAL 1.35+, Microsoft Graph SDK 1.55+, Pydantic 2.12+, asyncpg, aiosmtplib, APScheduler 3.x, structlog, slowapi
- **Frontend**: React 19.2+, Vite 7.3+, TypeScript 5.9+, Tailwind CSS 4, @azure/msal-browser 5.3+, Lucide React, React Router 7, Recharts
- **CLI**: Click 8.3+, MSAL 1.35+, httpx 0.28+, Rich 14.3+
- **Database**: PostgreSQL 18 (SCRAM-SHA-256 auth, explicit PGDATA)
- **Auth**: Microsoft Entra ID (PKCE redirect for frontend, client credentials for backend, device-code for CLI)

## Branding
Project name is "Apollos AI" — never "NEXUS AI", "LiteLLM Portal", or Stitch artifacts.
