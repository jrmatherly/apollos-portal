---
name: api-doc
description: Sync API reference documentation with actual FastAPI endpoint routes. Use when endpoints have been added, removed, or changed and docs need updating. Trigger phrases include "are my docs in sync", "update API docs", "sync endpoints".
---

# Sync API documentation

Update `docs/api-reference/introduction.mdx` endpoint table to match the actual backend routes.

## Steps

1. **Read all endpoint files** in `backend/app/api/v1/endpoints/*.py`
2. **Extract routes** — find every `@router.get(`, `@router.post(`, `@router.patch(`, `@router.delete(` decorator and its path + response model
3. **Read the router** at `backend/app/api/v1/router.py` to get the prefix (`/api/v1`) and tag assignments
4. **Read the current endpoint table** in `docs/api-reference/introduction.mdx`
5. **Compare** documented endpoints vs actual endpoints
6. **Report differences** — list any:
   - Endpoints in code but missing from docs
   - Endpoints in docs but not in code
   - Path mismatches (e.g., docs says `/keys` but code says `/keys/new`)
   - Method mismatches
7. **Update the table** in `docs/api-reference/introduction.mdx` to match reality
8. **Update the endpoint list** in `docs/AGENTS.md` (the `API endpoints:` line in the architecture context section)

## Also check these files for stale endpoint references

- `docs/concepts/api-keys.mdx` — curl examples
- `docs/concepts/authentication.mdx` — endpoint references
- `docs/concepts/usage.mdx` — API example
- `docs/quickstart.mdx` — first request example
- `docs/cli/overview.mdx` — any API path mentions

## Table format

Keep the existing markdown table format:

```markdown
| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/me` | GET | Get the current user's profile |
```

Sort by: auth endpoints first, then provision, keys, teams, usage, models, settings. This matches the router include order.

## Do not

- Do not add endpoints that are commented out or under `if __debug__`
- Do not document the `/health` and `/ready` root endpoints in the table (they have their own section)
- Do not change endpoint descriptions unless they are factually wrong
