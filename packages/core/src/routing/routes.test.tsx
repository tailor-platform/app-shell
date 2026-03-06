import { describe, expect, it, assert } from "vitest";
import { createContentRoutes } from "./routes";
import { EmptyOutlet, SettingsWrapper } from "@/components/content";
import { defineModule, defineResource, pass, redirectTo, hidden } from "@/resource";

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

const RootComponent = () => <div>Root</div>;
const createMockResourceWithoutComponent = (
  path: string,
  subResources: ReturnType<typeof defineResource>[],
) =>
  defineResource({
    path,
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
      resources: [createMockResourceWithSubResources("child", [createMockResource("grandchild")])],
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

  it("creates module without component or guards (path-only module)", () => {
    const module = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      resources: [createMockResource("users"), createMockResource("roles")],
    });

    expect(module.component).toBeUndefined();
    expect(module.meta.menuItemClickable).toBe(false);

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    expect(moduleRoute?.path).toBe("admin");

    // No component index route, but a 404 index route should exist
    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    expect(typeof indexRoute?.Component).toBe("function");
    expect(typeof indexRoute?.loader).toBe("function");

    // Child resources should still be present
    expect(moduleRoute?.children).toHaveLength(3);
    expect(moduleRoute?.children?.[1].path).toBe("users");
    expect(moduleRoute?.children?.[2].path).toBe("roles");
  });

  it("uses guard loader instead of 404 for module without component but with guards", async () => {
    const module = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      guards: [() => redirectTo("/dashboard")],
      resources: [createMockResource("users")],
    });

    expect(module.component).toBeUndefined();

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    expect(moduleRoute?.path).toBe("admin");

    // Index route should exist with the guard loader, not a 404 loader
    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    expect(typeof indexRoute?.Component).toBe("function");
    expect(typeof indexRoute?.loader).toBe("function");

    // The guard loader should redirect, not throw a 404
    assert(typeof indexRoute?.loader === "function");
    const result = await indexRoute.loader({} as never);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe("/dashboard");
  });

  it("falls back to 404 when guards pass() on a module without component", async () => {
    const module = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      guards: [() => pass()],
      resources: [createMockResource("users")],
    });

    expect(module.component).toBeUndefined();

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    // When guards all pass() but there's no component, should throw 404
    try {
      await indexRoute.loader({} as never);
      expect.unreachable("Loader should throw a Response for 404");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("throws 404 when hidden() guard on module without component", async () => {
    const module = defineModule({
      path: "admin",
      meta: { title: "Admin" },
      guards: [() => hidden()],
      resources: [createMockResource("users")],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    try {
      await indexRoute.loader({} as never);
      expect.unreachable("Loader should throw for hidden()");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("creates resource without component (sub-resources only, path returns 404)", () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: { title: "Dashboard" },
      resources: [
        createMockResourceWithoutComponent("namespace", [
          createMockResource("page-a"),
          createMockResource("page-b"),
        ]),
      ],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const namespaceRoute = moduleRoute?.children?.[1];
    expect(namespaceRoute?.path).toBe("namespace");

    // Should have a 404 index route (no component)
    const indexRoute = namespaceRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    expect(typeof indexRoute?.Component).toBe("function");
    expect(typeof indexRoute?.loader).toBe("function");

    // Sub-resources should still be present
    expect(namespaceRoute?.children).toHaveLength(3); // index + 2 sub-resources
    expect(namespaceRoute?.children?.[1].path).toBe("page-a");
    expect(namespaceRoute?.children?.[2].path).toBe("page-b");
  });

  it("resource without component returns 404 from index loader", async () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: { title: "Dashboard" },
      resources: [createMockResourceWithoutComponent("namespace", [createMockResource("child")])],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const namespaceRoute = moduleRoute?.children?.[1];
    const indexRoute = namespaceRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    try {
      await indexRoute.loader({} as never);
      expect.unreachable("Loader should throw a Response for 404");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("resource without component but with guards uses guard loader", async () => {
    const module = defineModule({
      path: "dashboard",
      component: () => <div>Dashboard</div>,
      meta: { title: "Dashboard" },
      resources: [
        defineResource({
          path: "legacy",
          meta: { title: "Legacy" },
          guards: [() => redirectTo("/dashboard/new")],
          subResources: [createMockResource("child")],
        }),
      ],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    const legacyRoute = moduleRoute?.children?.[1];
    expect(legacyRoute?.path).toBe("legacy");

    const indexRoute = legacyRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    const result = await indexRoute.loader({} as never);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe("/dashboard/new");
  });

  it("path-only module (no component, no resources, no guards) returns 404", async () => {
    const module = defineModule({
      path: "empty",
      meta: { title: "Empty" },
      resources: [],
    });

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    expect(moduleRoute?.path).toBe("empty");

    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    try {
      await indexRoute.loader({} as never);
      expect.unreachable("Loader should throw 404");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("allows guard-only module (no component, no resources) for redirect", async () => {
    const module = defineModule({
      path: "old-dashboard",
      meta: { title: "Old Dashboard" },
      guards: [() => redirectTo("/dashboard")],
      resources: [],
    });

    expect(module.component).toBeUndefined();
    expect(module.meta.menuItemClickable).toBe(false);

    const routes = createContentRoutes({
      modules: [module],
      settingsResources: [],
    });

    const moduleContainer = routes[1];
    const moduleRoute = moduleContainer.children?.[0];
    expect(moduleRoute?.path).toBe("old-dashboard");

    // Guard-only module should have an index route with the guard loader
    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    assert(typeof indexRoute?.loader === "function");

    const result = await indexRoute.loader({} as never);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("Location")).toBe("/dashboard");
  });
});
