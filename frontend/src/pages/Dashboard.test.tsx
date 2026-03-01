import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";

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

// Mock recharts ResponsiveContainer — jsdom has no layout engine
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="chart-container">{children}</div>
    ),
  };
});

const { Dashboard } = await import("./Dashboard");

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dashboard", () => {
  it("renders page title", async () => {
    renderDashboard();
    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
  });

  it("shows active key count and team count", async () => {
    server.use(
      http.get("/api/v1/keys", () =>
        HttpResponse.json({
          active: [
            {
              id: "key-1",
              litellm_key_alias: "test-key",
              team_id: "team-1",
              team_alias: "Engineering",
              status: "active",
              portal_expires_at: "2026-06-01T00:00:00Z",
              created_at: "2026-01-01T00:00:00Z",
              last_spend: 10,
              days_until_expiry: 30,
            },
          ],
          revoked: [],
        }),
      ),
      http.get("/api/v1/teams", () =>
        HttpResponse.json({
          teams: [
            {
              team_id: "team-1",
              team_alias: "Engineering",
              models: [],
              max_budget: 500,
              budget_duration: "monthly",
              spend: 10,
              member_count: 3,
            },
          ],
        }),
      ),
      http.get("/api/v1/usage", () =>
        HttpResponse.json({
          data: [],
          summary: { total_spend: 10, total_tokens: 5000, total_requests: 50 },
        }),
      ),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument(); // active key count
    });
    expect(screen.getByText("Across 1 team")).toBeInTheDocument();
  });

  it("shows no usage data message when empty", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No usage data yet")).toBeInTheDocument();
    });
  });

  it("shows no expiring keys message when none are expiring", async () => {
    server.use(
      http.get("/api/v1/keys", () =>
        HttpResponse.json({ active: [], revoked: [] }),
      ),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No expiring keys")).toBeInTheDocument();
    });
  });

  it("displays the next expiring key", async () => {
    server.use(
      http.get("/api/v1/keys", () =>
        HttpResponse.json({
          active: [
            {
              id: "key-1",
              litellm_key_alias: "expiring-key",
              team_id: "team-1",
              team_alias: "Team",
              status: "expiring_soon",
              portal_expires_at: "2026-04-01T00:00:00Z",
              created_at: "2026-01-01T00:00:00Z",
              last_spend: null,
              days_until_expiry: 7,
            },
          ],
          revoked: [],
        }),
      ),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("7d")).toBeInTheDocument();
    });
    expect(screen.getByText("expiring-key")).toBeInTheDocument();
  });
});
