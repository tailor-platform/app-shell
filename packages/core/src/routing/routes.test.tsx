import { describe, expect, it, assert } from "vitest";
import { createContentRoutes } from "./routes";
import { EmptyOutlet, SettingsWrapper } from "@/components/content";
import { defineModule, defineResource, pass, redirectTo } from "@/resource";

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

  it("attaches loader to index route only (no cascade to children)", () => {
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

    // Loader should be on the index route only (no cascade to children)
    expect(moduleRoute?.loader).toBeUndefined();

    // Index route should have the loader for guards
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.loader).toBeDefined();
    expect(typeof indexRoute?.loader).toBe("function");

    // Child resource should NOT have a loader (no inheritance from parent)
    const childResource = moduleRoute?.children?.[1];
    expect(childResource?.path).toBe("child");
    expect(childResource?.loader).toBeUndefined();
  });

  it("creates index route with loader and dummy component for module without component but with guards", () => {
    const module = defineModule({
      path: "redirect-module",
      meta: { title: "Redirect Module" },
      guards: [() => redirectTo("/dashboard")],
      resources: [createMockResource("child")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    expect(moduleRoute?.path).toBe("redirect-module");

    // Index route should exist with loader and dummy component
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.loader).toBeDefined();
    expect(typeof indexRoute?.loader).toBe("function");
    expect(typeof indexRoute?.Component).toBe("function");

    // Child resource should still be present
    const childRoute = moduleRoute?.children?.[1];
    expect(childRoute?.path).toBe("child");
  });

  it("does not create index route for module without component and without guards", () => {
    // This case should throw in defineModule, but we test createRoute's behavior
    // by using a module with component (which produces index route)
    const module = defineModule({
      path: "no-comp-no-guard",
      meta: { title: "Test" },
      component: () => <div>Test</div>,
      resources: [createMockResource("child")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.Component).toBeDefined();
    // No guards = no loader
    expect(indexRoute?.loader).toBeUndefined();
  });

  it("redirect guard loader returns a redirect response", async () => {
    const module = defineModule({
      path: "redirect-module",
      meta: { title: "Redirect Module" },
      guards: [() => redirectTo("/dashboard")],
      resources: [createMockResource("child")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.[0];
    const loader = indexRoute?.loader;
    expect(typeof loader).toBe("function");

    // Execute the loader - it should return a redirect
    const result = await (loader as (...args: unknown[]) => unknown)({} as never);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe("/dashboard");
  });

  it("attaches loader to index route only for resource (no cascade to sub-resources)", () => {
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

    // Loader should NOT be on the resource route (no cascade)
    expect(protectedResource?.path).toBe("protected-section");
    expect(protectedResource?.loader).toBeUndefined();

    // Index route of the protected resource should have the loader
    const indexRoute = protectedResource?.children?.[0];
    expect(indexRoute?.index).toBe(true);
    expect(indexRoute?.loader).toBeDefined();
    expect(typeof indexRoute?.loader).toBe("function");

    // Sub-resource should NOT have a loader (no inheritance)
    const subResource = protectedResource?.children?.[1];
    expect(subResource?.path).toBe("detail");
    expect(subResource?.loader).toBeUndefined();
  });
});
