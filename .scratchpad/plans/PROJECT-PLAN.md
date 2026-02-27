# LiteLLM Self-Service Provisioning Portal — Project Plan

**Project:** litellm-portal
**Created:** 2026-02-27
**Author:** Bot42
**Status:** Planning — Reviewed
**Research:** `/Users/jason/dev/ai-stack/LibreChat/.scratchpad/RESEARCH-litellm-entra-provisioning.md`
**Reviewed:** 2026-02-27
**Reviewer:** Claude Opus 4.6
**Review Scope:** LiteLLM OSS/Enterprise feature audit, architecture validation, codebase cross-reference, independent research

---

## 1. Project Overview

A self-service web portal (+ CLI API) that authenticates users via Microsoft Entra ID, reads their security group memberships, and provisions them in LiteLLM OSS via the admin API. The portal is the system of record for key lifecycle management — LiteLLM keys are created without expiration and the portal enforces rotation, sends notification emails, and handles deprovisioning.

### Why This Exists

LiteLLM OSS does not support SSO beyond 5 users (free for ≤5 as of v1.76.0), JWT auth, SCIM, or automated key rotation — all Enterprise features ($250/mo+ as of 2026). The portal fills these gaps by:

- Authenticating users via Entra ID (MSAL)
- Mapping Entra ID security groups → LiteLLM teams
- Provisioning users, team memberships, and API keys via LiteLLM admin API
- Managing key lifecycle (expiration, rotation, revocation)
- Sending email notifications for upcoming key rotations
- Providing a self-service dashboard (usage, keys, teams)
- Exposing a CLI-compatible API for headless provisioning
- Handling deprovisioning when users leave qualifying groups

---

## 2. Tech Stack

| Component | Technology | Rationale |
|---|---|---|
| **Backend** | FastAPI (Python 3.12+) | Excellent MSAL SDK, async httpx for LiteLLM API, lightweight, type-safe |
| **Frontend** | Vite 6 + React 19 (TypeScript) | Stitch-designed SPA already scaffolded. Tailwind CSS, Recharts, Lucide icons, Motion (Framer). MSAL.js browser library for auth. No SSR needed for internal portal. |
| **Database** | PostgreSQL 18 | Same DB engine as LiteLLM (can share instance, separate schema), robust JSON support |
| **ORM/Migrations** | SQLAlchemy 2.x + Alembic | Async support, proven migration tooling |
| **Auth** | MSAL (Microsoft Authentication Library) | Official Microsoft library — Python for backend, @azure/msal-browser for frontend |
| **Graph API** | `msgraph-sdk-python` (preferred) or `httpx` + REST | Group membership resolution via client credentials (app-only). Handles pagination automatically for users in many groups. |
| **Email** | SMTP (Exchange Online / SendGrid / SES) | Notification emails for key rotation cadence |
| **Task Scheduling** | APScheduler or Celery Beat | Cron jobs for rotation, notifications, deprovisioning, reconciliation |
| **Deployment** | Docker Compose | Same stack as LiteLLM, internal network |
| **Package Management** | uv | Fast, lockfile-based, consistent with other projects |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                       │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Frontend    │    │     Backend      │    │     LiteLLM      │  │
│  │ (Vite/React) │───▶│    (FastAPI)     │───▶│      Proxy       │  │
│  │  Port 3000   │    │   Port 8000      │    │    Port 4000     │  │
│  └──────────────┘    └────────┬─────────┘    └──────────────────┘  │
│                               │                                     │
│                    ┌──────────▼──────────┐                         │
│                    │    PostgreSQL 18    │                         │
│                    │  (portal schema)     │                         │
│                    └─────────────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
        │                       │
        │ MSAL Auth             │ Microsoft Graph API
        ▼                       ▼
┌───────────────────────────────────────┐
│         Microsoft Entra ID            │
│  (Users, Groups, App Registration)    │
└───────────────────────────────────────┘

        │
        │ CLI (MSAL device-code flow)
        ▼
┌──────────────┐
│  CLI Client   │──▶ Backend API (same endpoints)
└──────────────┘
```

---

## 4. Phases

### Phase 0: Project Scaffolding (Day 1)

**Goal:** Repository structure, dev environment, tooling.

> **[REVIEW NOTE]** The frontend already exists as a Stitch-designed Vite + React 19 SPA with 6 pages (Dashboard, API Keys, Usage, Models, Teams, Settings), a sidebar nav, Tailwind CSS, Recharts, Lucide icons, and Motion animations. All data is currently hardcoded mock data. Phase 0 must clean up Stitch artifacts and integrate the existing frontend into the monorepo structure rather than scaffolding a new one.

| # | Task | Details |
|---|---|---|
| 0.1 | Restructure repository | Move existing Stitch frontend into `frontend/` subdirectory. Create `backend/`, `cli/`, `docker/` directories. |
| 0.2 | Clean up Stitch artifacts | Remove unused dependencies from package.json: `@google/genai`, `better-sqlite3`, `express`, `@types/express`. Update `name` from `react-example` to `litellm-portal`. Remove `GEMINI_API_KEY` from config. Update `metadata.json` and README. |
| 0.3 | Backend scaffold | FastAPI app with uv, pyproject.toml, ruff config, basic health endpoint |
| 0.4 | Frontend integration | Wire existing Vite/React app to backend API. Add `@azure/msal-browser` dependency. Add API client layer (fetch or axios). Replace mock data hooks with real API calls (incrementally, during Phase 3). |
| 0.5 | Docker Compose | Backend, frontend, PostgreSQL containers. Volume mounts for dev. |
| 0.6 | Database setup | SQLAlchemy models, Alembic init, initial migration with full schema |
| 0.7 | Configuration | Environment variables, config schema (Pydantic Settings), `.env.example` for both backend and frontend |
| 0.8 | mise tasks | `dev`, `migrate`, `lint`, `format`, `test`, `docker:up`, `docker:down` |

**Schema (initial migration):**
- `provisioned_users` — Entra identity, email, preferences
- `provisioned_keys` — key tracking, portal-enforced expiry, rotation lineage
- `user_team_memberships` — Entra group → LiteLLM team per user
- `key_notifications` — email notification log, deduplication
- `audit_log` — all portal actions

**Deliverable:** Running dev environment with empty app shell, database migrations applied.

---

### Phase 1: Authentication & Authorization (Days 2–3)

**Goal:** Users can authenticate via Entra ID. Backend validates tokens and reads group memberships.

| # | Task | Details |
|---|---|---|
| 1.1 | Entra ID App Registration | Register app in Azure Portal, configure redirect URIs, API permissions (`User.Read`, `GroupMember.Read.All`), generate client secret |
| 1.2 | Backend MSAL integration | `msal` Python library — confidential client for user token validation + **client credentials flow** for Graph API (app-only token) |
| 1.3 | Backend auth middleware | FastAPI dependency that validates Bearer token (Entra ID access token), extracts user identity (oid, email, name) |
| 1.4 | Group membership resolution | Call Microsoft Graph `/users/{oid}/memberOf` using **app-only token** (client credentials). Handle pagination (`@odata.nextLink`). Filter results against configured `teams.yaml` group IDs. **No JWT `groups` claim** — unreliable at scale (200-group overage limit). |
| 1.5 | Group-to-team mapping config | YAML config file mapping Entra group Object IDs → team alias, models, budgets. Loaded at startup. |
| 1.6 | Authorization check | Verify user is member of at least one configured group. Return 403 if not. |
| 1.7 | Frontend MSAL integration | `@azure/msal-browser` — PKCE auth code flow, silent token refresh, login/logout. Works natively with Vite/React SPA (no SSR complications). |
| 1.8 | Frontend auth context | React context provider wrapping MSAL, protected route wrapper. Integrate with existing React Router setup in App.tsx. |
| 1.9 | Login page | Entra ID sign-in button, redirect flow, error handling. Redirect URI: `/auth/callback` handled by React Router. |
| 1.10 | CLI auth flow | MSAL device-code flow — user gets a code, authenticates in browser, CLI receives token |

**Deliverable:** User can log in via browser or CLI, backend validates identity and resolves group memberships.

---

### Phase 2: Provisioning Engine (Days 4–6)

**Goal:** Portal provisions users, teams, and API keys in LiteLLM via admin API.

| # | Task | Details |
|---|---|---|
| 2.1 | LiteLLM API client | Async httpx client wrapping LiteLLM admin endpoints. Master key from env. Error handling, retries. |
| 2.2 | Team sync service | On user login: for each qualifying group, ensure team exists in LiteLLM (`POST /team/new` with explicit `team_id` set to the Entra group ID for deterministic idempotency). Check existence first via `/team/info` — LiteLLM does not return 409 on duplicate, it creates a new team with a new ID. Store in `user_team_memberships`. |
| 2.3 | User provisioning service | Create user in LiteLLM (`POST /user/new`), store in `provisioned_users`. Idempotent — skip if already exists. **Note:** `/user/new` auto-generates an API key in its response — ignore/discard this key as the portal creates keys separately via `/key/generate` for proper lifecycle tracking. |
| 2.4 | Team membership service | Add user to each qualifying team (`POST /team/member_add`). Track in portal DB. |
| 2.5 | Key generation service | Generate API key (`POST /key/generate`) with `user_id`, `team_id`, `models`, `key_alias`. Omit `duration` parameter (confirmed: LiteLLM OSS allows `null` duration = no expiration). Portal DB stores its own `expires_at` for lifecycle enforcement. Use `key_alias` format: `{email}-{team_alias_slug}` (must be unique in LiteLLM — add collision handling). |
| 2.6 | Provisioning orchestrator | Single function that runs the full flow: validate groups → sync teams → provision user → add memberships → generate key(s). Transactional in portal DB. |
| 2.7 | Backend API endpoints | `POST /api/v1/provision` — full provisioning flow, returns key(s). `GET /api/v1/status` — user's current provisioning state. |
| 2.8 | Frontend provisioning flow | First-login experience: show qualifying teams, let user confirm, provision, reveal API key (one-time). |
| 2.9 | CLI provisioning | `POST /api/v1/provision` from CLI, output key + config in terminal. |
| 2.10 | Audit logging | Record all provisioning actions in `audit_log` table. |

**Provisioning API response:**
```json
{
  "user_id": "user@company.com",
  "teams": [
    {
      "team_id": "<entra-group-id>",
      "team_alias": "Engineering AI Team",
      "models": ["gpt-4o", "gpt-4o-mini"],
      "api_key": "sk-...",
      "key_alias": "user@company.com-engineering",
      "expires_at": "2026-05-28T03:05:00Z"
    }
  ],
  "litellm_base_url": "https://llms.company.com"
}
```

**Deliverable:** End-to-end provisioning works — user authenticates, gets provisioned in LiteLLM, receives API key(s).

---

### Phase 3: Self-Service Dashboard (Days 7–9)

**Goal:** Users can view and manage their keys, usage, and team memberships.

| # | Task | Details |
|---|---|---|
| 3.1 | Backend usage endpoints | `GET /api/v1/keys` — list user's active keys with spend data (use LiteLLM `/key/list` with `user_id` filter, more efficient than looping `/key/info`). `GET /api/v1/usage` — aggregate spend (from `/user/info`). **Key strings must be masked in list responses** (show only last 4 chars, e.g., `sk-...ab12`) — full key is only revealed once at creation time. |
| 3.2 | Backend key management endpoints | `POST /api/v1/keys/rotate` — rotate specific key (generate new → **block** old via `/key/block` instead of `/key/delete` to preserve audit trail). `POST /api/v1/keys/revoke` — revoke a key (use `/key/block` for soft-delete, `/key/delete` for hard-delete). `POST /api/v1/keys/new` — generate additional key for a team. |
| 3.3 | Dashboard layout | Sidebar nav: Dashboard, Keys, Teams, Settings. Top bar: user name, logout. |
| 3.4 | Dashboard home page | Summary cards: total spend, active keys count, teams count, next key expiry. |
| 3.5 | Keys page | Table of active keys: alias, team, spend vs budget, created, expires, actions (rotate, revoke). Expired/revoked keys in a collapsed "History" section. |
| 3.6 | Key detail view | Per-key: spend breakdown, models available, team, creation date, expiry date, rotation history (linked via `rotated_from`). |
| 3.7 | Generate new key flow | Select team → select expiration (30/60/90/180d) → generate → one-time key reveal with copy button. |
| 3.8 | Rotate key flow | Confirm dialog → generate new → show new key → delete old. Clear UX that old key stops working immediately. |
| 3.9 | Teams page | List of user's teams with team-level spend, models, member count. |
| 3.10 | Models page | Available models registry (already designed in Stitch frontend as `Models.tsx`). Backend endpoint `GET /api/v1/models` proxying LiteLLM `/model/info` filtered by user's team access. Search, provider filter tabs. |
| 3.11 | Settings page | Default key expiration preference (30/60/90/180d). Email notification preferences (on/off per threshold). |

**Deliverable:** Fully functional self-service dashboard.

---

### Phase 4: Key Lifecycle & Notifications (Days 10–12)

**Goal:** Automated key rotation, email notifications, cron jobs.

| # | Task | Details |
|---|---|---|
| 4.1 | Email service | SMTP client (aiosmtplib or smtplib). Configurable: SMTP host, port, credentials, from address. HTML email templates. |
| 4.2 | Email templates | Templates for: 14d warning, 7d warning, 3d warning, 1d warning, rotation completed, key revoked, account deprovisioned. All include portal link. |
| 4.3 | Notification cron job | Runs daily. Checks active keys against thresholds (14/7/3/1 days). Deduplicates via `key_notifications` table. Sends emails. |
| 4.4 | Rotation cron job | Runs every 6 hours. Finds keys past expiry. Executes auto-rotation (generate new → delete old → send email). |
| 4.5 | Deprovisioning cron job | Runs every 6 hours. Calls Graph API to check group memberships for all active users. **Uses `/key/block`** (not `/key/delete`) for keys of removed users — preserves spend history. Marks user as deprovisioned. **Enhancement (v2):** Consider Microsoft Graph change notifications (webhooks) for real-time group membership changes instead of polling. |
| 4.6 | Reconciliation cron job | Runs daily. Compares portal DB with LiteLLM (use `/key/list` with pagination instead of looping `/key/info` — more efficient). Flags drift (key exists in portal but not LiteLLM, or vice versa). Also reconcile users via `/user/list` and teams via `/team/list`. |
| 4.7 | Scheduler setup | APScheduler (or Celery Beat) configured with all cron jobs. Runs in backend process. |
| 4.8 | Admin notification | Email or webhook to admin when: deprovisioning occurs, reconciliation finds drift, cron job fails. |

**Deliverable:** Fully automated key lifecycle — no manual intervention needed for rotation, notification, or deprovisioning.

---

### Phase 5: Admin Features & Hardening (Days 13–15)

**Goal:** Admin visibility, security hardening, production readiness.

| # | Task | Details |
|---|---|---|
| 5.1 | Admin dashboard | Admin-only views: all users, all keys, all teams, audit log. Requires Entra ID App Role `portal_admin`. |
| 5.2 | Admin actions | Revoke any key, deprovision any user, reset user's key preference, trigger manual provisioning for a user. |
| 5.3 | Audit log viewer | Filterable table: by actor, action, target, date range. Export to CSV. |
| 5.4 | Rate limiting | Backend rate limits on provisioning endpoints (prevent key generation abuse). |
| 5.5 | Input validation | Strict validation on all API inputs. Parameterized queries (SQLAlchemy handles this). |
| 5.6 | Secret management | Master key, client secret, SMTP credentials — all from environment/vault, never in code or config files. |
| 5.7 | Health endpoints | `GET /health` (liveness), `GET /ready` (checks DB + LiteLLM connectivity). |
| 5.8 | Logging | Structured JSON logging (structlog or python-json-logger). Correlation IDs per request. |
| 5.9 | Error handling | Global exception handler. Friendly error messages to frontend. Detailed errors to logs. |
| 5.10 | Tests | Unit tests for provisioning logic, key lifecycle, group mapping. Integration tests against LiteLLM API (test container). |
| 5.11 | Documentation | README with setup instructions, architecture diagram, env var reference, API docs (auto-generated from FastAPI OpenAPI). |

**Deliverable:** Production-ready portal with admin visibility and security controls.

---

## 5. Configuration

### Environment Variables

```bash
# --- Entra ID ---
AZURE_TENANT_ID=                       # Entra ID tenant
AZURE_CLIENT_ID=                       # App Registration client ID
AZURE_CLIENT_SECRET=                   # App Registration client secret
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# --- LiteLLM ---
LITELLM_BASE_URL=http://litellm:4000   # Internal Docker network URL
LITELLM_MASTER_KEY=sk-...              # Admin API key

# --- Database ---
DATABASE_URL=postgresql+asyncpg://portal:password@postgres:5432/litellm_portal

# --- Email (SMTP) ---
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=noreply@company.com
SMTP_PASSWORD=
SMTP_FROM=noreply@company.com
SMTP_USE_TLS=true

# --- Portal ---
PORTAL_BASE_URL=https://ai-portal.company.com  # Used in email links
DEFAULT_KEY_DURATION_DAYS=90
PORTAL_ADMIN_ROLE=portal_admin          # Entra ID App Role for admin access

# --- Cron ---
NOTIFICATION_CRON_SCHEDULE=0 9 * * *    # Daily at 09:00 UTC
ROTATION_CRON_SCHEDULE=0 */6 * * *      # Every 6 hours
DEPROVISIONING_CRON_SCHEDULE=0 */6 * * *
RECONCILIATION_CRON_SCHEDULE=0 2 * * *  # Daily at 02:00 UTC
```

### Group-to-Team Mapping (`teams.yaml`)

```yaml
# Each entry maps an Entra ID security group to a LiteLLM team configuration.
# Users in multiple groups get provisioned into multiple teams (one key per team).

teams:
  - entra_group_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    team_alias: "Engineering AI Team"
    models:
      - "gpt-4o"
      - "gpt-4o-mini"
      - "text-embedding-3-large"
    max_budget: 500              # Team budget (USD) — maps to LiteLLM /team/new `max_budget`
    budget_duration: "30d"       # Team budget reset — maps to LiteLLM `budget_duration`
    team_member_budget: 25       # Per-member budget within team — maps to LiteLLM /team/new `max_budget_in_team`
    litellm_role: "internal_user"  # OSS role (proxy_admin, proxy_admin_viewer, internal_user)

  - entra_group_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    team_alias: "Data Science Team"
    models:
      - "gpt-4o"
      - "gpt-4o-mini"
      - "claude-sonnet-4-6"      # Updated: Claude 4.x models as of 2026
      - "text-embedding-3-large"
    max_budget: 2000
    budget_duration: "30d"
    team_member_budget: 100      # Per-member budget within team
    litellm_role: "internal_user"

# Gate: user must be in at least one of these groups to access the portal.
# If omitted, any group listed above qualifies.
required_groups:
  - "c3d4e5f6-a7b8-9012-cdef-123456789012"   # SG-AI-Platform-Users
```

---

## 6. API Reference (Portal)

### Public Endpoints (no auth)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check (DB + LiteLLM) |

### Authenticated Endpoints (Entra ID Bearer token)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/status` | Current user's provisioning status, teams, active keys |
| POST | `/api/v1/provision` | Full provisioning flow — returns API key(s) |
| GET | `/api/v1/keys` | List user's active keys with spend data |
| POST | `/api/v1/keys/new` | Generate additional key (select team + expiration) |
| POST | `/api/v1/keys/{id}/rotate` | Rotate a key (generate new → delete old) |
| POST | `/api/v1/keys/{id}/revoke` | Revoke a key |
| GET | `/api/v1/usage` | Aggregate spend across all user's keys |
| GET | `/api/v1/teams` | User's team memberships with team-level spend |
| GET | `/api/v1/models` | Available models filtered by user's team access |
| GET | `/api/v1/settings` | User's preferences (default expiration, notification prefs) |
| PATCH | `/api/v1/settings` | Update preferences |

### Admin Endpoints (Entra ID Bearer token + `portal_admin` App Role)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/users` | List all provisioned users |
| GET | `/api/v1/admin/users/{id}` | User detail with keys, teams, audit history |
| POST | `/api/v1/admin/users/{id}/deprovision` | Force-deprovision a user |
| POST | `/api/v1/admin/users/{id}/reprovision` | Re-provision a deprovisioned user |
| GET | `/api/v1/admin/keys` | List all active keys across all users |
| POST | `/api/v1/admin/keys/{id}/revoke` | Admin-revoke any key |
| GET | `/api/v1/admin/audit` | Audit log (filterable, paginated) |
| GET | `/api/v1/admin/audit/export` | Export audit log as CSV |
| GET | `/api/v1/admin/health` | Cron job status, last run times, error counts |

### CLI Endpoints (same as authenticated, different auth flow)

The CLI uses MSAL device-code flow to obtain an Entra ID token, then calls the same `/api/v1/*` endpoints. No separate CLI-specific endpoints needed.

---

## 7. Timeline

| Phase | Days | Calendar (estimated) | Deliverable |
|---|---|---|---|
| **Phase 0:** Scaffolding | 1 | Day 1 | Dev environment, DB schema, empty shell |
| **Phase 1:** Auth | 2 | Days 2–3 | Entra ID login (browser + CLI), group resolution |
| **Phase 2:** Provisioning | 3 | Days 4–6 | End-to-end provisioning, API key generation |
| **Phase 3:** Dashboard | 3 | Days 7–9 | Self-service UI (keys, usage, models, teams, settings) |
| **Phase 4:** Lifecycle | 3 | Days 10–12 | Cron jobs, email notifications, auto-rotation |
| **Phase 5:** Hardening | 3 | Days 13–15 | Admin panel, security, tests, docs |
| **Total** | **15 working days** | ~3 weeks | Production-ready portal |

---

## 8. Key Decisions (Status)

| # | Decision | Status | Resolution |
|---|---|---|---|
| 1 | User identifier in LiteLLM | **Open** | Email (human-readable) vs Entra OID (immutable). Recommend email. **[Review note]** Email is the better choice for readability in LiteLLM UI and audit logs. However, email can change (name change, domain migration). Consider storing both: use `user_id=email` in LiteLLM but track `entra_oid` in portal DB as the immutable link. If the email changes, the portal can update LiteLLM via `/user/update`. |
| 2 | Key lifecycle | **✅ Decided** | Portal-managed. 30/60/90(default)/180d. LiteLLM keys have no expiry. Notification cadence: 14d/7d/3d/1d. Auto-rotation on expiry. **[Confirmed]** LiteLLM OSS allows `duration=null` on `/key/generate` — keys never expire. Portal DB is sole enforcer. |
| 3 | LiteLLM UI access for non-admins | **Open** | Option A: No UI access (portal only). Option B: Invitation link for fallback login. **[Review note]** LiteLLM OSS SSO supports ≤5 users (as of v1.76.0). Option A recommended — portal is the single pane of glass. SSO slots reserved for admin-only LiteLLM UI access. |
| 4 | Multi-team key strategy | **Open** | One key per team (recommended — aligns with LiteLLM budget scoping) vs one key total. **[Review note]** One key per team is strongly recommended. LiteLLM enforces team-level `max_budget` and `models` per key. A single key across teams would bypass team budget isolation. |
| 5 | Approval workflow | **Open** | Entra group membership = auto-provision, or require manual approval? |
| 6 | Email provider | **Open** | Exchange Online (M365), SendGrid, SES, or generic SMTP? |
| 7 | Portal DB hosting | **Open** | Separate PostgreSQL instance, or schema in existing LiteLLM PostgreSQL? **[Review note]** Separate schema in the same instance is pragmatic for v1. Use a dedicated `portal` schema to avoid any table name collisions. Separate instance is better for production isolation if budget allows. |
| 8 | Frontend framework | **✅ Decided** | **[Review update]** Vite + React 19 SPA (confirmed — already scaffolded by Stitch). Original plan specified Next.js 15 but the existing codebase uses Vite. No SSR needed for an internal portal. Keeps existing Stitch work. |

---

## 9. Dependencies & Prerequisites

| Dependency | Owner | Status |
|---|---|---|
| Entra ID App Registration (portal) | Jason / IT Admin | Not started |
| Entra ID security groups for LiteLLM teams | Jason / IT Admin | Not started |
| Entra ID App Roles (`portal_admin`) | Jason / IT Admin | Not started |
| Microsoft Graph API permissions (`GroupMember.Read.All` **Application**, admin consent) | Jason / IT Admin | Not started |
| LiteLLM instance running with master key | Jason | Assumed existing |
| SMTP credentials for notification emails | Jason / IT Admin | Not started |
| DNS/TLS for portal URL | Jason / IT Admin | Not started |

---

## 10. Out of Scope (for v1)

- LiteLLM Enterprise features (SSO, JWT, SCIM, key rotation)
- Custom model deployment or management
- Multi-tenant / multi-LiteLLM-instance support
- User self-registration (must be in an Entra ID qualifying group)
- Mobile app
- Billing / chargeback (LiteLLM tracks spend; portal displays it but doesn't bill)

---

## 11. LiteLLM OSS Compatibility Audit (February 2026)

> **Audited against:** LiteLLM OSS (latest stable, post-v1.81.x). Enterprise tiers: Basic ($250/mo), Premium ($30,000/yr).

### Features Used by This Plan — OSS Availability

| Feature | Used In | OSS Available? | Notes |
|---|---|---|---|
| `/key/generate` (create keys) | Phase 2 | **Yes** | All parameters except `auto_rotate`, `rotation_interval`, `model_max_budget`, `guardrails`, `temp_budget_increase` |
| `/key/info`, `/key/list` | Phase 3 | **Yes** | `/key/list` supports `user_id`, `team_id` filters + pagination (`offset`/`limit`) |
| `/key/update` | Phase 3 | **Yes** | |
| `/key/delete` | Phase 3, 4 | **Yes** | |
| `/key/block`, `/key/unblock` | Phase 3, 4 | **Yes** | Soft-disable without deletion — recommended over `/key/delete` for audit trail |
| `/user/new` | Phase 2 | **Yes** | Returns auto-generated key in response — portal should discard this |
| `/user/info`, `/user/list` | Phase 3 | **Yes** | `/user/list` supports `page`/`page_size` pagination |
| `/user/update` | Phase 2, 4 | **Yes** | |
| `/user/delete` | Phase 4 | **Yes** | |
| `/team/new` | Phase 2 | **Yes** | Supports `team_id` (explicit), `team_alias`, `max_budget`, `budget_duration`, `models`, `max_budget_in_team` |
| `/team/info`, `/team/list` | Phase 3 | **Yes** | |
| `/team/member_add` | Phase 2 | **Yes** | Accepts `role` ("admin" or "user") and `user_id` |
| `/team/member_delete` | Phase 4 | **Yes** | |
| `max_budget` on keys/users/teams | Phase 2, 5 | **Yes** | |
| `budget_duration` on keys/users/teams | Phase 2, 5 | **Yes** | Supports "30s", "30m", "30h", "30d", "1mo" |
| `rpm_limit`, `tpm_limit` | Phase 5 | **Yes** | On keys, users, and teams |
| `max_parallel_requests` | Phase 5 | **Yes** | |
| Key `duration=null` (no expiry) | Phase 2 | **Yes** | Confirmed: omit `duration` or set to null for non-expiring keys |
| `internal_user` role | Phase 2 | **Yes** | Standard OSS role for end users |
| `proxy_admin` role | Phase 5 | **Yes** | Full admin access |
| `proxy_admin_viewer` role | Phase 5 | **Yes** | Read-only admin |
| `/model/info` | Phase 3 | **Yes** | Model registry data for Models page |

### Features NOT Used (Correctly Avoided)

| Enterprise Feature | Plan Approach Instead | Status |
|---|---|---|
| SSO (>5 users) | Portal handles auth via MSAL/Entra ID directly | **Correct** |
| JWT authentication | Portal validates Entra ID tokens itself, uses master key for LiteLLM API | **Correct** |
| SCIM provisioning | Portal provisions via admin API based on Entra group membership | **Correct** |
| Auto key rotation (`auto_rotate`) | Portal cron job handles rotation via generate + block cycle | **Correct** |
| `org_admin` / `team_admin` roles | Portal manages team admin via its own `portal_admin` App Role | **Correct** |
| Per-model budgets (`model_max_budget`) | Not used — team-level `max_budget` sufficient for v1 | **Correct** |
| Tag-based budgets | Not used | **Correct** |
| `/spend/report` endpoint | Portal aggregates spend from `/user/info` and `/key/info` | **Correct** |
| Guardrails per key/team | Not in scope for v1 | **Correct** |
| Audit logs (Enterprise) | Portal maintains its own `audit_log` table | **Correct** |

### Potential Enterprise Feature Traps

| Risk | Description | Mitigation |
|---|---|---|
| `key_alias` uniqueness | LiteLLM requires unique `key_alias`. If the portal doesn't handle collisions, `/key/generate` will fail. | Use deterministic format: `{email}-{team_slug}-{timestamp}`. Catch and retry with suffix on collision. |
| `model_max_budget` on `/key/generate` | If this parameter is accidentally passed, LiteLLM will reject the request with an enterprise license check error. | Never pass `model_max_budget` — use team-level `max_budget` only. |
| `guardrails` on `/key/generate` | Same as above — passing `guardrails` triggers enterprise check. | Explicitly exclude this parameter. |
| `send_invite_email` on `/key/generate` | May require email configuration on LiteLLM side. | Portal handles emails independently — do not use LiteLLM's email features. |

---

## 12. Risks & Mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Portal is sole enforcer of key expiry.** LiteLLM keys have no expiration — if the portal DB is lost or cron jobs stop, keys live forever. | **High** | Implement DB backup strategy. Add health monitoring for cron jobs (Phase 5.8). Consider setting a generous `duration` (e.g., `"180d"`) on LiteLLM keys as a safety net — if portal fails, keys still expire eventually. |
| R2 | **Concurrent provisioning.** Multiple browser tabs or rapid clicks could trigger duplicate provisioning. | **Medium** | Add database-level unique constraints on `(user_id, team_id)` in `provisioned_keys`. Use `SELECT FOR UPDATE` or advisory locks during provisioning orchestration. |
| R3 | **LiteLLM API availability.** If LiteLLM proxy is down, provisioning, rotation, and dashboard all fail. | **Medium** | Cache key/team/usage data in portal DB. Show cached data with a "stale" indicator when LiteLLM is unreachable. Provisioning must wait for LiteLLM — fail gracefully with a clear user message. |
| R4 | **Graph API rate limiting.** Deprovisioning cron checks group membership for ALL active users every 6 hours. At scale (1000+ users), this could hit Graph API rate limits. | **Medium** | Batch Graph API calls. Use `$batch` endpoint for bulk membership checks. Implement exponential backoff. For v2, switch to Graph change notifications (webhooks). |
| R5 | **Stitch frontend artifacts.** Package.json includes unused dependencies (`@google/genai`, `express`, `better-sqlite3`) and the project name is `react-example`. | **Low** | Clean up in Phase 0.2 before any development begins. |
| R6 | **Master key exposure.** The portal backend holds the LiteLLM master key. If compromised, full LiteLLM admin access is exposed. | **High** | Store master key in environment variable (not config files). In production, use a secrets manager (Azure Key Vault, HashiCorp Vault). Restrict backend container network access. |
| R7 | **Pre-existing LiteLLM data.** If LiteLLM already has users/keys/teams created outside the portal, the reconciliation job must handle these gracefully. | **Medium** | Reconciliation job (Phase 4.6) should identify "unmanaged" keys/users and surface them to admins rather than auto-modifying them. Add an admin action to "claim" or "ignore" unmanaged resources. |
| R8 | **Email change in Entra ID.** If email is used as `user_id` in LiteLLM and the user's email changes (name change, domain migration), the link between portal and LiteLLM breaks. | **Medium** | Store `entra_oid` (immutable) as the primary link in portal DB. Store email as display/LiteLLM identifier. Add a reconciliation check that detects email changes via Graph API and updates LiteLLM via `/user/update`. |

---

## 13. Codebase–Plan Gap Analysis

> Current state of the repository vs. what the plan expects.

| Area | Plan Expects | Codebase Has | Gap |
|---|---|---|---|
| **Frontend framework** | Next.js 15 + shadcn/ui | Vite 6 + React 19 + Tailwind + Recharts + Lucide + Motion | **Resolved:** Plan updated to Vite+React. No migration needed. |
| **Frontend pages** | Dashboard, Keys, Teams, Settings | Dashboard, Keys, Usage, Models, Teams, Settings | **Frontend is ahead of plan** — Usage and Models pages exist but plan didn't include backend endpoints for them. Now added. |
| **Backend** | FastAPI with health endpoint | Nothing | Full backend scaffold needed (Phase 0.3) |
| **Database** | PostgreSQL + SQLAlchemy + Alembic | Nothing | Full DB setup needed (Phase 0.6) |
| **Docker Compose** | 3 containers (frontend, backend, DB) | Nothing | Full Docker setup needed (Phase 0.5) |
| **Auth** | MSAL browser + backend | Nothing | Full auth integration needed (Phase 1) |
| **API client** | Frontend fetching from backend | All mock data, no HTTP client | Need to add API client layer and replace mock data (Phase 3) |
| **Package.json** | Clean dependencies | Stitch artifacts: `@google/genai`, `express`, `better-sqlite3`, name=`react-example` | Cleanup needed (Phase 0.2) |
| **`.env.example`** | Portal config vars (Azure, LiteLLM, SMTP, DB) | Stitch vars (`GEMINI_API_KEY`, `APP_URL`) | Replace entirely (Phase 0.7) |
| **README** | Portal setup docs | Stitch/AI Studio boilerplate | Rewrite (Phase 0.2, finalize Phase 5.11) |

---

## References

### Project Documents
- Research doc: `/Users/jason/dev/ai-stack/LibreChat/.scratchpad/RESEARCH-litellm-entra-provisioning.md`
- Entra ID setup guide: `.scratchpad/plans/ENTRA-ID-SETUP.md`
- Stitch-designed frontend: `src/` directory (Vite + React 19 SPA)

### LiteLLM Documentation (verified Feb 2026)
- [LiteLLM Enterprise Features](https://docs.litellm.ai/docs/proxy/enterprise) — definitive list of what requires a license
- [LiteLLM Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys) — key generation, budgets, duration parameter
- [LiteLLM Access Control / RBAC](https://docs.litellm.ai/docs/proxy/access_control) — roles (proxy_admin, internal_user, etc.)
- [LiteLLM User Management](https://docs.litellm.ai/docs/proxy/users) — budgets, rate limits
- [LiteLLM Team Budgets](https://docs.litellm.ai/docs/proxy/team_budgets) — team-level budget config, max_budget_in_team
- [LiteLLM Self-Serve](https://docs.litellm.ai/docs/proxy/self_serve) — key_generation_settings, role-based key creation
- [LiteLLM SSO for Admin UI](https://docs.litellm.ai/docs/proxy/admin_ui_sso) — SSO free for ≤5 users (v1.76.0+)
- [LiteLLM SCIM](https://docs.litellm.ai/docs/tutorials/scim_litellm) — Enterprise only
- [LiteLLM v1.76.0 Release Notes](https://docs.litellm.ai/release_notes/v1-76-0) — SSO user limit change

### Microsoft
- [MSAL Python](https://github.com/AzureAD/microsoft-authentication-library-for-python) — backend auth
- [MSAL.js Browser](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-browser) — frontend auth
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/overview) — group membership
- [Microsoft Graph Change Notifications](https://learn.microsoft.com/en-us/graph/webhooks) — real-time group membership changes (v2 enhancement)

### LiteLLM Community / Issues
- [JWT/Prometheus Enterprise Discussion #5163](https://github.com/BerriAI/litellm/discussions/5163) — enterprise gating timeline
- [Master Key Rotation Bug #11210](https://github.com/BerriAI/litellm/issues/11210) — confirmed fixed
- [Key Generate Enterprise Check #11552](https://github.com/BerriAI/litellm/issues/11552) — enterprise parameter validation
