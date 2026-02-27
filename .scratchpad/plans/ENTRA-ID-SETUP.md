# Entra ID Setup Guide — LiteLLM Self-Service Portal

**Created:** 2026-02-27
**Author:** Bot42
**Prerequisites:** Global Administrator or Application Administrator role in Entra ID

---

## Overview

The portal requires **two** App Registrations in Entra ID:

1. **Portal App** — authenticates end users, reads group memberships (this doc)
2. **LiteLLM App** — if you want SSO for the ≤5 admin users on LiteLLM's native UI (separate, optional — not covered here)

Additionally, you need:
- Security groups that map to LiteLLM teams
- An App Role for portal administrators
- API permissions for Microsoft Graph (group membership reads)

---

## Step 1: Create the App Registration

1. Navigate to [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**

2. Configure:

   | Field | Value |
   |---|---|
   | **Name** | `LiteLLM Self-Service Portal` (or your preferred name) |
   | **Supported account types** | `Accounts in this organizational directory only` (single tenant) |
   | **Redirect URI (Web)** | `http://localhost:3000/auth/callback` (dev — add production URL later) |

3. Click **Register**

4. Note these values (needed for portal `.env`):

   | Value | Environment Variable |
   |---|---|
   | **Application (client) ID** | `AZURE_CLIENT_ID` |
   | **Directory (tenant) ID** | `AZURE_TENANT_ID` |

---

## Step 2: Create a Client Secret

1. In your App Registration → **Certificates & secrets** → **Client secrets** → **New client secret**

2. Configure:

   | Field | Value |
   |---|---|
   | **Description** | `litellm-portal-backend` |
   | **Expires** | `24 months` (set a calendar reminder to rotate) |

3. **Copy the secret value immediately** — it's only shown once

4. Store as `AZURE_CLIENT_SECRET` in your portal `.env` (or Key Vault)

---

## Step 3: Configure API Permissions

The portal needs to read user profiles and group memberships via Microsoft Graph. **We always use Graph API calls for group resolution** — the JWT `groups` claim has a 200-group limit and silently switches to an overage indicator for users in many groups, which is unreliable at enterprise scale.

1. In your App Registration → **API permissions** → **Add a permission** → **Microsoft Graph**

2. Select **Delegated permissions** and add:

   | Permission | Purpose |
   |---|---|
   | `User.Read` | Read signed-in user's profile (name, email, OID) |

3. Now add **Application permissions** (not delegated):

   | Permission | Purpose |
   |---|---|
   | `GroupMember.Read.All` | Read group memberships for any user (backend service call) |

   > **Why Application permission instead of Delegated?** Delegated `GroupMember.Read.All` uses the on-behalf-of (OBO) flow, which adds complexity and requires the user's token to have the scope. Application permission lets the backend call Graph API directly using its own credentials (client credentials flow), which is simpler, more reliable, and works even when the user's token has expired.

4. Click **Add permissions**

5. Click **Grant admin consent for [your tenant]** — required for both `GroupMember.Read.All` (Application) and to suppress user consent prompts

6. Verify the status column shows **Granted for [your tenant]** for all permissions.

### Permissions Summary

| Permission | Type | Admin Consent | Purpose |
|---|---|---|---|
| `User.Read` | Delegated | Not required | User profile (name, email) |
| `GroupMember.Read.All` | **Application** | **Required** | Group memberships → team mapping (server-to-server) |

> **Why not the JWT `groups` claim?** Enterprise users are commonly members of 200+ security groups (nested groups, distribution lists, dynamic groups, etc.). When the group count exceeds 200, Entra ID replaces the `groups` array with a `_claim_sources` overage indicator — the claim silently stops working. Rather than building two code paths (claim + Graph API fallback), the portal uses Graph API exclusively. This is the only reliable approach at scale.

---

## Step 4: Configure Authentication Settings

1. In your App Registration → **Authentication**

2. Under **Web** → **Redirect URIs**, ensure these are listed:
   ```
   http://localhost:3000/auth/callback          (development)
   https://ai-portal.company.com/auth/callback  (production — add when ready)
   ```

3. Under **Front-channel logout URL**:
   ```
   https://ai-portal.company.com/auth/logout    (optional)
   ```

4. Under **Implicit grant and hybrid flows**:
   - ☐ Access tokens — **unchecked** (we use auth code + PKCE, not implicit)
   - ☐ ID tokens — **unchecked**

5. Under **Advanced settings**:
   - **Allow public client flows** → **Yes**
     > Required for the CLI's MSAL device-code flow. If you don't plan to use the CLI, leave this as No.

6. Click **Save**

---

## Step 5: Create App Roles

App Roles let you control who is a portal administrator vs. a regular user.

1. In your App Registration → **App roles** → **Create app role**

2. Create the admin role:

   | Field | Value |
   |---|---|
   | **Display name** | `Portal Administrator` |
   | **Allowed member types** | `Users/Groups` |
   | **Value** | `portal_admin` |
   | **Description** | `Full administrative access to the LiteLLM provisioning portal` |
   | **Enable this app role** | ☑ Checked |

3. Click **Apply**

4. (Optional) Create additional roles if needed later:

   | Value | Purpose |
   |---|---|
   | `portal_admin` | Admin: view all users/keys, deprovision, audit log |
   | `portal_user` | Standard user (default — no explicit role needed, group membership is sufficient) |

---

## Step 6: ~~Configure Token Claims~~ — SKIPPED

> **Not used.** The JWT `groups` claim has a hard 200-group limit. Enterprise users commonly exceed this — Entra ID silently replaces the groups array with a `_claim_sources` overage indicator, breaking any code that reads `groups` from the token. The portal uses Microsoft Graph API exclusively for group resolution (via Application permission `GroupMember.Read.All`). No token claim configuration needed.

---

## Step 7: Create the Enterprise Application & Assign Groups

The App Registration creates a corresponding Enterprise Application. This is where you assign users and groups.

1. Navigate to **Microsoft Entra ID** → **Enterprise applications** → find `LiteLLM Self-Service Portal`

2. Go to **Users and groups** → **Add user/group**

3. **Assign the security groups** that should have portal access:

   | Group | Role | Purpose |
   |---|---|---|
   | `SG-AI-Platform-Users` | `User` (default) | All users who can access the portal |
   | `SG-AI-Platform-Admins` | `Portal Administrator` | Portal admins (maps to `portal_admin` role) |
   | `SG-AI-Engineering-Team` | `User` | Maps to Engineering AI Team in LiteLLM |
   | `SG-AI-DataScience-Team` | `User` | Maps to Data Science Team in LiteLLM |

   > **The group assignment here controls who can sign into the portal.** The group-to-team mapping (which team they get provisioned into) is configured in the portal's `teams.yaml`.

4. (Optional) Under **Properties**, set **Assignment required?** → **Yes**
   > This prevents users NOT assigned to the Enterprise App from signing in. Recommended for controlled rollout.

---

## Step 8: Create Security Groups for LiteLLM Teams

If the security groups don't already exist, create them:

1. Navigate to **Microsoft Entra ID** → **Groups** → **New group**

2. For each LiteLLM team:

   | Field | Value |
   |---|---|
   | **Group type** | Security |
   | **Group name** | `SG-AI-Engineering-Team` (your naming convention) |
   | **Group description** | `Members provisioned into the Engineering AI Team on LiteLLM` |
   | **Membership type** | Assigned (or Dynamic if you want auto-membership based on attributes) |

3. Add members to the group

4. Note the **Object ID** of each group — these go into the portal's `teams.yaml`:
   ```yaml
   teams:
     - entra_group_id: "<Object ID from Azure>"
       team_alias: "Engineering AI Team"
       models: ["gpt-4o", "gpt-4o-mini"]
       # ...
   ```

5. **Don't forget:** Also assign each group to the Enterprise Application (Step 7) so members can sign in.

---

## Step 9: Gate Group (Optional but Recommended)

Create a single "gate" security group that controls who can access the portal at all, separate from the team-specific groups:

| Group | Purpose |
|---|---|
| `SG-AI-Platform-Users` | Must be a member to access the portal (gate group) |
| `SG-AI-Engineering-Team` | Determines which LiteLLM team the user is provisioned into |

A user must be in the gate group AND at least one team group. This lets you:
- Add someone to `SG-AI-Platform-Users` without immediately assigning a team (they can sign in but won't provision until added to a team group)
- Remove someone from `SG-AI-Platform-Users` to block all portal access without touching team groups

Configure in `teams.yaml`:
```yaml
required_groups:
  - "<Object ID of SG-AI-Platform-Users>"
```

---

## Step 10: Verify Configuration

### Checklist

- [ ] App Registration created with correct redirect URIs
- [ ] Client secret generated and stored securely
- [ ] **Delegated** permission: `User.Read` — admin consent granted
- [ ] **Application** permission: `GroupMember.Read.All` — admin consent granted
- [ ] Public client flows enabled (if CLI is needed)
- [ ] App Role `portal_admin` created
- [ ] Enterprise Application: **Assignment required** = Yes
- [ ] Security groups created for each LiteLLM team
- [ ] Gate group created (`SG-AI-Platform-Users` or equivalent)
- [ ] All groups assigned to the Enterprise Application
- [ ] Admin group assigned with `Portal Administrator` role
- [ ] At least one test user in gate group + one team group

### Test the Auth Flow

Before writing any portal code, verify the Entra ID setup works:

```bash
# ============================================================
# Test 1: User auth via device-code flow (simulates CLI login)
# ============================================================

# 1a. Request device code
curl -X POST "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/devicecode" \
  -d "client_id=<client-id>" \
  -d "scope=openid profile email User.Read"

# 1b. Follow the instructions (visit https://microsoft.com/devicelogin, enter code)

# 1c. Poll for the token
curl -X POST "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
  -d "client_id=<client-id>" \
  -d "grant_type=urn:ietf:params:oauth:grant_type:device_code" \
  -d "device_code=<device_code_from_step_1a>"

# 1d. Decode the ID token at https://jwt.ms — verify:
#    - "oid" is present (user Object ID)
#    - "preferred_username" has the email
#    - "name" has the display name
#    - "roles" contains "portal_admin" (if the user has that role)
#    NOTE: "groups" will NOT be in the token — this is expected (we use Graph API)

# ============================================================
# Test 2: Backend Graph API call (client credentials — app-only)
# This is how the portal backend reads group memberships.
# ============================================================

# 2a. Get an app-only token via client credentials
curl -X POST "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \
  -d "client_id=<client-id>" \
  -d "client_secret=<client-secret>" \
  -d "scope=https://graph.microsoft.com/.default" \
  -d "grant_type=client_credentials"

# 2b. List group memberships for a specific user (by their Entra OID)
#     This is the exact call the portal backend makes.
curl -H "Authorization: Bearer <app_token_from_2a>" \
  "https://graph.microsoft.com/v1.0/users/<user-oid>/memberOf/microsoft.graph.group?\$select=id,displayName&\$top=999"

# Expected: JSON array of ALL groups the user is in (no 200-group limit)
# Filter the response against your teams.yaml entra_group_ids to find matching teams

# 2c. (Optional) Check a specific group membership directly
curl -H "Authorization: Bearer <app_token_from_2a>" \
  "https://graph.microsoft.com/v1.0/groups/<entra-group-id>/members?\$select=id,displayName,userPrincipalName&\$top=999"
```

### Graph API Pagination

**The portal backend must handle pagination.** Graph API returns a maximum of 100 results per page by default (up to 999 with `$top`). For users in many groups, the response may include an `@odata.nextLink` URL:

```json
{
  "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/<oid>/memberOf?$skiptoken=...",
  "value": [ ... ]
}
```

The portal must follow `@odata.nextLink` until it's absent to get the complete group list. The `msgraph-sdk-python` handles this automatically with its page iterator.

---

## Environment Variables (Portal)

After completing the setup, these values go into the portal's `.env`:

```bash
AZURE_TENANT_ID=<Directory (tenant) ID from Step 1>
AZURE_CLIENT_ID=<Application (client) ID from Step 1>
AZURE_CLIENT_SECRET=<Client secret value from Step 2>
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
PORTAL_ADMIN_ROLE=portal_admin
```

---

## Ongoing Maintenance

| Task | Frequency | Details |
|---|---|---|
| Rotate client secret | Before expiry (24 months) | Create new secret → update portal `.env` → delete old secret. Set a reminder. |
| Review group memberships | As needed | Add/remove users from security groups as team assignments change. Portal picks up changes on next login or deprovisioning cron. |
| Review admin role assignments | Quarterly | Audit who has `Portal Administrator` role in the Enterprise Application. |
| Monitor consent status | After Entra ID policy changes | If conditional access policies change, verify admin consent is still granted for `GroupMember.Read.All`. |

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `AADSTS65001: The user or admin has not consented` | Admin consent not granted for `GroupMember.Read.All` | Go to API permissions → Grant admin consent |
| `AADSTS700016: Application not found in tenant` | Wrong `AZURE_CLIENT_ID` or `AZURE_TENANT_ID` | Verify values match App Registration |
| `AADSTS50105: The signed in user is not assigned to a role` | User not assigned to Enterprise Application | Add user/group to Enterprise App (Step 7) |
| Graph API returns 403 for `/users/{oid}/memberOf` | Application permission `GroupMember.Read.All` not granted or missing admin consent | API permissions → Grant admin consent |
| Graph API returns partial group list | Pagination not followed — `@odata.nextLink` present but ignored | Backend must follow all `@odata.nextLink` pages |
| `roles` claim missing | User not assigned an App Role | Check Enterprise App → Users and groups → Role column |
| Device-code flow fails | Public client flows not enabled | Step 4 → Allow public client flows → Yes |
| `redirect_uri` mismatch | URI in request doesn't match App Registration | Check Authentication → Redirect URIs (exact match, including trailing slash) |
