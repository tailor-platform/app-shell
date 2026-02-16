import { describe, expect, it, assert } from "vitest";
import { createContentRoutes } from "./routes";
import { EmptyOutlet, SettingsWrapper } from "@/components/content";
import { defineModule, defineResource, pass, hidden } from "@/resource";

const createMockResource = (path: string) =>
  defineResource({
    path,
    component: () => <div>{path}</div>,
    meta: {
      title: path,
    },
  });

const createMockResourceWithSubResources = (
  path: string,
  subResources: ReturnType<typeof defineResource>[],
) =>
  defineResource({
    path,
    component: () => <div>{path}</div>,
    meta: {
      title: path,
    },
    subResources,
  });

describe("createContentRoutes", () => {
  it("uses EmptyOutlet when no root component is provided", () => {
    const routes = createContentRoutes({
      modules: [],
      settingsResources: [],
    });

    expect(routes[0].Component).toBe(EmptyOutlet);
  });

  it("uses provided root component", () => {
    const RootComponent = () => <div>Root</div>;
    const routes = createContentRoutes({
      modules: [],
      settingsResources: [],
      rootComponent: RootComponent,
    });

    expect(routes[0].Component).toBe(RootComponent);
  });

  it("adds module routes with inherited error boundaries", () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: {
        title: "Dashboard",
      },
      resources: [createMockResource("overview")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    expect(moduleContainer.children).toBeDefined();
    const moduleRoute = moduleContainer.children?.[0];

    expect(moduleRoute?.path).toBe("dashboard");
    expect(typeof moduleRoute?.ErrorBoundary).toBe("function");

    const resourceRoute = moduleRoute?.children?.[1];
    expect(resourceRoute?.path).toBe("overview");
    expect(resourceRoute?.index).toBeUndefined();
  });

  it("includes settings routes and wraps custom error boundaries", () => {
    const settingsResource = defineResource({
      path: "profile",
      component: () => <div>Profile</div>,
      meta: {
        title: "Profile",
      },
      errorBoundary: <div>Profile Error</div>,
    });

    const routes = createContentRoutes({
      modules: [],
      settingsResources: [settingsResource],
    });

    const indexSettingsRoute = routes[2];
    expect(indexSettingsRoute.path).toBe("settings");
    expect(indexSettingsRoute.index).toBe(true);

    const settingsWrapperRoute = routes[3];
    expect(settingsWrapperRoute.Component).toBe(SettingsWrapper);

    const childRoute = settingsWrapperRoute.children?.[0];
    expect(childRoute?.path).toBe("profile");
    expect(typeof childRoute?.ErrorBoundary).toBe("function");
  });

  it("appends a catch-all 404 route", () => {
    const routes = createContentRoutes({
      modules: [],
      settingsResources: [],
    });

    const notFoundRoute = routes.at(-1);
    expect(notFoundRoute?.path).toBe("*");

    const loader = notFoundRoute?.loader;
    expect(typeof loader).toBe("function");
    assert(typeof loader === "function");

    try {
      loader({} as never);
      expect.unreachable("Loader should throw a Response for 404s");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("attaches loader to parent route so guards apply to all descendants", () => {
    const module = defineModule({
      path: "protected",
      component: () => <div>Protected</div>,
      meta: {
        title: "Protected",
      },
      guards: [() => pass()],
      resources: [
        createMockResourceWithSubResources("child", [
          createMockResource("grandchild"),
        ]),
      ],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];

    // Loader should be on the parent route, not just the index route
    expect(moduleRoute?.loader).toBeDefined();
    expect(typeof moduleRoute?.loader).toBe("function");

    // Index route should NOT have its own loader (it inherits from parent)
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.loader).toBeUndefined();
  });

  it("attaches loader to resource with guards so it applies to sub-resources", () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: {
        title: "Dashboard",
      },
      resources: [
        defineResource({
          path: "protected-section",
          component: () => <div>Protected Section</div>,
          meta: { title: "Protected Section" },
          guards: [() => pass()],
          subResources: [createMockResource("detail")],
        }),
      ],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const protectedResource = moduleRoute?.children?.[1];

    // Loader should be on the resource route with guards
    expect(protectedResource?.path).toBe("protected-section");
    expect(protectedResource?.loader).toBeDefined();
    expect(typeof protectedResource?.loader).toBe("function");

    // Index route of the protected resource should NOT have its own loader
    const indexRoute = protectedResource?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.loader).toBeUndefined();

    // Sub-resource should also NOT have a loader (inherits from parent)
    const subResource = protectedResource?.children?.[1];
    expect(subResource?.path).toBe("detail");
    expect(subResource?.loader).toBeUndefined();
  });

  it("creates a redirect to first resource when module has no component", async () => {
    const module = defineModule({
      path: "reports",
      meta: {
        title: "Reports",
      },
      resources: [createMockResource("sales"), createMockResource("users")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];

    expect(moduleRoute?.path).toBe("reports");

    // First child should be the redirect index route
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(typeof indexRoute?.loader).toBe("function");

    // Verify the redirect goes to the first resource
    assert(typeof indexRoute?.loader === "function");
    const response = (await indexRoute.loader({} as never)) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("sales");

    // Resource routes should still exist
    const salesRoute = moduleRoute?.children?.[1];
    expect(salesRoute?.path).toBe("sales");

    const usersRoute = moduleRoute?.children?.[2];
    expect(usersRoute?.path).toBe("users");
  });

  it("module without component has menuItemClickable set to false", () => {
    const module = defineModule({
      path: "reports",
      meta: {
        title: "Reports",
      },
      resources: [createMockResource("sales")],
    });

    expect(module.meta.menuItemClickable).toBe(false);
  });

  it("module with component has menuItemClickable set to true", () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: {
        title: "Dashboard",
      },
      resources: [createMockResource("overview")],
    });

    expect(module.meta.menuItemClickable).toBe(true);
  });

  it("preserves loader when module has guards but no component", () => {
    const module = defineModule({
      path: "protected-reports",
      meta: {
        title: "Protected Reports",
      },
      guards: [() => pass()],
      resources: [createMockResource("sales"), createMockResource("users")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];

    expect(moduleRoute?.path).toBe("protected-reports");
    // Loader from guards should be preserved on the module route
    expect(moduleRoute?.loader).toBeDefined();
    expect(typeof moduleRoute?.loader).toBe("function");

    // First child should be the redirect index route
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);

    // Resource routes should still exist
    const salesRoute = moduleRoute?.children?.[1];
    expect(salesRoute?.path).toBe("sales");
  });

  it("redirects to second resource when first resource is hidden", async () => {
    const hiddenResource = defineResource({
      path: "hidden",
      component: () => <div>Hidden</div>,
      meta: {
        title: "Hidden",
      },
      guards: [() => hidden()],
    });

    const visibleResource = createMockResource("visible");

    const module = defineModule({
      path: "reports",
      meta: {
        title: "Reports",
      },
      resources: [hiddenResource, visibleResource],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.[0];

    expect(indexRoute?.index).toBe(true);
    expect(typeof indexRoute?.loader).toBe("function");

    // Verify the redirect skips the hidden resource and goes to the visible one
    assert(typeof indexRoute?.loader === "function");
    const response = (await indexRoute.loader({
      request: new Request("http://localhost/reports"),
      params: {},
    } as never)) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("visible");
  });

  it("throws 404 when all resources are hidden", async () => {
    const hiddenResource1 = defineResource({
      path: "hidden1",
      component: () => <div>Hidden 1</div>,
      meta: {
        title: "Hidden 1",
      },
      guards: [() => hidden()],
    });

    const hiddenResource2 = defineResource({
      path: "hidden2",
      component: () => <div>Hidden 2</div>,
      meta: {
        title: "Hidden 2",
      },
      guards: [() => hidden()],
    });

    const module = defineModule({
      path: "reports",
      meta: {
        title: "Reports",
      },
      resources: [hiddenResource1, hiddenResource2],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.[0];

    expect(indexRoute?.index).toBe(true);
    expect(typeof indexRoute?.loader).toBe("function");

    // Verify that when all resources are hidden, the loader throws a 404
    assert(typeof indexRoute?.loader === "function");
    try {
      await indexRoute.loader({
        request: new Request("http://localhost/reports"),
        params: {},
      } as never);
      // If no error is thrown, fail the test
      expect.fail("Expected loader to throw a 404 error");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });
});
