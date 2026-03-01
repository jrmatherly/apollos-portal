---
name: migration
description: Generate and apply an Alembic database migration. Use when adding a table, changing a column, or running "create migration". Trigger phrases include "new migration", "add column", "schema change".
compatibility: Designed for Apollos Portal backend (FastAPI + SQLAlchemy + Alembic + uv workspace)
---

# Alembic Migration

Generate a new Alembic database migration and optionally apply it.

## Arguments

The user provides a short description of the migration (e.g., "add audit_log table").

## Steps

1. **Generate**: Run `cd backend && uv run alembic revision --autogenerate -m "<description>"`
2. **Review**: Read the generated migration file and show the user the upgrade/downgrade functions
3. **Confirm**: Ask the user if they want to apply the migration
4. **Apply**: If confirmed, run `cd backend && uv run alembic upgrade head`
5. **Verify**: Run `cd backend && uv run alembic current` to confirm the migration was applied

## Important

- Always review the generated migration before applying — autogenerate can miss or misdetect changes
- Never apply without user confirmation
- If the migration looks wrong, suggest manual edits before applying
