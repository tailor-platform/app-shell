import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { WithGuard, type WithGuardComponentGuard } from "./with-guard";
import {
  AppShellDataContext,
  AppShellConfigContext,
  type RootConfiguration,
} from "@/contexts/appshell-context";
import { pass, hidden, redirectTo } from "@/resource";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";

afterEach(() => {
  cleanup();
});

type TestContextData = {
  currentUser: {
    id: string;
    role: "admin" | "user";
  };
};

const testConfig: RootConfiguration = {
  modules: [],
  settingsResources: [],
  locale: "en",
  errorBoundary: <DefaultErrorBoundary />,
};

/**
 * Wrapper to render WithGuard with required providers.
 */
const renderWithProviders = (
  ui: React.ReactNode,
  contextData: TestContextData,
) => {
  return render(
    <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
      <AppShellDataContext.Provider value={{ contextData }}>
        {ui}
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>,
  );
};

describe("WithGuard", () => {
  describe("synchronous guards", () => {
    it("renders children when guard passes", async () => {
      const alwaysPass: WithGuardComponentGuard = () => pass();

      renderWithProviders(
        <WithGuard guards={[alwaysPass]}>
          <div>Protected Content</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeDefined();
      });
    });

    it("renders fallback when guard returns hidden", async () => {
      const alwaysHidden: WithGuardComponentGuard = () => hidden();

      renderWithProviders(
        <WithGuard guards={[alwaysHidden]} fallback={<div>Access Denied</div>}>
          <div>Protected Content</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Access Denied")).toBeDefined();
        expect(screen.queryByText("Protected Content")).toBeNull();
      });
    });

    it("renders nothing when guard returns hidden and no fallback provided", async () => {
      const alwaysHidden: WithGuardComponentGuard = () => hidden();

      const { container } = renderWithProviders(
        <WithGuard guards={[alwaysHidden]}>
          <div>Protected Content</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.queryByText("Protected Content")).toBeNull();
        expect(container.innerHTML).toBe("");
      });
    });

    it("evaluates contextData in guard", async () => {
      const isAdmin: WithGuardComponentGuard = ({ context }) => {
        const ctx = context as TestContextData;
        return ctx.currentUser.role === "admin" ? pass() : hidden();
      };

      // Admin user
      renderWithProviders(
        <WithGuard guards={[isAdmin]}>
          <div>Admin Panel</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "admin" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeDefined();
      });

      // Non-admin user
      cleanup();
      renderWithProviders(
        <WithGuard guards={[isAdmin]} fallback={<div>Not authorized</div>}>
          <div>Admin Panel</div>
        </WithGuard>,
        { currentUser: { id: "2", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Not authorized")).toBeDefined();
        expect(screen.queryByText("Admin Panel")).toBeNull();
      });
    });

    it("stops on first non-pass guard", async () => {
      const guard1: WithGuardComponentGuard = () => pass();
      const guard2: WithGuardComponentGuard = () => hidden();
      const guard3: WithGuardComponentGuard = () => pass();

      renderWithProviders(
        <WithGuard
          guards={[guard1, guard2, guard3]}
          fallback={<div>Blocked</div>}
        >
          <div>Protected Content</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Blocked")).toBeDefined();
        expect(screen.queryByText("Protected Content")).toBeNull();
      });
    });
  });

  describe("asynchronous guards", () => {
    it("renders children when async guard passes", async () => {
      const asyncPass: WithGuardComponentGuard = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return pass();
      };

      renderWithProviders(
        <WithGuard guards={[asyncPass]}>
          <div>Async Protected</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Async Protected")).toBeDefined();
      });
    });

    it("renders fallback when async guard returns hidden", async () => {
      const asyncHidden: WithGuardComponentGuard = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return hidden();
      };

      renderWithProviders(
        <WithGuard guards={[asyncHidden]} fallback={<div>Async Denied</div>}>
          <div>Async Protected</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Async Denied")).toBeDefined();
        expect(screen.queryByText("Async Protected")).toBeNull();
      });
    });

    it("shows loading state while evaluating async guards", async () => {
      let resolveGuard: () => void;
      const slowGuard: WithGuardComponentGuard = () =>
        new Promise((resolve) => {
          resolveGuard = () => resolve(pass());
        });

      renderWithProviders(
        <WithGuard guards={[slowGuard]} loading={<div>Loading...</div>}>
          <div>Content</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      // Should show loading immediately
      expect(screen.getByText("Loading...")).toBeDefined();
      expect(screen.queryByText("Content")).toBeNull();

      // Resolve the guard
      resolveGuard!();

      await waitFor(() => {
        expect(screen.getByText("Content")).toBeDefined();
        expect(screen.queryByText("Loading...")).toBeNull();
      });
    });
  });

  describe("curried guards (parameterized)", () => {
    it("works with curried guard functions", async () => {
      const isOwner =
        (resourceId: string): WithGuardComponentGuard =>
        ({ context }) => {
          const ctx = context as TestContextData;
          return resourceId === ctx.currentUser.id ? pass() : hidden();
        };

      // Owner
      renderWithProviders(
        <WithGuard guards={[isOwner("user-123")]}>
          <div>Edit Button</div>
        </WithGuard>,
        { currentUser: { id: "user-123", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Edit Button")).toBeDefined();
      });

      // Non-owner
      cleanup();
      renderWithProviders(
        <WithGuard guards={[isOwner("user-456")]} fallback={<div>Hidden</div>}>
          <div>Edit Button</div>
        </WithGuard>,
        { currentUser: { id: "user-123", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Hidden")).toBeDefined();
        expect(screen.queryByText("Edit Button")).toBeNull();
      });
    });
  });

  describe("redirectTo handling", () => {
    it("treats redirectTo as hidden (renders fallback)", async () => {
      const redirectGuard: WithGuardComponentGuard = () => redirectTo("/login");

      renderWithProviders(
        <WithGuard guards={[redirectGuard]} fallback={<div>Redirecting...</div>}>
          <div>Protected</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        // redirectTo in component context just renders fallback
        expect(screen.getByText("Redirecting...")).toBeDefined();
        expect(screen.queryByText("Protected")).toBeNull();
      });
    });
  });

  describe("empty guards", () => {
    it("renders children when guards array is empty", async () => {
      renderWithProviders(
        <WithGuard guards={[]}>
          <div>Always Visible</div>
        </WithGuard>,
        { currentUser: { id: "1", role: "user" } },
      );

      await waitFor(() => {
        expect(screen.getByText("Always Visible")).toBeDefined();
      });
    });
  });
});
