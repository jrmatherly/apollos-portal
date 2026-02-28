---
name: precheck
description: Run full pre-commit validation (backend tests, lint, frontend type check)
---

# Pre-commit Validation

Run the complete validation suite before committing. Equivalent to `mise run qa`.

## Steps

1. **Backend tests**: `uv run --package apollos-portal-backend pytest -v`
2. **Backend lint**: `uv run --package apollos-portal-backend ruff check backend/`
3. **CLI lint**: `uv run --package apollos-cli ruff check cli/`
4. **Frontend lint**: `cd frontend && npx biome check .`
5. **Frontend type check**: `cd frontend && npx tsc --noEmit`

Run all steps sequentially. If any step fails, continue running the remaining steps so the user sees all issues at once.

## Output

Summarize results as a checklist:
- Backend tests: PASS/FAIL (N passed, N failed)
- Backend lint: PASS/FAIL (N issues)
- CLI lint: PASS/FAIL (N issues)
- Frontend lint: PASS/FAIL (N issues)
- Frontend types: PASS/FAIL (N errors)

If all pass, confirm the codebase is ready to commit.
