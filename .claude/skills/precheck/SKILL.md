---
name: precheck
description: Run full pre-commit validation (backend tests, lint, frontend type check)
---

# Pre-commit Validation

Run the complete validation suite before committing. Report pass/fail for each step.

## Steps

1. **Backend tests**: `cd backend && uv run pytest -v`
2. **Backend lint**: `cd backend && uv run ruff check .`
3. **Frontend type check**: `cd frontend && npx tsc --noEmit`

Run all three steps sequentially. If any step fails, continue running the remaining steps so the user sees all issues at once.

## Output

Summarize results as a checklist:
- Backend tests: PASS/FAIL (N passed, N failed)
- Backend lint: PASS/FAIL (N issues)
- Frontend types: PASS/FAIL (N errors)

If all pass, confirm the codebase is ready to commit.