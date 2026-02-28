---
name: apollos-ai
description: Self-service portal for managing LLM API access through Microsoft Entra ID. Use when authenticating users, provisioning team memberships, creating or managing API keys, tracking usage, or administering the portal.
license: MIT
compatibility: Requires Microsoft Entra ID tenant with app registration. Backend needs Python 3.12, PostgreSQL 18, and a running LiteLLM proxy instance.
metadata:
  author: jrmatherly
  version: "1.0"
---

# Apollos AI

Self-service portal that connects Microsoft Entra ID authentication to LiteLLM proxy access management. Users authenticate with their organizational identity, get provisioned into teams based on Entra ID security group memberships, and manage API keys for LLM access.

## Authentication

All API requests require a Microsoft Entra ID bearer token in the `Authorization` header. The backend validates tokens by calling the Microsoft Graph `/me` endpoint with the user's token.

```
Authorization: Bearer <entra-id-access-token>
```

Admin endpoints additionally require the `portal_admin` app role assigned in Entra ID.

## Capabilities

### User self-service

- **Check provisioning status**: `GET /api/v1/status` returns whether the user is provisioned and their team memberships.
- **Provision**: `POST /api/v1/provision` maps the user's Entra ID security groups to LiteLLM teams and creates an initial API key.
- **Create API key**: `POST /api/v1/keys/new` with a `team_id` body parameter generates a new LiteLLM proxy key scoped to that team.
- **Rotate API key**: `POST /api/v1/keys/{key_id}/rotate` revokes the old key and creates a replacement with the same team scope.
- **Revoke API key**: `POST /api/v1/keys/{key_id}/revoke` permanently deactivates a key.
- **List keys**: `GET /api/v1/keys` returns all keys owned by the current user.
- **List teams**: `GET /api/v1/teams` returns the user's team memberships with model access details.
- **View usage**: `GET /api/v1/usage` returns token consumption, costs, and request counts.
- **List models**: `GET /api/v1/models` returns available LLM models for the user's teams.
- **User settings**: `GET /api/v1/settings` and `PATCH /api/v1/settings` for notification preferences and key expiry defaults.

### Administration

Requires the `portal_admin` Entra ID app role.

- **List users**: `GET /api/v1/admin/users` with pagination and search.
- **User detail**: `GET /api/v1/admin/users/{user_id}` with keys, teams, and audit history.
- **Deprovision user**: `POST /api/v1/admin/users/{user_id}/deprovision` blocks all keys and marks the user inactive.
- **Reprovision user**: `POST /api/v1/admin/users/{user_id}/reprovision` re-activates a deprovisioned user.
- **List all keys**: `GET /api/v1/admin/keys` with status filter (`active`, `revoked`, `expired`).
- **Admin revoke key**: `POST /api/v1/admin/keys/{key_id}/revoke` revokes any key by ID.
- **Audit log**: `GET /api/v1/admin/audit` with filters for user, action, and date range.
- **Export audit**: `GET /api/v1/admin/audit/export` downloads audit records as CSV (max 10,000 rows).
- **System health**: `GET /api/v1/admin/health` returns scheduler status and background job info.

### Health checks

Unauthenticated endpoints for monitoring.

- **Liveness**: `GET /health`
- **Readiness**: `GET /ready` checks database and LiteLLM proxy connectivity.

## Workflows

### First-time user setup

1. Authenticate with Microsoft Entra ID to get a bearer token.
2. Call `GET /api/v1/status` to check provisioning state.
3. If not provisioned, call `POST /api/v1/provision` to map Entra ID groups to teams.
4. Use the returned API key with the LiteLLM proxy at `{LITELLM_BASE_URL}/v1/chat/completions`.

### Key rotation

1. Call `POST /api/v1/keys/{key_id}/rotate` with the key ID to rotate.
2. The response contains the new key value (shown once).
3. Update your application configuration with the new key.

### Admin user management

1. Call `GET /api/v1/admin/users` to list provisioned users.
2. Call `GET /api/v1/admin/users/{user_id}` for detailed user info.
3. Call `POST /api/v1/admin/users/{user_id}/deprovision` to block a user's access.
4. Call `POST /api/v1/admin/users/{user_id}/reprovision` to restore access.

## CLI

The `apollos` CLI provides terminal access using MSAL device-code authentication.

```bash
apollos login          # Authenticate via device code flow
apollos status         # Check provisioning status
apollos provision      # Provision your account
apollos keys list      # List your API keys
apollos keys create    # Create a new API key
apollos keys rotate    # Rotate an API key
apollos keys revoke    # Revoke an API key
```

## Constraints

- API keys are scoped to a single team. Users with multiple teams need separate keys per team.
- Key values are returned only at creation and rotation. They cannot be retrieved later.
- Provisioning requires at least one Entra ID security group that maps to a configured LiteLLM team.
- The `portal_admin` role must be assigned as an Entra ID app role, not a directory role.
- Rate limiting applies per user (extracted from JWT) on all authenticated endpoints.
- Audit log CSV export is capped at 10,000 rows per request.
