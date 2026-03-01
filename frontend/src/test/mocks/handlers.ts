import { http, HttpResponse } from "msw";
import type {
  DashboardSummary,
  KeyListResponse,
  ModelsResponse,
  ProvisionStatusResponse,
  TeamsResponse,
  UsageResponse,
  UserSettingsResponse,
} from "../../types/api";

/** Default MSW handlers for common API endpoints.
 *  The API client prepends "/api/v1" to all paths, so handlers must match full URLs. */
export const handlers = [
  http.get<never, never, KeyListResponse>("/api/v1/keys", () =>
    HttpResponse.json({ active: [], revoked: [] }),
  ),

  http.get<never, never, ProvisionStatusResponse>("/api/v1/status", () =>
    HttpResponse.json({
      is_provisioned: true,
      user: {
        user_id: "test-user-id",
        email: "testuser@contoso.com",
        display_name: "Test User",
        litellm_user_id: "litellm-test-id",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      teams: [],
      keys: [],
    }),
  ),

  http.get<never, never, UsageResponse>("/api/v1/usage", () =>
    HttpResponse.json({
      data: [],
      summary: { total_spend: 0, total_tokens: 0, total_requests: 0 },
    }),
  ),

  http.get<never, never, ModelsResponse>("/api/v1/models", () =>
    HttpResponse.json({ models: [] }),
  ),

  http.get<never, never, TeamsResponse>("/api/v1/teams", () =>
    HttpResponse.json({ teams: [] }),
  ),

  http.get<never, never, UserSettingsResponse>("/api/v1/settings", () =>
    HttpResponse.json({
      default_key_duration_days: 90,
      notify_14d: true,
      notify_7d: true,
      notify_3d: true,
      notify_1d: true,
    }),
  ),

  http.get<never, never, DashboardSummary>("/api/v1/dashboard", () =>
    HttpResponse.json({
      active_keys: 0,
      total_spend: 0,
      total_budget: 100,
      teams_count: 0,
      next_expiry_key_alias: null,
      next_expiry_days: null,
    }),
  ),
];
