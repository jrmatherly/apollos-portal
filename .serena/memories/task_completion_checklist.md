# Task Completion Checklist

When a task is completed, run these checks before committing:

1. **Run all checks**: `mise run qa` (or manually run steps 2-6)
2. **Backend tests**: `cd backend && uv run pytest -v`
3. **Backend lint**: `cd backend && uv run ruff check .` (auto-fix with `--fix`)
4. **Backend format**: `cd backend && uv run ruff format --check .` (fix with `ruff format .`)
5. **Frontend lint**: `cd frontend && npx biome check .`
6. **Frontend types**: `cd frontend && npx tsc --noEmit`
7. **Check git status**: Ensure no unintended files are staged
8. **Verify .scratchpad/ excluded**: Never commit .scratchpad/ files
9. **Verify teams.yaml excluded**: Never commit backend/teams.yaml
10. **Check branding**: Search for "NEXUS AI" or other non-"Apollos AI" strings

## Common Gotchas
- FastAPI HTTPBearer returns 401 (not 403) for missing credentials in current versions
- MSAL browser v5 removed `storeAuthStateInCookie` from CacheOptions
- SQLAlchemy forward refs need `from __future__ import annotations` + `TYPE_CHECKING`
- `vite-env.d.ts` must exist or `import.meta.env` TypeScript errors appear
- CORS must use `get_settings().portal_base_url`, not hardcoded localhost
- After `npm install` in frontend, run `npx biome format --write .` — new packages can cause formatting drift across many files
- Ruff auto-fix (`--fix`) handles UP037 (unnecessary quotes with future annotations) and I001 (import sort)
- `ruff format --check` and `ruff check` are independent — CI runs both, passing one doesn't guarantee the other
- `asyncio.get_running_loop()` not `get_event_loop()` in async functions (deprecated in 3.12+)
- `is_active` check required on ALL user-facing endpoints querying `ProvisionedUser`, not just key_service
- After adding/changing API endpoints, run `mise run docs:openapi` to regenerate the OpenAPI spec
- Correlation IDs use `structlog.contextvars.bind_contextvars()` — not a custom ContextVar
- Logging format configurable via `LOG_JSON` env var (defaults to `True`)
- Admin endpoint tests: override both `require_admin` and `get_session` dependencies
- CSV export tests: patch `app.api.v1.endpoints.admin.query_audit_log` (standalone import, not module attribute)
