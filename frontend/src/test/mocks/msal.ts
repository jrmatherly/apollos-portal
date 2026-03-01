import { vi } from "vitest";

export const mockAccount = {
  username: "testuser@contoso.com",
  homeAccountId: "test-home-id",
  localAccountId: "test-local-id",
  environment: "login.microsoftonline.com",
  tenantId: "test-tenant-id",
  name: "Test User",
};

export const mockMsalInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  handleRedirectPromise: vi.fn().mockResolvedValue(null),
  acquireTokenSilent: vi.fn().mockResolvedValue({
    accessToken: "test-access-token",
    account: mockAccount,
  }),
  acquireTokenRedirect: vi.fn().mockResolvedValue(undefined),
  getActiveAccount: vi.fn().mockReturnValue(mockAccount),
  setActiveAccount: vi.fn(),
  getAllAccounts: vi.fn().mockReturnValue([mockAccount]),
  loginRedirect: vi.fn().mockResolvedValue(undefined),
  logoutRedirect: vi.fn().mockResolvedValue(undefined),
};
