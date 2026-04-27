import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import {
  AppShellConfigContext,
  AppShellDataContext,
  buildConfigurations,
} from "@/contexts/appshell-context";
import { RouterContainer } from "@/routing/router";
import { useNavItems } from "./navigation";
import { defineModule, defineResource, hidden } from "@/resource";

afterEach(() => {
  cleanup();
});

const renderNavItems = (
  modules: Array<ReturnType<typeof defineModule>>,
  path = "/dashboard/overview",
) => {
  const configurations = buildConfigurations({ modules, locale: "en" });
  return renderHook(() => useNavItems(), {
    wrapper: ({ children }) => (
      <AppShellConfigContext.Provider value={{ configurations }}>
        <AppShellDataContext.Provider value={{ contextData: {} }}>
          <RouterContainer memory initialEntries={[path]}>
            {children}
          </RouterContainer>
        </AppShellDataContext.Provider>
      </AppShellConfigContext.Provider>
    ),
  });
};

describe("useNavItems", () => {
  it("builds nav items for visible modules and resources", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard" },
        component: () => <div>Dashboard Root</div>,
        resources: [
          defineResource({
            path: "overview",
            component: () => <div>Overview</div>,
          }),
          defineResource({
            path: "settings",
            component: () => <div>Settings</div>,
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules);

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const item = navItems[0];
    expect(item.title).toBe("Dashboard");
    expect(item.url).toBe("dashboard");
    expect(item.items).toHaveLength(2);
    expect(item.items[0]).toEqual({
      title: "Overview",
      url: "dashboard/overview",
    });
  });

  it("filters out modules hidden by guards", async () => {
    const modules = [
      defineModule({
        path: "reports",
        meta: { title: "Reports" },
        component: () => <div>Reports Root</div>,
        resources: [
          defineResource({
            path: "summary",
            component: () => <div>Summary</div>,
          }),
        ],
        guards: [() => hidden()],
      }),
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard" },
        component: () => <div>Dashboard Root</div>,
        resources: [
          defineResource({
            path: "overview",
            component: () => <div>Overview</div>,
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/dashboard/overview");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    expect(navItems.map((i) => i.title)).toEqual(["Dashboard"]);
  });

  it("filters out resources hidden by guards", async () => {
    const modules = [
      defineModule({
        path: "workspace",
        meta: { title: "Workspace" },
        component: () => <div>Workspace Root</div>,
        resources: [
          defineResource({
            path: "visible",
            component: () => <div>Visible</div>,
          }),
          defineResource({
            path: "secret",
            component: () => <div>Secret</div>,
            guards: [() => hidden()],
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/workspace/visible");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;
    expect(resources).toHaveLength(1);
    expect(resources[0]).toEqual({
      title: "Visible",
      url: "workspace/visible",
    });
  });

  it("recursively processes subResources", async () => {
    const modules = [
      defineModule({
        path: "custom-page",
        meta: { title: "Custom Page" },
        component: () => <div>Custom Page Root</div>,
        resources: [
          defineResource({
            path: "sub1",
            component: () => <div>Sub1</div>,
            subResources: [
              defineResource({
                path: "sub1-1",
                component: () => <div>Sub1-1</div>,
              }),
              defineResource({
                path: "sub1-2",
                component: () => <div>Sub1-2</div>,
              }),
            ],
          }),
          defineResource({
            path: "sub2",
            component: () => <div>Sub2</div>,
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/custom-page/sub1");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;
    expect(resources).toHaveLength(2);

    // First resource should have nested items
    expect(resources[0].title).toBe("Sub1");
    expect(resources[0].url).toBe("custom-page/sub1");
    expect(resources[0].items).toHaveLength(2);
    expect(resources[0].items![0]).toMatchObject({
      title: "Sub1 1",
      url: "custom-page/sub1/sub1-1",
    });
    expect(resources[0].items![1]).toMatchObject({
      title: "Sub1 2",
      url: "custom-page/sub1/sub1-2",
    });

    // Second resource should not have nested items
    expect(resources[1].title).toBe("Sub2");
    expect(resources[1].items).toBeUndefined();
  });

  it("excludes dynamic param routes from navigation", async () => {
    const modules = [
      defineModule({
        path: "users",
        meta: { title: "Users" },
        component: () => <div>Users Root</div>,
        resources: [
          defineResource({
            path: "list",
            component: () => <div>User List</div>,
          }),
          defineResource({
            path: ":id",
            component: () => <div>User Detail</div>,
          }),
          defineResource({
            path: "settings",
            component: () => <div>Settings</div>,
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/users/list");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;

    // Should exclude :id param route
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.title)).toEqual(["List", "Settings"]);
    expect(resources.map((r) => r.url)).not.toContain("users/:id");
  });

  it("filters out hidden subResources by guards", async () => {
    const modules = [
      defineModule({
        path: "admin",
        meta: { title: "Admin" },
        component: () => <div>Admin Root</div>,
        resources: [
          defineResource({
            path: "panel",
            component: () => <div>Panel</div>,
            subResources: [
              defineResource({
                path: "visible",
                component: () => <div>Visible</div>,
              }),
              defineResource({
                path: "secret",
                component: () => <div>Secret</div>,
                guards: [() => hidden()],
              }),
            ],
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/admin/panel");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;
    expect(resources[0].items).toHaveLength(1);
    expect(resources[0].items![0].title).toBe("Visible");
  });

  it("excludes componentless resources without sub-resources", async () => {
    const modules = [
      defineModule({
        path: "app",
        meta: { title: "App" },
        component: () => <div>App Root</div>,
        resources: [
          defineResource({
            path: "dashboard",
            component: () => <div>Dashboard</div>,
          }),
          defineResource({
            path: "namespace",
            // no component, no subResources → dead-end
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/app/dashboard");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;
    expect(resources).toHaveLength(1);
    expect(resources[0].title).toBe("Dashboard");
    expect(resources[0].url).toBe("app/dashboard");
  });

  it("keeps componentless resources with sub-resources but sets url to undefined", async () => {
    const modules = [
      defineModule({
        path: "app",
        meta: { title: "App" },
        component: () => <div>App Root</div>,
        resources: [
          defineResource({
            path: "settings",
            // no component
            subResources: [
              defineResource({
                path: "general",
                component: () => <div>General</div>,
              }),
              defineResource({
                path: "advanced",
                component: () => <div>Advanced</div>,
              }),
            ],
          }),
        ],
      }),
    ];

    const { result } = renderNavItems(modules, "/app/settings/general");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    const resources = navItems[0].items;
    expect(resources).toHaveLength(1);
    expect(resources[0].title).toBe("Settings");
    expect(resources[0].url).toBeUndefined();
    expect(resources[0].items).toHaveLength(2);
    expect(resources[0].items![0].title).toBe("General");
    expect(resources[0].items![0].url).toBe("app/settings/general");
    expect(resources[0].items![1].title).toBe("Advanced");
    expect(resources[0].items![1].url).toBe("app/settings/advanced");
  });

  it("includes a clickable module with no resources as a leaf nav item", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard" },
        component: () => <div>Dashboard</div>,
        resources: [],
      }),
    ];

    const { result } = renderNavItems(modules, "/dashboard");

    await waitFor(async () => {
      expect(await result.current!).toHaveLength(1);
    });

    const navItems = await result.current!;
    expect(navItems[0].title).toBe("Dashboard");
    expect(navItems[0].url).toBe("dashboard");
    expect(navItems[0].items).toHaveLength(0);
  });
});
