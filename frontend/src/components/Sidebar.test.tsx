import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockUseAuth } from "../test/mocks/auth";
import { Sidebar } from "./Sidebar";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth,
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("renders the Apollos AI brand", () => {
    renderSidebar();
    expect(screen.getByText("Apollos AI")).toBeInTheDocument();
    expect(screen.getByText("Self-Service Portal")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    renderSidebar();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("displays user name and email", () => {
    renderSidebar();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("testuser@contoso.com")).toBeInTheDocument();
  });

  it("displays user initials", () => {
    renderSidebar();
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("calls logout on sign-out button click", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByLabelText("Sign out"));
    expect(mockUseAuth.logout).toHaveBeenCalledOnce();
  });
});
