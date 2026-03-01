import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";
import type { KeyListResponse } from "../types/api";

// Mock MSAL so api client works
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

const { ApiKeys } = await import("./ApiKeys");

function renderApiKeys() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ApiKeys />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ApiKeys", () => {
  it("renders page title", async () => {
    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("API Keys")).toBeInTheDocument();
    });
  });

  it("shows empty state when no keys exist", async () => {
    server.use(
      http.get("/api/v1/keys", () =>
        HttpResponse.json({
          active: [],
          revoked: [],
        } satisfies KeyListResponse),
      ),
    );

    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("No active keys")).toBeInTheDocument();
    });
  });

  it("renders key data in a table", async () => {
    const response: KeyListResponse = {
      active: [
        {
          id: "key-1",
          litellm_key_alias: "eng-production-key",
          team_id: "team-1",
          team_alias: "Engineering",
          status: "active",
          portal_expires_at: "2026-06-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          last_spend: 42.5,
          days_until_expiry: 90,
        },
      ],
      revoked: [],
    };

    server.use(http.get("/api/v1/keys", () => HttpResponse.json(response)));

    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("eng-production-key")).toBeInTheDocument();
    });
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("$42.50")).toBeInTheDocument();
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

  it("renders rotate and revoke action buttons", async () => {
    const response: KeyListResponse = {
      active: [
        {
          id: "key-1",
          litellm_key_alias: "test-key",
          team_id: "team-1",
          team_alias: "Team",
          status: "active",
          portal_expires_at: "2026-06-01T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          last_spend: null,
          days_until_expiry: 30,
        },
      ],
      revoked: [],
    };

    server.use(http.get("/api/v1/keys", () => HttpResponse.json(response)));

    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("Rotate")).toBeInTheDocument();
    });
    expect(screen.getByText("Revoke")).toBeInTheDocument();
  });

  it("shows revoked keys section when revoked keys exist", async () => {
    const response: KeyListResponse = {
      active: [],
      revoked: [
        {
          id: "key-2",
          litellm_key_alias: "old-key",
          team_id: "team-1",
          team_alias: "Team",
          status: "revoked",
          portal_expires_at: "2026-01-01T00:00:00Z",
          created_at: "2025-07-01T00:00:00Z",
          last_spend: null,
          days_until_expiry: null,
        },
      ],
    };

    server.use(http.get("/api/v1/keys", () => HttpResponse.json(response)));

    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("Revoked Keys History")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    server.use(http.get("/api/v1/keys", () => new HttpResponse(null, { status: 500 })));

    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText("Failed to load API keys")).toBeInTheDocument();
    });
  });
});
