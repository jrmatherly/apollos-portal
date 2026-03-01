import { vi } from "vitest";
import { mockAccount } from "./msal";

/**
 * Default authenticated state for useAuth mock.
 * Override per-test by spreading and replacing fields.
 *
 * Usage in test files:
 *   vi.mock("../contexts/AuthContext", () => ({
 *     useAuth: () => mockUseAuth,
 *     AuthProvider: ({ children }: { children: React.ReactNode }) => children,
 *   }));
 */
export const mockUseAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: mockAccount,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  getAccessToken: vi.fn().mockResolvedValue("test-access-token"),
  error: null,
};

/** Unauthenticated variant for login/redirect tests. */
export const mockUseAuthUnauthenticated = {
  ...mockUseAuth,
  isAuthenticated: false,
  user: null,
  getAccessToken: vi.fn().mockRejectedValue(new Error("No active account")),
};
