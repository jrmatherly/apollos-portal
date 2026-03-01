---
name: deps-check
description: Check for outdated and vulnerable dependencies across Python (uv) and Node (npm) ecosystems. Reports available updates, security advisories, and version constraints. Trigger phrases include "check dependencies", "outdated packages", "deps check", "audit dependencies".
compatibility: Designed for Apollos Portal (uv workspace + npm frontend)
disable-model-invocation: true
---

# Dependency Check

Audit Python and Node dependencies for outdated versions and security vulnerabilities.

## Steps

### 1. Python dependencies (uv)

Run these commands and capture output:

```bash
# Check for outdated packages
cd /path/to/project && uv lock --upgrade --dry-run 2>&1
```

Also check for known vulnerabilities:

```bash
uv run --package apollos-portal-backend pip-audit 2>&1
```

If `pip-audit` is not installed, note it as a recommendation and skip.

### 2. Node dependencies (npm)

```bash
cd frontend && npm outdated 2>&1
```

Also check for known vulnerabilities:

```bash
cd frontend && npm audit 2>&1
```

### 3. Report

Summarize findings in this format:

#### Python (backend + CLI)

| Package | Current | Latest | Type |
|---------|---------|--------|------|
| package-name | 1.0.0 | 1.1.0 | patch |

- **Security**: List any CVEs or advisories
- **Breaking**: Flag any major version bumps

#### Node (frontend)

| Package | Current | Wanted | Latest | Type |
|---------|---------|--------|--------|------|
| package-name | 1.0.0 | 1.0.1 | 2.0.0 | devDependency |

- **Security**: List any npm audit findings
- **Breaking**: Flag any major version bumps

### 4. Recommendations

Based on findings, recommend:
- **Safe to update**: Patch/minor bumps with no breaking changes
- **Review needed**: Major version bumps or packages with known issues
- **Action required**: Any security vulnerabilities that need immediate attention

## Conventions

- Runtime pins (Python 3.12, Node 24, PostgreSQL 18) should not be bumped — major/minor bumps are disabled per Renovate config
- Patch updates for devDependencies auto-merge via Renovate — flag only if Renovate is not handling them
- Reference `renovate.json` if the user asks about automated update policy

## Do not

- Do not run `uv lock --upgrade` without the `--dry-run` flag
- Do not run `npm update` — only report what's available
- Do not modify any lock files
