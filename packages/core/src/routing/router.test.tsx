import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterContainer } from "./router";
import { AppShellConfigContext, AppShellDataContext } from "@/contexts/appshell-context";
import * as ReactRouter from "react-router";
import { Link, Outlet, useNavigate } from "react-router";
import {
  defineModule,
  defineResource,
  redirectTo,
  setContextData,
  type Module,
  type Resource,
} from "@/resource";
import type { ReactNode } from "react";
import type { ContextData } from "@/contexts/appshell-context";
import { AuthProvider, type EnhancedAuthClient } from "@/contexts/auth-context";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

const renderWithConfig = ({
  modules: inputModules = [],
  basePath,
  locale = "en",
  rootComponent,
  initialEntries,
  contextData = {},
  authClient,
  autoLogin,
  guardComponent,
}: {
  modules?: Array<Module>;
  basePath?: string;
  locale?: string;
  rootComponent?: () => ReactNode;
  initialEntries: Array<string>;
  contextData?: ContextData;
  authClient?: EnhancedAuthClient;
  autoLogin?: boolean;
  guardComponent?: () => React.ReactNode;
}) => {
  // Convert rootComponent into a root module (path="") so the test mirrors
  // how AppShell now consolidates root handling before passing to RouterContainer.
  const modules = rootComponent
    ? [
        defineModule({
          path: "",
          meta: { title: "Home" },
          component: () => rootComponent(),
          resources: [],
        }),
        ...inputModules,
      ]
    : inputModules;

  const configurations = {
    modules,
    settingsResources: [] as Array<Resource>,
    basePath,
    errorBoundary: undefined,
    locale,
  };

  setContextData(contextData);

  const tree = (
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData }}>
        <RouterContainer memory initialEntries={initialEntries}>
          <Outlet />
        </RouterContainer>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>
  );

  return render(
    authClient ? (
      <AuthProvider client={authClient} autoLogin={autoLogin} guardComponent={guardComponent}>
        {tree}
      </AuthProvider>
    ) : (
      tree
    ),
  );
};

describe("RouterContainer (memory)", () => {
  it("respects basename for the root route", async () => {
    renderWithConfig({
      modules: [],
      basePath: "console",
      rootComponent: () => <div>Console Home</div>,
      initialEntries: ["/console"],
    });

    const element = await screen.findByText("Console Home");
    expect(element.textContent).toContain("Console Home");
  });

  it("resolves nested module routes under the basename", async () => {
    renderWithConfig({
      modules: [
        defineModule({
          path: "dashboard",
          component: () => <div>Dashboard Module</div>,
          meta: {
            title: "Dashboard",
          },
          resources: [],
        }),
      ],
      basePath: "console",
      initialEntries: ["/console/dashboard"],
    });

    const element = await screen.findByText("Dashboard Module");
    expect(element.textContent).toContain("Dashboard Module");
  });

  it("navigates between routes using Link", async () => {
    const analyticsResource = defineResource({
      path: "analytics",
      component: () => <div>Analytics Resource</div>,
      meta: {
        title: "Analytics",
      },
    });

    const dashboardModule = defineModule({
      path: "dashboard",
      component: () => (
        <div>
          <h1>Dashboard Module</h1>
          <Link to="analytics">Go to Analytics</Link>
        </div>
      ),
      meta: {
        title: "Dashboard",
      },
      resources: [analyticsResource],
    });

    renderWithConfig({
      modules: [dashboardModule],
      basePath: "console",
      initialEntries: ["/console/dashboard"],
    });

    const link = await screen.findByRole("link", { name: "Go to Analytics" });
    fireEvent.click(link);

    const resource = await screen.findByText("Analytics Resource");
    expect(resource.textContent).toContain("Analytics Resource");
  });

  it("navigates using useNavigate hook", async () => {
    const reportsResource = defineResource({
      path: "reports",
      component: () => <div>Reports Resource</div>,
      meta: {
        title: "Reports",
      },
    });

    const navigationModule = defineModule({
      path: "dashboard",
      component: () => {
        const navigate = useNavigate();

        return (
          <div>
            <h1>Module Root</h1>
            <button type="button" onClick={() => navigate("reports")}>
              Go to Reports
            </button>
          </div>
        );
      },
      meta: {
        title: "Dashboard",
      },
      resources: [reportsResource],
    });

    renderWithConfig({
      modules: [navigationModule],
      basePath: "console",
      initialEntries: ["/console/dashboard"],
    });

    const button = await screen.findByRole("button", { name: "Go to Reports" });
    fireEvent.click(button);

    const resource = await screen.findByText("Reports Resource");
    expect(resource.textContent).toContain("Reports Resource");
  });

  it("uses DefaultErrorBoundary when none is provided", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const erroringModule = defineModule({
      path: "dashboard",
      component: () => {
        throw new Error("module error");
      },
      meta: {
        title: "Dashboard",
      },
      resources: [
        defineResource({
          path: "overview",
          component: () => {
            throw new Error("resource error");
          },
          meta: {
            title: "Overview",
          },
        }),
      ],
    });

    try {
      renderWithConfig({
        modules: [erroringModule],
        initialEntries: ["/dashboard"],
      });

      expect(await screen.findByRole("alert", { name: "default-error-boundary" })).toBeDefined();

      cleanup();

      renderWithConfig({
        modules: [erroringModule],
        initialEntries: ["/dashboard/overview"],
      });

      expect(await screen.findByRole("alert", { name: "default-error-boundary" })).toBeDefined();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("displays 404 page when navigating to unknown route", async () => {
    renderWithConfig({
      modules: [],
      initialEntries: ["/unknown-path"],
    });

    expect(await screen.findByRole("alert", { name: "default-error-boundary" })).toBeDefined();
    expect(await screen.findByText("404 Not Found")).toBeDefined();
  });

  it("redirects when guard returns redirectTo", async () => {
    const dashboardModule = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: { title: "Dashboard" },
      resources: [
        defineResource({
          path: "overview",
          component: () => <div>Overview</div>,
          meta: { title: "Overview" },
        }),
      ],
    });

    const protectedModule = defineModule({
      path: "protected",
      component: () => <div>Protected Page</div>,
      meta: { title: "Protected" },
      guards: [() => redirectTo("/dashboard/overview")],
      resources: [],
    });

    renderWithConfig({
      modules: [dashboardModule, protectedModule],
      initialEntries: ["/protected"],
    });

    // Should redirect to dashboard/overview instead of showing protected page
    expect(await screen.findByText("Overview")).toBeDefined();
  });

  it("redirects resource when guard returns redirectTo", async () => {
    const dashboardModule = defineModule({
      path: "dashboard",
      component: () => (
        <div>
          <h1>Dashboard</h1>
          <Outlet />
        </div>
      ),
      meta: { title: "Dashboard" },
      resources: [
        defineResource({
          path: "overview",
          component: () => <div>Overview</div>,
          meta: { title: "Overview" },
        }),
        defineResource({
          path: "restricted",
          component: () => <div>Restricted</div>,
          meta: { title: "Restricted" },
          guards: [() => redirectTo("/dashboard/overview")],
        }),
      ],
    });

    renderWithConfig({
      modules: [dashboardModule],
      initialEntries: ["/dashboard/restricted"],
    });

    // Should redirect to overview instead of showing restricted
    expect(await screen.findByText("Overview")).toBeDefined();
  });

  it("redirects based on context data in guard", async () => {
    const loginModule = defineModule({
      path: "login",
      component: () => <div>Login Page</div>,
      meta: { title: "Login" },
      resources: [],
    });

    const protectedModule = defineModule({
      path: "protected",
      component: () => <div>Protected Content</div>,
      meta: { title: "Protected" },
      guards: [
        ({ context }) => {
          if (!(context as { isAuthenticated?: boolean }).isAuthenticated) {
            return redirectTo("/login");
          }
          return { type: "pass" };
        },
      ],
      resources: [],
    });

    // Test without authentication - should redirect to login
    renderWithConfig({
      modules: [loginModule, protectedModule],
      initialEntries: ["/protected"],
      contextData: { isAuthenticated: false },
    });

    expect(await screen.findByText("Login Page")).toBeDefined();

    cleanup();

    // Test with authentication - should show protected content
    renderWithConfig({
      modules: [loginModule, protectedModule],
      initialEntries: ["/protected"],
      contextData: { isAuthenticated: true },
    });

    expect(await screen.findByText("Protected Content")).toBeDefined();
  });

  it("shows 404 when navigating to module without component", async () => {
    const adminModule = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      resources: [
        defineResource({
          path: "users",
          component: () => <div>Users Page</div>,
          meta: { title: "Users" },
        }),
      ],
    });

    renderWithConfig({
      modules: [adminModule],
      initialEntries: ["/admin"],
    });

    expect(await screen.findByRole("alert", { name: "default-error-boundary" })).toBeDefined();
    expect(await screen.findByText("404 Not Found")).toBeDefined();
  });

  it("renders child resource of module without component", async () => {
    const adminModule = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      resources: [
        defineResource({
          path: "users",
          component: () => <div>Users Page</div>,
          meta: { title: "Users" },
        }),
      ],
    });

    renderWithConfig({
      modules: [adminModule],
      initialEntries: ["/admin/users"],
    });

    expect(await screen.findByText("Users Page")).toBeDefined();
  });
});

// Mock auth-public-client for integration tests
vi.mock("@tailor-platform/auth-public-client", () => ({
  createAuthClient: vi.fn(),
}));

const createMockAuthClient = (
  initialState?: {
    isAuthenticated: boolean;
    error: string | null;
    isReady: boolean;
  },
  overrides?: Partial<EnhancedAuthClient>,
): EnhancedAuthClient => {
  const state = initialState ?? {
    isAuthenticated: false,
    error: null,
    isReady: false,
  };

  return {
    getState: vi.fn(() => state),
    login: vi.fn(),
    logout: vi.fn(),
    getAuthUrl: vi.fn(),
    handleCallback: vi.fn(),
    checkAuthStatus: vi.fn().mockResolvedValue({
      isAuthenticated: false,
      error: null,
      isReady: true,
    }),
    refreshTokens: vi.fn(),
    ready: vi.fn(() => Promise.resolve()),
    configure: vi.fn(),
    addEventListener: vi.fn(() => () => {}),
    getAuthHeaders: vi.fn(),
    getAppUri: vi.fn(() => "https://api.test.com"),
    getAuthHeadersForQuery: vi.fn(),
    getCallbackStatusSnapshot: vi.fn(() => "idle"),
    subscribeCallbackStatus: vi.fn(() => () => {}),
    ...overrides,
  } as EnhancedAuthClient;
};

describe("RouterContainer with AuthProvider", () => {
  it("does not call checkAuthStatus via loader on initial load", async () => {
    const mockCheckAuthStatus = vi.fn().mockResolvedValue({
      isAuthenticated: true,
      error: null,
      isReady: true,
    });
    const authClient = createMockAuthClient(
      { isAuthenticated: false, error: null, isReady: false },
      { checkAuthStatus: mockCheckAuthStatus },
    );

    renderWithConfig({
      modules: [
        defineModule({
          path: "dashboard",
          component: () => <div>Dashboard</div>,
          meta: { title: "Dashboard" },
          resources: [],
        }),
      ],
      initialEntries: ["/dashboard"],
      authClient,
    });

    await screen.findByText("Dashboard");
    expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
  });

  it("waits to render until callback handling finishes", async () => {
    let callbackStatus: "idle" | "pending" | "resolved" | "rejected" = "pending";
    let callbackStatusListener: (() => void) | undefined;
    const authClient = createMockAuthClient(
      { isAuthenticated: true, error: null, isReady: true },
      {
        getCallbackStatusSnapshot: vi.fn(() => callbackStatus),
        subscribeCallbackStatus: vi.fn((listener: () => void) => {
          callbackStatusListener = listener;
          return () => {
            callbackStatusListener = undefined;
          };
        }),
      },
    );

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
    });

    expect(screen.queryByText("Home")).toBeNull();

    await act(async () => {
      callbackStatus = "resolved";
      callbackStatusListener?.();
    });

    expect(await screen.findByText("Home")).toBeDefined();
  });

  it("does not recreate the router when auth state changes", async () => {
    let snapshot = {
      isAuthenticated: false,
      error: null as string | null,
      isReady: false,
    };
    const listeners: Array<(event: { type: string }) => void> = [];
    const createMemoryRouterSpy = vi.spyOn(ReactRouter, "createMemoryRouter");

    const authClient = createMockAuthClient(snapshot, {
      getState: vi.fn(() => snapshot),
      addEventListener: vi.fn((listener) => {
        listeners.push(listener);
        return () => {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      }),
    });

    try {
      renderWithConfig({
        modules: [],
        rootComponent: () => <div>Home</div>,
        initialEntries: ["/"],
        authClient,
        guardComponent: () => <div>Loading...</div>,
      });

      expect(await screen.findByText("Loading...")).toBeDefined();
      // With guardComponent now applied in AuthProvider (not the router),
      // RouterContainer is not mounted until auth is ready.
      expect(createMemoryRouterSpy).toHaveBeenCalledTimes(0);

      act(() => {
        snapshot = {
          isAuthenticated: true,
          error: null,
          isReady: true,
        };
        for (const listener of listeners) {
          listener({ type: "auth_state_changed" });
        }
      });

      expect(await screen.findByText("Home")).toBeDefined();
      // Router is created once when children first render after auth is ready.
      expect(createMemoryRouterSpy).toHaveBeenCalledTimes(1);
    } finally {
      createMemoryRouterSpy.mockRestore();
    }
  });

  it("recreates the router when route-defining config changes", async () => {
    const createMemoryRouterSpy = vi.spyOn(ReactRouter, "createMemoryRouter");
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: { title: "Dashboard" },
      resources: [],
    });

    try {
      const view = renderWithConfig({
        modules: [module],
        locale: "en",
        initialEntries: ["/dashboard"],
      });

      expect(await screen.findByText("Dashboard")).toBeDefined();
      expect(createMemoryRouterSpy).toHaveBeenCalledTimes(1);

      view.rerender(
        <AppShellConfigContext.Provider
          value={{
            configurations: {
              modules: [module],
              settingsResources: [],
              basePath: undefined,
              errorBoundary: undefined,
              locale: "ja",
            },
          }}
        >
          <AppShellDataContext.Provider value={{ contextData: {} }}>
            <RouterContainer memory initialEntries={["/dashboard"]}>
              <Outlet />
            </RouterContainer>
          </AppShellDataContext.Provider>
        </AppShellConfigContext.Provider>,
      );

      expect(await screen.findByText("Dashboard")).toBeDefined();
      expect(createMemoryRouterSpy).toHaveBeenCalledTimes(2);
    } finally {
      createMemoryRouterSpy.mockRestore();
    }
  });

  it("calls login automatically when autoLogin is enabled and not authenticated", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const authClient = createMockAuthClient(
      { isAuthenticated: false, error: null, isReady: true },
      {
        login: mockLogin,
      },
    );

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
      autoLogin: true,
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it("does not call login when autoLogin is disabled", async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    const mockCheckAuthStatus = vi.fn().mockResolvedValue({
      isAuthenticated: false,
      error: null,
      isReady: true,
    });
    const authClient = createMockAuthClient(
      { isAuthenticated: false, error: null, isReady: false },
      {
        login: mockLogin,
        checkAuthStatus: mockCheckAuthStatus,
      },
    );

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
    });

    await screen.findByText("Home");
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("shows guard component when not ready", async () => {
    const authClient = createMockAuthClient({
      isAuthenticated: false,
      error: null,
      isReady: false,
    });

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
      guardComponent: () => <div>Loading...</div>,
    });

    expect(await screen.findByText("Loading...")).toBeDefined();
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("shows guard component when not authenticated", async () => {
    const authClient = createMockAuthClient({
      isAuthenticated: false,
      error: null,
      isReady: true,
    });

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
      guardComponent: () => <div>Please log in</div>,
    });

    expect(await screen.findByText("Please log in")).toBeDefined();
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("shows children when authenticated with guardComponent", async () => {
    const mockCheckAuthStatus = vi.fn().mockResolvedValue({
      isAuthenticated: true,
      error: null,
      isReady: true,
    });
    const authClient = createMockAuthClient(
      { isAuthenticated: true, error: null, isReady: true },
      { checkAuthStatus: mockCheckAuthStatus },
    );

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
      guardComponent: () => <div>Please log in</div>,
    });

    expect(await screen.findByText("Home")).toBeDefined();
    expect(screen.queryByText("Please log in")).toBeNull();
  });

  it("transitions from guard to children when auth state changes", async () => {
    // Mutable snapshot; initially not ready, not authenticated.
    // Mount-time initialization runs outside the router loader, so the guard
    // remains visible until the auth client publishes a ready state.
    let snapshot = {
      isAuthenticated: false,
      error: null as string | null,
      isReady: false,
    };

    // Collect listeners so we can trigger state change notifications
    const listeners: Array<(event: { type: string }) => void> = [];

    // checkAuthStatus resolves without updating snapshot, mimicking a
    // still-pending auth check from the guard's perspective.
    const mockCheckAuthStatus = vi.fn().mockResolvedValue({
      isAuthenticated: false,
      error: null,
      isReady: true,
    });

    const authClient = createMockAuthClient(snapshot, {
      checkAuthStatus: mockCheckAuthStatus,
      // Return the same reference until we reassign snapshot (required by useSyncExternalStore)
      getState: vi.fn(() => snapshot),
      addEventListener: vi.fn((listener) => {
        listeners.push(listener);
        return () => {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      }),
    });

    renderWithConfig({
      modules: [],
      rootComponent: () => <div>Home</div>,
      initialEntries: ["/"],
      authClient,
      guardComponent: () => <div>Loading...</div>,
    });

    // Initially the guard should be shown
    expect(await screen.findByText("Loading...")).toBeDefined();
    expect(screen.queryByText("Home")).toBeNull();

    // Simulate auth state becoming ready and authenticated (e.g. token refresh
    // or login flow completing outside the loader).
    act(() => {
      snapshot = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      for (const listener of listeners) {
        listener({ type: "auth_state_changed" });
      }
    });

    // After auth state transitions, children should replace the guard
    expect(await screen.findByText("Home")).toBeDefined();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("allows navigation between routes after authentication", async () => {
    const authClient = createMockAuthClient({
      isAuthenticated: true,
      error: null,
      isReady: true,
    });

    const dashboardModule = defineModule({
      path: "dashboard",
      component: () => {
        const navigate = useNavigate();
        return (
          <div>
            <h1>Dashboard</h1>
            <button type="button" onClick={() => navigate("/settings")}>
              Go to Settings
            </button>
            <Outlet />
          </div>
        );
      },
      meta: { title: "Dashboard" },
      resources: [],
    });

    const settingsModule = defineModule({
      path: "settings",
      component: () => <div>Settings Page</div>,
      meta: { title: "Settings" },
      resources: [],
    });

    renderWithConfig({
      modules: [dashboardModule, settingsModule],
      initialEntries: ["/dashboard"],
      authClient,
      guardComponent: () => <div>Loading...</div>,
    });

    expect(await screen.findByText("Dashboard")).toBeDefined();
    expect(screen.queryByText("Loading...")).toBeNull();

    const button = await screen.findByRole("button", {
      name: "Go to Settings",
    });
    fireEvent.click(button);

    expect(await screen.findByText("Settings Page")).toBeDefined();
  });

  it("renders the correct page after OAuth callback with a specific path", async () => {
    let callbackStatus: "idle" | "pending" | "resolved" | "rejected" = "pending";
    let callbackStatusListener: (() => void) | undefined;
    const authClient = createMockAuthClient(
      { isAuthenticated: true, error: null, isReady: true },
      {
        getCallbackStatusSnapshot: vi.fn(() => callbackStatus),
        subscribeCallbackStatus: vi.fn((listener: () => void) => {
          callbackStatusListener = listener;
          return () => {
            callbackStatusListener = undefined;
          };
        }),
      },
    );

    renderWithConfig({
      modules: [
        defineModule({
          path: "dashboard",
          component: () => <div>Dashboard</div>,
          meta: { title: "Dashboard" },
          resources: [],
        }),
      ],
      initialEntries: ["/dashboard"],
      authClient,
    });

    await act(async () => {
      callbackStatus = "resolved";
      callbackStatusListener?.();
    });

    expect(await screen.findByText("Dashboard")).toBeDefined();
  });

  it("applies both auth guard and route-level guards correctly", async () => {
    let snapshot = {
      isAuthenticated: false,
      error: null as string | null,
      isReady: false,
    };
    const listeners: Array<(event: { type: string }) => void> = [];

    const authClient = createMockAuthClient(snapshot, {
      getState: vi.fn(() => snapshot),
      addEventListener: vi.fn((listener) => {
        listeners.push(listener);
        return () => {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      }),
    });

    const publicModule = defineModule({
      path: "public",
      component: () => <div>Public Page</div>,
      meta: { title: "Public" },
      resources: [],
    });

    const restrictedModule = defineModule({
      path: "restricted",
      component: () => <div>Restricted Page</div>,
      meta: { title: "Restricted" },
      guards: [() => redirectTo("/public")],
      resources: [],
    });

    renderWithConfig({
      modules: [publicModule, restrictedModule],
      initialEntries: ["/restricted"],
      authClient,
      guardComponent: () => <div>Auth Loading...</div>,
    });

    // Auth guard should be shown first (auth not ready)
    expect(await screen.findByText("Auth Loading...")).toBeDefined();
    expect(screen.queryByText("Public Page")).toBeNull();
    expect(screen.queryByText("Restricted Page")).toBeNull();

    // Simulate auth becoming ready and authenticated
    act(() => {
      snapshot = {
        isAuthenticated: true,
        error: null,
        isReady: true,
      };
      for (const listener of listeners) {
        listener({ type: "auth_state_changed" });
      }
    });

    // After auth resolves, route-level guard should redirect to /public
    expect(await screen.findByText("Public Page")).toBeDefined();
    expect(screen.queryByText("Restricted Page")).toBeNull();
    expect(screen.queryByText("Auth Loading...")).toBeNull();
  });

  it("works without AuthProvider (no regression)", async () => {
    const dashboardModule = defineModule({
      path: "dashboard",
      component: () => {
        const navigate = useNavigate();
        return (
          <div>
            <h1>Dashboard</h1>
            <button type="button" onClick={() => navigate("/dashboard/settings")}>
              Go to Settings
            </button>
            <Outlet />
          </div>
        );
      },
      meta: { title: "Dashboard" },
      resources: [
        defineResource({
          path: "settings",
          component: () => <div>Settings Resource</div>,
          meta: { title: "Settings" },
        }),
      ],
    });

    // No authClient — AuthProvider is not used
    renderWithConfig({
      modules: [dashboardModule],
      initialEntries: ["/dashboard"],
    });

    expect(await screen.findByText("Dashboard")).toBeDefined();

    const button = await screen.findByRole("button", {
      name: "Go to Settings",
    });
    fireEvent.click(button);

    expect(await screen.findByText("Settings Resource")).toBeDefined();
  });
});
