import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { AppShell } from "../components/appshell";
import { useNavItems } from "./navigation";
import { defineModule, defineResource, hidden } from "@/resource";

const renderNavItems = (
  modules: Array<ReturnType<typeof defineModule>>,
  path = "/dashboard/overview",
) => {
  window.history.pushState({}, "", path);
  return renderHook(() => useNavItems(), {
    wrapper: ({ children }) => (
      <AppShell title="My App" modules={modules}>
        {children}
      </AppShell>
    ),
  });
};

describe("useNavItems", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dashboard/overview");
  });

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
});
