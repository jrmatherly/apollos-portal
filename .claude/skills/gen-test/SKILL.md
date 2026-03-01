---
name: gen-test
description: Generate a Vitest + React Testing Library test file for a frontend component. Scaffolds MSW handlers, MSAL mock, QueryClient wrapper, and basic test cases matching project conventions. Trigger phrases include "generate test", "add tests for", "scaffold test", "gen test".
compatibility: Designed for Apollos Portal frontend (Vitest 4 + React Testing Library 16 + MSW 2)
---

# Generate Frontend Component Test

Scaffold a test file for a React component following the project's established patterns.

## Arguments

The user provides the component file path (e.g., `src/components/Sidebar.tsx` or just `Sidebar`).

## Steps

### 1. Read the component

Read the target component file to understand:
- What props it accepts
- What hooks it uses (useQuery, useMutation, useAuth, useNavigate, etc.)
- What API endpoints it calls (look for hook imports from `../hooks/`)
- What user interactions it supports (buttons, forms, links)

### 2. Read the hook files

If the component uses custom hooks, read them to identify:
- The API endpoints being called (`api.get("/keys")`, `api.post("/provision")`, etc.)
- The response types (imported from `../types/api`)
- Query keys and mutation patterns

### 3. Scaffold the test file

Create `{component}.test.tsx` next to the component. Follow this structure:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/mocks/server";
import type { ResponseType } from "../types/api";

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

const { ComponentName } = await import("./ComponentName");
```

### 4. Pattern selection

Choose the right render pattern based on the component's needs:

**Uses React Router** (has `useNavigate`, `useParams`, `Link`):
```typescript
import { renderWithProviders } from "../test/render";
// Use renderWithProviders which wraps in MemoryRouter + QueryClientProvider
```

**No routing** (standalone component):
```typescript
function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComponentName />
    </QueryClientProvider>,
  );
}
```

### 5. Write test cases

Generate these test categories based on the component:

- **Renders correctly**: Basic render with default/happy-path data
- **Loading state**: If the component shows loading UI
- **Error state**: If the component handles API errors
- **User interactions**: Click handlers, form submissions
- **Conditional rendering**: Different states based on data

For MSW handlers, use `server.use()` to override default handlers per test:
```typescript
server.use(
  http.get("/api/v1/endpoint", () => HttpResponse.json(mockData)),
);
```

### 6. Lint check

Run `cd frontend && npx biome check src/components/{ComponentName}.test.tsx` to verify the test file passes linting.

## Conventions

- Use `vi.mock("../lib/msal")` — always mock MSAL at the top
- Use dynamic `await import()` after `vi.mock()` — required for module mock to take effect
- Use `{x ? <Y /> : null}` pattern, not `{x && <Y />}` (biome `noLeakedRender`)
- Use `String(value)` wrapper for non-JSX values in ternary alternates
- Import `server` from `../test/mocks/server` for MSW
- Default MSW handlers in `../test/mocks/handlers.ts` return empty/default data
- If the component uses `useAuth`, mock it: `vi.mock("../hooks/useAuth", () => ({ useAuth: () => ({ ... }) }))`

## Do not

- Do not import from `@testing-library/jest-dom` — it's auto-loaded via vitest setup
- Do not use `cleanup()` — vitest does this automatically
- Do not add snapshot tests — prefer explicit assertions
- Do not mock internal component state — test through user interactions
