# Entra ID Architecture Decisions

## Critical Rules
- **NEVER use the JWT `groups` claim** for group membership resolution. Entra ID has a hard 200-group limit — when exceeded, it silently replaces the `groups` array with a `_claim_sources` overage indicator. No token claim configuration is needed or wanted.
- **ALWAYS use Microsoft Graph API** (`/users/{oid}/memberOf`) for group resolution. This is the only reliable approach at enterprise scale.
- **Use Application permission** (`GroupMember.Read.All`) not Delegated. Application permission uses client credentials flow — simpler, more reliable, works even when the user's token has expired. Delegated requires the on-behalf-of (OBO) flow which adds complexity.

## App Registrations
The project uses **one** App Registration for the portal (auth + Graph API). A second optional registration exists for LiteLLM's native UI SSO (≤5 admin users in OSS tier) — this is separate and not managed by the portal.

## Token Validation Strategy (v1)
The backend validates user tokens by calling Microsoft Graph `/me` with the bearer token. If Graph returns 200, the token is valid and we get the user profile in one call. This avoids local JWKS key rotation complexity. The `roles` claim is then extracted from the JWT payload directly (token already validated by Graph).

JWT `aud` claim is verified against `azure_client_id` in `_get_token_claims()` as defense-in-depth — ensures tokens are intended for this application even though Graph `/me` already validates the token.

Key files:
- `backend/app/core/auth.py` — `_validate_token()` calls Graph `/me`, `_get_token_claims()` decodes JWT for `roles` + `aud`
- `backend/app/core/graph.py` — `GraphClient` uses client credentials for app-only Graph API calls

## Graph API Patterns
- **Endpoint**: `/users/{oid}/memberOf/microsoft.graph.group?$select=id,displayName&$top=999`
- **Pagination**: Graph returns max 100 results by default (999 with `$top`). Response may include `@odata.nextLink` — must follow all pages.
- **Implementation**: Manual httpx `while url` loop in `GraphClient.get_user_groups()` (not using `msgraph-sdk-python` page iterator)
- **Scope for app token**: `https://graph.microsoft.com/.default`

## Auth Flows by Component
| Component | Flow | Library |
|---|---|---|
| Frontend | Auth code + PKCE (SPA redirect) | `@azure/msal-browser` v5 |
| Backend (user validation) | Graph `/me` call with user's bearer token | `httpx` |
| Backend (group resolution) | Client credentials → Graph `/memberOf` | `msal` + `httpx` |
| CLI | Device-code flow | `msal` (Python) |

## Common Entra ID Errors
| Error | Cause |
|---|---|
| `AADSTS9002326` | Redirect URI under Web platform instead of SPA |
| `AADSTS65001` | Admin consent not granted for `GroupMember.Read.All` |
| `AADSTS50105` | User not assigned to Enterprise Application |
| Graph 403 on `/memberOf` | Application permission not granted or missing admin consent |
