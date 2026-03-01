// ---- Provision ----

export interface TeamProvisionDetail {
  team_id: string;
  team_alias: string;
  role: string;
}

export interface KeyDetail {
  key_id: string;
  litellm_key_id: string;
  key_alias: string;
  team_id: string;
  team_alias: string;
  portal_expires_at: string;
  key?: string | null;
}

export interface UserSummary {
  user_id: string;
  email: string;
  display_name: string;
  litellm_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProvisionStatusResponse {
  is_provisioned: boolean;
  user?: UserSummary | null;
  teams: TeamProvisionDetail[];
  keys: KeyDetail[];
}

export interface ProvisionResponse {
  user_id: string;
  litellm_user_id: string;
  teams_provisioned: TeamProvisionDetail[];
  keys_generated: KeyDetail[];
}

// ---- Keys ----

export interface KeyListItem {
  id: string;
  litellm_key_alias: string;
  team_id: string;
  team_alias: string;
  status: "active" | "expiring_soon" | "expired" | "revoked" | "rotated";
  portal_expires_at: string;
  created_at: string;
  last_spend: number | null;
  days_until_expiry: number | null;
}

export interface KeyListResponse {
  active: KeyListItem[];
  revoked: KeyListItem[];
}

export interface KeyCreateRequest {
  team_id: string;
}

export interface KeyCreateResponse {
  key_id: string;
  key: string;
  key_alias: string;
  team_alias: string;
  portal_expires_at: string;
}

export interface KeyRotateResponse {
  old_key_id: string;
  new_key_id: string;
  new_key: string;
  new_key_alias: string;
  portal_expires_at: string;
}

export interface KeyRevokeResponse {
  key_id: string;
  revoked_at: string;
}

// ---- Teams ----

export interface TeamSummary {
  team_id: string;
  team_alias: string;
  models: string[];
  max_budget: number;
  budget_duration: string;
  spend: number | null;
  member_count: number | null;
}

export interface TeamsResponse {
  teams: TeamSummary[];
}

// ---- Models ----

export interface ModelInfo {
  model_name: string;
  litellm_model_name: string | null;
  model_info: Record<string, unknown> | null;
  mode: string | null;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

// ---- Usage ----

export interface UsageDataPoint {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  spend: number;
  requests: number;
}

export interface UsageSummary {
  total_spend: number;
  total_tokens: number;
  total_requests: number;
}

export interface UsageResponse {
  data: UsageDataPoint[];
  summary: UsageSummary;
}

// ---- Settings ----

export interface UserSettingsResponse {
  default_key_duration_days: number;
  notify_14d: boolean;
  notify_7d: boolean;
  notify_3d: boolean;
  notify_1d: boolean;
}

export interface UserSettingsUpdate {
  default_key_duration_days?: number;
  notify_14d?: boolean;
  notify_7d?: boolean;
  notify_3d?: boolean;
  notify_1d?: boolean;
}

// ---- Dashboard ----

export interface DashboardSummary {
  active_keys: number;
  total_spend: number;
  total_budget: number;
  teams_count: number;
  next_expiry_key_alias: string | null;
  next_expiry_days: number | null;
}
