import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";

// Mock the MSAL module before importing api
vi.mock("./msal", () => ({
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

// Import after mock setup
const { api, ApiError } = await import("./api");
const { msalInstance } = await import("./msal");

describe("ApiError", () => {
  it("creates error with status and message", () => {
    const error = new ApiError(404, "Not found");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
    expect(error.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const error = new ApiError(500, "Server error");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("get", () => {
    it("sends GET request with auth token", async () => {
      server.use(
        http.get("/api/v1/test", ({ request }) => {
          const auth = request.headers.get("Authorization");
          return HttpResponse.json({ auth });
        }),
      );

      const result = await api.get<{ auth: string }>("/test");
      expect(result.auth).toBe("Bearer test-access-token");
    });

    it("sends GET request without token when no active account", async () => {
      vi.mocked(msalInstance.getActiveAccount).mockReturnValueOnce(null);

      server.use(
        http.get("/api/v1/test", ({ request }) => {
          const auth = request.headers.get("Authorization");
          return HttpResponse.json({ auth });
        }),
      );

      const result = await api.get<{ auth: string | null }>("/test");
      expect(result.auth).toBeNull();
    });

    it("throws ApiError on non-ok response", async () => {
      server.use(
        http.get(
          "/api/v1/test",
          () => new HttpResponse("Not found", { status: 404 }),
        ),
      );

      await expect(api.get("/test")).rejects.toThrow(ApiError);
      await expect(api.get("/test")).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("post", () => {
    it("sends POST request with JSON body", async () => {
      server.use(
        http.post("/api/v1/test", async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ received: body });
        }),
      );

      const result = await api.post<{ received: { foo: string } }>("/test", {
        foo: "bar",
      });
      expect(result.received).toEqual({ foo: "bar" });
    });

    it("sends POST request without body", async () => {
      server.use(
        http.post("/api/v1/test", () => HttpResponse.json({ ok: true })),
      );

      const result = await api.post<{ ok: boolean }>("/test");
      expect(result.ok).toBe(true);
    });
  });

  describe("error handling", () => {
    it("throws ApiError with response body as message", async () => {
      server.use(
        http.get(
          "/api/v1/fail",
          () =>
            new HttpResponse('{"detail":"Forbidden"}', {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }),
        ),
      );

      try {
        await api.get("/fail");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as InstanceType<typeof ApiError>).status).toBe(403);
        expect((err as InstanceType<typeof ApiError>).message).toBe(
          '{"detail":"Forbidden"}',
        );
      }
    });
  });
});
