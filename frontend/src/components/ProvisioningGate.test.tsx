import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";
import type { ProvisionResponse, ProvisionStatusResponse } from "../types/api";

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

const provisionedStatus: ProvisionStatusResponse = {
  is_provisioned: true,
  teams: [],
  keys: [],
};

const unprovisionedStatus: ProvisionStatusResponse = {
  is_provisioned: false,
  teams: [],
  keys: [],
};

const provisionSuccess: ProvisionResponse = {
  user_id: "test-id",
  litellm_user_id: "litellm-id",
  teams_provisioned: [{ team_id: "team-1", team_alias: "Engineering", role: "user" }],
  keys_generated: [
    {
      key_id: "key-1",
      litellm_key_id: "ltl-key-1",
      key_alias: "engineering-key",
      team_id: "team-1",
      team_alias: "Engineering",
      portal_expires_at: "2026-06-01T00:00:00Z",
      key: "sk-test-abc123",
    },
  ],
};

const provisionSuccessNoKeys: ProvisionResponse = {
  user_id: "test-id",
  litellm_user_id: "litellm-id",
  teams_provisioned: [],
  keys_generated: [],
};

/** Advance fake timers through all provisioning steps + transition delay.
 * Each step fires a new setTimeout, so we advance incrementally with act() in between. */
async function advanceThroughSteps() {
  await act(async () => vi.advanceTimersByTime(1300));
  await act(async () => vi.advanceTimersByTime(1300));
  await act(async () => vi.advanceTimersByTime(1300));
  await act(async () => vi.advanceTimersByTime(1300));
  await act(async () => vi.advanceTimersByTime(1300));
  await act(async () => vi.advanceTimersByTime(1300));
}

describe("ProvisioningGate", () => {
  it("renders children when user is provisioned", async () => {
    server.use(http.get("/api/v1/status", () => HttpResponse.json(provisionedStatus)));

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    server.use(http.get("/api/v1/status", () => new HttpResponse(null, { status: 500 })));

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Failed to check provisioning status")).toBeInTheDocument();
    });
  });

  it("shows provisioning steps when user is not provisioned", async () => {
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccess)),
    );

    renderGate();
    await waitFor(() => {
      expect(screen.getByText("Setting up your account")).toBeInTheDocument();
    });
    expect(screen.getByText("Validating account")).toBeInTheDocument();
    expect(screen.getByText("Checking group memberships")).toBeInTheDocument();
    expect(screen.getByText("Provisioning for AI proxy")).toBeInTheDocument();
    expect(screen.getByText("Checking available models")).toBeInTheDocument();
    expect(screen.getByText("Generating initial API key")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("auto-triggers provisioning when unprovisioned", async () => {
    let provisionCalled = false;
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => {
        provisionCalled = true;
        return HttpResponse.json(provisionSuccess);
      }),
    );

    renderGate();

    await waitFor(() => {
      expect(provisionCalled).toBe(true);
    });
  });

  it("shows generated keys after provisioning completes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccess)),
    );

    renderGate();

    // Wait for provisioning steps to appear
    await waitFor(() => {
      expect(screen.getByText("Setting up your account")).toBeInTheDocument();
    });

    // Advance through all 5 step delays (600ms each) + transition delay (400ms)
    await advanceThroughSteps();

    // Should show key display
    await waitFor(
      () => {
        expect(screen.getByText("You're all set!")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.getByText("sk-test-abc123")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Continue to Portal")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders children after Continue to Portal click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccess)),
    );

    renderGate();

    // Advance through steps
    await advanceThroughSteps();

    await waitFor(
      () => {
        expect(screen.getByText("Continue to Portal")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Must copy key before Continue is enabled
    await user.click(screen.getByText("Copy"));

    await user.click(screen.getByText("Continue to Portal"));

    await waitFor(() => {
      expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("skips key display when no keys generated", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccessNoKeys)),
    );

    renderGate();

    await advanceThroughSteps();

    // Should skip key display and go straight to children
    await waitFor(
      () => {
        expect(screen.getByText("Dashboard content")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    vi.useRealTimers();
  });

  it("Continue button is disabled until keys are copied", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccess)),
    );

    renderGate();
    await advanceThroughSteps();

    await waitFor(
      () => {
        expect(screen.getByText("Continue to Portal")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Button should be disabled initially
    expect(screen.getByText("Continue to Portal").closest("button")).toBeDisabled();
    expect(screen.getByText("Copy or download your keys to continue")).toBeInTheDocument();

    // Copy the key
    await user.click(screen.getByText("Copy"));

    // Button should now be enabled
    expect(screen.getByText("Continue to Portal").closest("button")).not.toBeDisabled();
    expect(screen.queryByText("Copy or download your keys to continue")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("Download unlocks Continue button", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => HttpResponse.json(provisionSuccess)),
    );

    renderGate();
    await advanceThroughSteps();

    await waitFor(
      () => {
        expect(screen.getByText("Continue to Portal")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Button should be disabled initially
    expect(screen.getByText("Continue to Portal").closest("button")).toBeDisabled();

    // Click Download All Keys
    await user.click(screen.getByText("Download All Keys"));

    // Button should now be enabled
    expect(screen.getByText("Continue to Portal").closest("button")).not.toBeDisabled();

    vi.useRealTimers();
  });

  it("shows retry button on provision error", async () => {
    server.use(
      http.get("/api/v1/status", () => HttpResponse.json(unprovisionedStatus)),
      http.post("/api/v1/provision", () => new HttpResponse(null, { status: 500 })),
    );

    renderGate();

    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });
});
