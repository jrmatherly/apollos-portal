# Project Index: Apollos AI Self-Service Portal

Generated: 2026-02-28

## Project Structure

```
litellm-portal/
├── backend/           # FastAPI + SQLAlchemy + Alembic (Python 3.12)
│   ├── app/
│   │   ├── api/v1/endpoints/  # REST endpoints (8 modules)
│   │   ├── core/              # Auth, DB, logging, rate limit, scheduler
│   │   ├── models/            # SQLAlchemy ORM models (6 models)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic (9 services)
│   │   ├── templates/email/   # Jinja2 email templates
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   └── main.py            # FastAPI app factory
│   └── tests/                 # 149 tests across 18 modules
├── frontend/          # React 19 + Vite 7 + TypeScript 5.9
│   └── src/
│       ├── components/  # Shared UI (Sidebar, ConfirmDialog, NewKeyDialog)
│       ├── contexts/    # AuthContext (MSAL)
│       ├── hooks/       # React Query hooks (6 hooks)
│       ├── lib/         # API client, MSAL config, query client
│       ├── pages/       # Route pages (7 pages)
│       └── types/       # API type definitions
├── cli/               # Click CLI with MSAL device-code auth
│   └── apollos_cli/   # 3 files: main.py, auth.py, __init__.py
├── docs/              # Mintlify documentation (15 MDX pages)
├── docker/            # 3 Dockerfiles (backend, frontend, docs)
├── scripts/           # Automation (generate_llms.py)
└── .github/workflows/ # CI/CD (ci, codeql, docker, docs)
```

## Entry Points

- **Backend API**: `backend/app/main.py` — FastAPI app with LiteLLM client, Graph API, APScheduler
- **Frontend**: `frontend/src/main.tsx` → `App.tsx` — React with lazy-loaded routes, MSAL auth
- **CLI**: `cli/apollos_cli/main.py` — Click CLI, device-code auth flow
- **Tests**: `uv run --package apollos-portal-backend pytest -v`
- **Dev server**: `docker compose up` or individual `npm run dev` / `uvicorn`

## Core Modules

### API Endpoints (`backend/app/api/v1/endpoints/`)
| File | Routes | Purpose |
|------|--------|---------|
| `auth.py` | `GET /me` | User identity (OID, email, roles) |
| `provision.py` | `GET /status`, `POST /provision` | Provisioning status & orchestration |
| `keys.py` | `GET /keys`, `POST /keys/new`, `POST rotate/revoke` | API key lifecycle |
| `usage.py` | `GET /usage` | Token & cost usage data |
| `teams.py` | `GET /teams` | Team memberships |
| `models.py` | `GET /models` | Available LLM models |
| `settings.py` | `GET/PUT /settings` | User preferences |
| `admin.py` | 9 admin endpoints | User mgmt, audit, health, CSV export |

### Services (`backend/app/services/`)
| File | Purpose |
|------|---------|
| `provisioning.py` | 8-step idempotent user onboarding orchestrator |
| `key_service.py` | Key CRUD, rotate, revoke with audit logging |
| `admin_service.py` | Admin user/key management, audit queries |
| `litellm_client.py` | LiteLLM proxy API wrapper |
| `rotation_service.py` | Scheduled key rotation (cron) |
| `reconciliation_service.py` | Drift detection between portal DB & LiteLLM |
| `notification_service.py` | Key expiry notification thresholds |
| `email_service.py` | SMTP email with Jinja2 templates |
| `deprovisioning_service.py` | User deprovisioning workflow |

### Frontend Pages (`frontend/src/pages/`)
| File | Route | Purpose |
|------|-------|---------|
| `Login.tsx` | `/login` | MSAL login |
| `Dashboard.tsx` | `/` | Usage overview with recharts |
| `ApiKeys.tsx` | `/keys` | Key management (create/rotate/revoke) |
| `Usage.tsx` | `/usage` | Detailed usage analytics |
| `Teams.tsx` | `/teams` | Team memberships |
| `Models.tsx` | `/models` | Available models |
| `Settings.tsx` | `/settings` | User preferences |

## Configuration

| File | Purpose |
|------|---------|
| `pyproject.toml` | UV workspace root (members: backend, cli) |
| `backend/pyproject.toml` | Backend deps (FastAPI, SQLAlchemy, MSAL, etc.) |
| `cli/pyproject.toml` | CLI deps (Click, MSAL, Rich) |
| `frontend/package.json` | Frontend deps (React 19, Vite 7, Tailwind v4) |
| `mise.toml` | Task runner (dev, test, lint, deploy tasks) |
| `biome.json` | Frontend linter/formatter config |
| `docker-compose.yml` | Multi-container orchestration |
| `backend/app/config.py` | Runtime settings via env vars (pydantic-settings) |

## Test Coverage

- **149 tests** across **18 modules**, runs in ~0.6s
- Unit tests: services (admin, auth, key, provisioning, rotation, reconciliation, notification, email, deprovisioning)
- Integration tests: HTTP endpoints (28 tests via httpx ASGITransport)
- Infrastructure: correlation ID, rate limit, exceptions, health, input validation, CSV export

## Key Dependencies

### Backend (Python 3.12)
- FastAPI 0.133+ / Uvicorn — async web framework
- SQLAlchemy 2.0+ / Alembic — async ORM + migrations
- MSAL 1.35+ — Microsoft Entra ID authentication
- APScheduler 3.x — background job scheduling
- structlog — structured logging
- slowapi — rate limiting

### Frontend (Node 24)
- React 19.2 / React Router 7 — UI framework
- Vite 7.3 — build tool
- @azure/msal-browser 5.3 — Entra ID auth
- @tanstack/react-query 5.x — data fetching
- Tailwind CSS v4 — styling
- recharts — usage charts

### CLI
- Click — command framework
- MSAL — device-code auth
- Rich — terminal formatting

## Quick Start

```bash
# 1. Install dependencies
uv sync                        # Python (backend + CLI)
cd frontend && npm install     # Node

# 2. Run development
docker compose up              # All services
# OR individually:
cd backend && uv run uvicorn app.main:app --reload
cd frontend && npm run dev

# 3. Run tests
uv run --package apollos-portal-backend pytest -v

# 4. Lint & format
mise run qa                    # All checks
```

## Source Stats

- **48 backend** Python source files (~4,200 LOC)
- **26 frontend** TypeScript/TSX files (~1,900 LOC)
- **3 CLI** Python files (~500 LOC)
- **15 documentation** MDX pages
- **18 test** modules (149 tests)
