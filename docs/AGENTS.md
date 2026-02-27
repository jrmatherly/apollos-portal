# Apollos AI documentation instructions

## About this project

- This is the documentation site for **Apollos AI**, a self-service portal for managing LiteLLM proxy access through Microsoft Entra ID authentication
- Built on [Mintlify](https://mintlify.com) with MDX pages and YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally at `http://localhost:3000`
- Run `mint broken-links` to check links
- Run `mint validate` to validate the build

## Terminology

Use these terms consistently throughout the documentation:

| Preferred term | Not this | Notes |
|---|---|---|
| Apollos AI | NEXUS AI, LiteLLM Portal | Official product name |
| portal | dashboard, app, UI | The web frontend |
| API key | token, secret | Keys issued to users for LLM proxy access |
| team | group, organization | Maps to LiteLLM teams and Entra ID security groups |
| provision | onboard, register, set up | The process of mapping a user to their teams |
| Entra ID | Azure AD, Active Directory | Microsoft's identity platform (current branding) |
| LiteLLM proxy | gateway, LLM router | The underlying proxy that routes LLM requests |
| CLI | command-line tool, terminal app | The `apollos` Click CLI |

## Architecture context

When documenting features, keep these architecture details in mind:

- **Backend**: FastAPI (Python 3.12) with SQLAlchemy, Alembic migrations, MSAL for token validation
- **Frontend**: React 19 + Vite 7 + TypeScript 5.9 with MSAL browser v5 (PKCE redirect flow)
- **CLI**: Click with MSAL device-code auth flow, httpx for API calls
- **Database**: PostgreSQL 18 for key metadata and audit records
- **Auth flow**: Users authenticate via Microsoft Entra ID, backend validates tokens and maps security group memberships to LiteLLM teams
- **API endpoints**: `/api/v1/me`, `/api/v1/status`, `/api/v1/provision`, `/api/v1/keys`, `/api/v1/keys/new`, `/api/v1/keys/{id}/rotate`, `/api/v1/keys/{id}/revoke`, `/api/v1/teams`, `/api/v1/usage`, `/api/v1/models`, `/api/v1/settings`

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings ("Getting started", not "Getting Started")
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- No marketing language ("powerful", "seamless", "robust")
- No filler phrases ("it's important to note", "in order to")
- When referencing configuration, always mention environment variables use the `VITE_` prefix on the frontend and `Settings` class on the backend
- Code examples should use realistic values (actual endpoint paths, realistic key names)

## Content boundaries

**Document:**
- User-facing features (portal, CLI, API)
- Authentication and authorization flows
- API key management and usage tracking
- Team structure and provisioning
- Local development setup (Docker, env vars, running services)
- API reference (generated from OpenAPI spec when available)

**Do not document:**
- Internal implementation details (SQLAlchemy model internals, migration scripts)
- `.scratchpad/` planning documents (internal only, gitignored)
- `teams.yaml` contents (sensitive configuration, gitignored)
- Hardcoded URLs, secrets, or tenant-specific configuration values
- Infrastructure/deployment details beyond Docker Compose

## Cross-references

- Project conventions are in the root `CLAUDE.md` file
- Backend tests: `uv run --package apollos-portal-backend pytest -v`
- Frontend type check: `cd frontend && npx tsc --noEmit`
- Pre-commit gate: `mise run qa`
- Serena MCP project: `apollos-portal` (activate by name)
