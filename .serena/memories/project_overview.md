# Apollos AI Self-Service Portal

## Purpose
Self-service portal for managing LiteLLM proxy access through Microsoft Entra ID authentication. Users authenticate via Entra ID, are mapped to LiteLLM teams based on security group memberships, and manage API keys, usage, and team settings.

## Architecture
```
apollos-portal/
├── backend/          # FastAPI API server (Python 3.12, uv)
├── frontend/         # React 19 + Vite 7 SPA (Node 24, TypeScript 5.9)
├── cli/              # Click CLI with MSAL device-code auth (Python 3.12, uv)
├── docs/             # Mintlify documentation site (MDX + docs.json)
├── docker/           # Dockerfiles (backend.Dockerfile, frontend.Dockerfile, docs.Dockerfile)
├── docker-compose.yml # PostgreSQL 18 + backend + frontend
├── mise.toml         # Task runner (dev, test, lint, format, migrate, docker)
├── CLAUDE.md         # Project conventions and commands
└── .scratchpad/      # Planning docs (NOT tracked in git)
```

## Tech Stack (Feb 2026)
- **Backend**: FastAPI 0.133+, SQLAlchemy 2.0.47+, Alembic, MSAL 1.35+, Microsoft Graph SDK 1.55+, Pydantic 2.12+, asyncpg, aiosmtplib
- **Frontend**: React 19.2+, Vite 7.3+, TypeScript 5.9+, Tailwind CSS 4, @azure/msal-browser 5.3+, Lucide React, React Router 7, Recharts
- **CLI**: Click 8.3+, MSAL 1.35+, httpx 0.28+, Rich 14.3+
- **Database**: PostgreSQL 18 (SCRAM-SHA-256 auth, explicit PGDATA)
- **Auth**: Microsoft Entra ID (PKCE redirect for frontend, client credentials for backend, device-code for CLI)

## Branding
Project name is "Apollos AI" — never "NEXUS AI", "LiteLLM Portal", or Stitch artifacts.
