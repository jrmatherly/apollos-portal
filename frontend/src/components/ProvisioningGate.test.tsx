import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";
import type { ProvisionStatusResponse } from "../types/api";

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

const { ProvisioningGate } = await import("./ProvisioningGate");

function renderGate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProvisioningGate>
        <div>Dashboard content</div>
      </ProvisioningGate>
    </QueryClientProvider>,
  );
}

describe("ProvisioningGate", () => {
  it("renders children when user is provisioned", async () => {
    const provisioned: ProvisionStatusResponse = {
      is_provisioned: true,
      teams: [],
      keys: [],
    };
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(provisioned)),
    );

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });
  });

  it("shows provisioning prompt when user is not provisioned", async () => {
    const unprovisioned: ProvisionStatusResponse = {
      is_provisioned: false,
      teams: [],
      keys: [],
    };
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisioned)),
    );

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Welcome to Apollos AI")).toBeInTheDocument();
    });
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    server.use(
      http.get("/api/v1/status", () => new HttpResponse(null, { status: 500 })),
    );

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Failed to check provisioning status")).toBeInTheDocument();
    });
  });

  it("calls provision mutation on Get Started click", async () => {
    const user = userEvent.setup();
    const unprovisioned: ProvisionStatusResponse = {
      is_provisioned: false,
      teams: [],
      keys: [],
    };

    let provisionCalled = false;
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisioned)),
      http.post("/api/v1/provision", () => {
        provisionCalled = true;
        return HttpResponse.json({
          user_id: "test-id",
          litellm_user_id: "litellm-id",
          teams_provisioned: [],
          keys_generated: [],
        });
      }),
    );

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Get Started")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Get Started"));

    await waitFor(() => {
      expect(provisionCalled).toBe(true);
    });
  });
});
