import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RouterContainer } from "./router";
import {
  AppShellConfigContext,
  AppShellDataContext,
} from "@/contexts/appshell-context";
import { Link, Outlet, useNavigate } from "react-router";
import {
  defineModule,
  defineResource,
  redirectTo,
  setContextData,
  hidden,
  type Module,
  type Resource,
} from "@/resource";
import type { ReactNode } from "react";
import type { ContextData } from "@/contexts/appshell-context";

afterEach(() => {
  cleanup();
});

const renderWithConfig = ({
  modules = [],
  basePath,
  rootComponent,
  initialEntries,
  contextData = {},
}: {
  modules?: Array<Module>;
  basePath?: string;
  rootComponent?: () => ReactNode;
  initialEntries: Array<string>;
  contextData?: ContextData;
}) => {
  const configurations = {
    modules,
    settingsResources: [] as Array<Resource>,
    basePath,
    errorBoundary: undefined,
    locale: "en",
  };

  setContextData(contextData);

  render(
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData }}>
        <RouterContainer
          memory
          rootComponent={rootComponent}
          initialEntries={initialEntries}
        >
          <Outlet />
        </RouterContainer>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>,
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

      expect(
        await screen.findByRole("alert", { name: "default-error-boundary" }),
      ).toBeDefined();

      cleanup();

      renderWithConfig({
        modules: [erroringModule],
        initialEntries: ["/dashboard/overview"],
      });

      expect(
        await screen.findByRole("alert", { name: "default-error-boundary" }),
      ).toBeDefined();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("displays 404 page when navigating to unknown route", async () => {
    renderWithConfig({
      modules: [],
      initialEntries: ["/unknown-path"],
    });

    expect(
      await screen.findByRole("alert", { name: "default-error-boundary" }),
    ).toBeDefined();
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

  it("redirects to second resource when module has no component and first resource is hidden", async () => {
    const hiddenResource = defineResource({
      path: "hidden",
      component: () => <div>Hidden Resource</div>,
      meta: { title: "Hidden" },
      guards: [() => hidden()],
    });

    const visibleResource = defineResource({
      path: "visible",
      component: () => <div>Visible Resource</div>,
      meta: { title: "Visible" },
    });

    const module = defineModule({
      path: "reports",
      meta: { title: "Reports" },
      // No component - should redirect to first visible resource
      resources: [hiddenResource, visibleResource],
    });

    renderWithConfig({
      modules: [module],
      initialEntries: ["/reports"],
    });

    // Should redirect to visible resource instead of showing 404
    expect(await screen.findByText("Visible Resource")).toBeDefined();
  });

  it("shows 404 when module has no component and all resources are hidden", async () => {
    const hiddenResource1 = defineResource({
      path: "hidden1",
      component: () => <div>Hidden Resource 1</div>,
      meta: { title: "Hidden 1" },
      guards: [() => hidden()],
    });

    const hiddenResource2 = defineResource({
      path: "hidden2",
      component: () => <div>Hidden Resource 2</div>,
      meta: { title: "Hidden 2" },
      guards: [() => hidden()],
    });

    const module = defineModule({
      path: "reports",
      meta: { title: "Reports" },
      // No component and all resources are hidden - should show 404
      resources: [hiddenResource1, hiddenResource2],
    });

    renderWithConfig({
      modules: [module],
      initialEntries: ["/reports"],
    });

    // Should show 404 error
    expect(
      await screen.findByRole("alert", { name: "default-error-boundary" }),
    ).toBeDefined();
    expect(await screen.findByText("404 Not Found")).toBeDefined();
  });
});
