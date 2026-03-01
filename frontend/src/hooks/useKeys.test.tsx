import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";
import type { KeyListResponse } from "../types/api";

// Mock MSAL so the api client can acquire tokens
vi.mock("../lib/msal", () => ({
  msalInstance: {
    getActiveAccount: vi.fn().mockReturnValue({
      username: "testuser@contoso.com",
      homeAccountId: "test-home-id",
    }),
    acquireTokenSilent: vi.fn().mockResolvedValue({
      accessToken: "test-access-token",
    }),
    acquireTokenRedirect: vi.fn().mockResolvedValue(undefined),
  },
  loginRequest: { scopes: ["User.Read"] },
}));

const { useKeys } = await import("./useKeys");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useKeys", () => {
  it("returns key list on success", async () => {
    const mockResponse: KeyListResponse = {
      active: [
        {
          id: "key-1",
          litellm_key_alias: "test-key",
          team_id: "team-1",
          team_alias: "Test Team",
          status: "active",
          portal_expires_at: "2026-06-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          last_spend: 1.5,
          days_until_expiry: 90,
        },
      ],
      revoked: [],
    };

    server.use(http.get("/api/v1/keys", () => HttpResponse.json(mockResponse)));

    const { result } = renderHook(() => useKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.active).toHaveLength(1);
    expect(result.current.data?.active[0].litellm_key_alias).toBe("test-key");
    expect(result.current.data?.revoked).toHaveLength(0);
  });

  it("handles loading state", () => {
    const { result } = renderHook(() => useKeys(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it("handles error state", async () => {
    server.use(
      http.get(
        "/api/v1/keys",
        () => new HttpResponse("Server error", { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
