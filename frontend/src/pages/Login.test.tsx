import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockUseAuth, mockUseAuthUnauthenticated } from "../test/mocks/auth";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Navigate: (props: { to: string }) => {
      mockNavigate(props.to);
      return null;
    },
  };
});

let currentMock = { ...mockUseAuthUnauthenticated };

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => currentMock,
}));

const { Login } = await import("./Login");

describe("Login", () => {
  it("shows sign-in button when unauthenticated", () => {
    currentMock = { ...mockUseAuthUnauthenticated };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in with Microsoft")).toBeInTheDocument();
    expect(screen.getByText("Apollos AI")).toBeInTheDocument();
  });

  it("calls login when sign-in button is clicked", async () => {
    const user = userEvent.setup();
    const loginFn = vi.fn();
    currentMock = { ...mockUseAuthUnauthenticated, login: loginFn };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Sign in with Microsoft"));
    expect(loginFn).toHaveBeenCalledOnce();
  });

  it("redirects to home when already authenticated", () => {
    currentMock = { ...mockUseAuth };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("shows loading state", () => {
    currentMock = { ...mockUseAuthUnauthenticated, isLoading: true };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays error message", () => {
    currentMock = { ...mockUseAuthUnauthenticated, error: "Login failed" };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Login failed")).toBeInTheDocument();
  });
});
