import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockUseAuth, mockUseAuthUnauthenticated } from "../test/mocks/auth";

let currentMock = { ...mockUseAuth };

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => currentMock,
}));

const { ProtectedRoute } = await import("./ProtectedRoute");

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    currentMock = { ...mockUseAuth };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to login when unauthenticated", () => {
    currentMock = { ...mockUseAuthUnauthenticated };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("shows loading state while checking auth", () => {
    currentMock = { ...mockUseAuth, isLoading: true, isAuthenticated: false, user: null };

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
