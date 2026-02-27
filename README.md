# Apollos AI Self-Service Portal

A self-service portal for managing LiteLLM proxy access through Microsoft Entra ID authentication. Users are automatically provisioned into LiteLLM teams based on their Entra ID security group memberships, with self-service API key management, usage tracking, and team dashboards.

## Architecture

```
apollos-portal/
├── backend/          # FastAPI API server (Python 3.12)
├── frontend/         # React 19 + Vite SPA (Node 24)
├── cli/              # CLI with device-code auth (Python 3.12)
├── docker/           # Dockerfiles
├── docker-compose.yml
└── mise.toml         # Task runner
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, MSAL Browser 5 |
| Backend | FastAPI, SQLAlchemy 2, Alembic, MSAL Python, Microsoft Graph SDK |
| CLI | Click, MSAL Python, Rich |
| Database | PostgreSQL 18 |
| Auth | Microsoft Entra ID (PKCE redirect + client credentials + device-code) |

## Prerequisites

- [Node.js 24+](https://nodejs.org/)
- [Python 3.12+](https://www.python.org/)
- [uv](https://docs.astral.sh/uv/) — Python package manager
- [Docker](https://www.docker.com/) and Docker Compose
- [mise](https://mise.jdx.dev/) (optional) — task runner
- An [Azure app registration](https://portal.azure.com/) with Microsoft Graph `User.Read` and `GroupMember.Read.All` permissions

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/jrmatherly/apollos-portal.git
cd apollos-portal

# Backend config
cp backend/.env.example backend/.env
cp backend/teams.yaml.example backend/teams.yaml
# Edit backend/.env with your Azure and LiteLLM credentials
# Edit backend/teams.yaml with your Entra group -> team mappings

# Frontend config
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Azure client ID and tenant ID
```

### 2. Start with Docker Compose

```bash
docker compose up
```

This starts PostgreSQL 18, the backend (port 8000), and the frontend (port 3000).

### 3. Or run locally

```bash
# Start database
docker compose up -d db

# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### 4. CLI setup

```bash
cd cli
uv sync
uv run apollos configure   # Enter tenant ID, client ID, portal URL
uv run apollos login        # Device-code flow
uv run apollos whoami
```

## Development

### Task runner (mise)

```bash
mise run dev              # Start all services (docker compose up)
mise run dev:backend      # Backend only with hot reload
mise run dev:frontend     # Frontend only
mise run test             # Run backend tests
mise run lint             # Run ruff + tsc
mise run format           # Format Python code
mise run migrate          # Run database migrations
mise run migrate:generate # Generate a new migration
mise run db:shell         # Open psql shell
mise run docker:reset     # Reset Docker services and volumes
```

### Without mise

```bash
# Tests
cd backend && uv run pytest -v

# Lint
cd backend && uv run ruff check .
cd frontend && npx tsc --noEmit

# Format
cd backend && uv run ruff format .
```

## Configuration

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_TENANT_ID` | Entra ID tenant | — |
| `AZURE_CLIENT_ID` | App registration client ID | — |
| `AZURE_CLIENT_SECRET` | App registration client secret | — |
| `LITELLM_BASE_URL` | LiteLLM proxy URL | `http://litellm:4000` |
| `LITELLM_MASTER_KEY` | LiteLLM admin API key | — |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://portal:portal@localhost:5432/apollos_portal` |
| `PORTAL_BASE_URL` | Frontend URL (used for CORS) | `http://localhost:3000` |
| `PORTAL_ADMIN_ROLE` | Entra app role for portal admins | `portal_admin` |
| `TEAMS_CONFIG_PATH` | Path to teams YAML config | `teams.yaml` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AZURE_CLIENT_ID` | App registration client ID | — |
| `VITE_AZURE_TENANT_ID` | Entra ID tenant | — |
| `VITE_AZURE_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/auth/callback` |

### Team Mapping (`backend/teams.yaml`)

Maps Entra ID security groups to LiteLLM teams:

```yaml
teams:
  - entra_group_id: "your-entra-group-object-id"
    team_alias: "Engineering AI Team"
    models: ["gpt-5", "gpt-5-mini"]
    max_budget: 500
    budget_duration: "30d"
    team_member_budget: 25

required_groups: []  # Optional gate groups
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `GET` | `/ready` | None | Readiness check |
| `GET` | `/api/v1/me` | Bearer | Current user profile |

API docs available at `/docs` (Swagger UI) when the backend is running.

## License

Apache-2.0
