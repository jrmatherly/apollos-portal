# Task Completion Checklist

When a task is completed, run these checks before committing:

1. **Run all checks**: `mise run qa` (or manually run steps 2-5)
2. **Backend tests**: `cd backend && uv run pytest -v`
3. **Backend lint**: `cd backend && uv run ruff check .` (auto-fix with `--fix`)
4. **Frontend lint**: `cd frontend && npx biome check .`
5. **Frontend types**: `cd frontend && npx tsc --noEmit`
6. **Check git status**: Ensure no unintended files are staged
5. **Verify .scratchpad/ excluded**: Never commit .scratchpad/ files
6. **Verify teams.yaml excluded**: Never commit backend/teams.yaml
7. **Check branding**: Search for "NEXUS AI" or other non-"Apollos AI" strings

## Common Gotchas
- FastAPI HTTPBearer returns 401 (not 403) for missing credentials in current versions
- MSAL browser v5 removed `storeAuthStateInCookie` from CacheOptions
- SQLAlchemy forward refs need `from __future__ import annotations` + `TYPE_CHECKING`
- `vite-env.d.ts` must exist or `import.meta.env` TypeScript errors appear
- CORS must use `get_settings().portal_base_url`, not hardcoded localhost
- Ruff auto-fix (`--fix`) handles UP037 (unnecessary quotes with future annotations) and I001 (import sort)
