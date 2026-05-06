import { describe, it, expect } from "vitest";
import { processPathSegments, filterRoutes } from "./path";
import { defineModule, defineResource } from "@/resource";

/**
 * Shared mock modules for path-related tests.
 * Contains: dashboard (analytics, settings/profile, reports/monthly, :id), users, settings (profile)
 */
const createMockModules = () => [
  defineModule({
    path: "dashboard",
    component: () => null,
    meta: {
      title: "Dashboard",
    },
    resources: [
      defineResource({
        path: "analytics",
        component: () => null,
        meta: {
          title: "Analytics",
        },
      }),
      defineResource({
        path: "settings",
        component: () => null,
        meta: {
          title: "Settings",
        },
        subResources: [
          defineResource({
            path: "profile",
            component: () => null,
            meta: {
              title: "Profile",
            },
          }),
        ],
      }),
      defineResource({
        path: "reports",
        component: () => null,
        meta: {
          title: "Reports",
        },
        subResources: [
          defineResource({
            path: "monthly",
            component: () => null,
            meta: {
              title: "Monthly Reports",
            },
          }),
        ],
      }),
      defineResource({
        path: ":id",
        component: () => null,
        meta: {
          title: "Detail",
        },
      }),
    ],
  }),
  defineModule({
    path: "users",
    component: () => null,
    meta: {
      title: "Users",
    },
    resources: [],
  }),
  defineModule({
    path: "settings",
    component: () => null,
    meta: {
      title: "Settings",
    },
    resources: [
      defineResource({
        path: "profile",
        component: () => null,
        meta: {
          title: "Profile",
        },
      }),
    ],
  }),
];

describe.concurrent("processPathSegments", () => {
  const mockModules = createMockModules();

  it("should process basic path segments", () => {
    const result = processPathSegments("/dashboard", undefined, mockModules, "en");

    expect(result.basePath).toBeNull();
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toEqual({
      segment: "dashboard",
      path: "dashboard",
      title: "Dashboard",
      clickable: true,
    });
  });

  it("should process path with multiple segments", () => {
    const result = processPathSegments("/dashboard/analytics", undefined, mockModules, "en");

    expect(result.basePath).toBeNull();
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({
      segment: "dashboard",
      path: "dashboard",
      title: "Dashboard",
      clickable: true,
    });
    expect(result.segments[1]).toEqual({
      segment: "analytics",
      path: "dashboard/analytics",
      title: "Analytics",
      clickable: true,
    });
  });

  it("should process path with sub-resources", () => {
    const result = processPathSegments("/dashboard/settings/profile", undefined, mockModules, "en");

    expect(result.basePath).toBeNull();
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0]).toEqual({
      segment: "dashboard",
      path: "dashboard",
      title: "Dashboard",
      clickable: true,
    });
    expect(result.segments[1]).toEqual({
      segment: "settings",
      path: "dashboard/settings",
      title: "Settings",
      clickable: true,
    });
    expect(result.segments[2]).toEqual({
      segment: "profile",
      path: "dashboard/settings/profile",
      title: "Profile",
      clickable: true,
    });
  });

  it("should handle paths with basePath", () => {
    const result = processPathSegments("/dashboard/users", "dashboard", mockModules, "en");

    expect(result.basePath).toBe("dashboard");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toEqual({
      segment: "users",
      path: "users",
      title: "Users",
      clickable: true,
    });
  });

  it("should use segment name as title when mapping does not exist", () => {
    const result = processPathSegments("/unknown-path", undefined, mockModules, "en");

    expect(result.basePath).toBeNull();
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toEqual({
      segment: "unknown-path",
      path: "unknown-path",
      title: "unknown-path",
      clickable: true,
    });
  });

  it("should mark module-level segment as non-clickable when module has no component", () => {
    const modulesWithNoComponent = [
      defineModule({
        path: "master-data",
        meta: { title: "Master Data" },
        resources: [
          defineResource({
            path: "items",
            component: () => null,
            meta: { title: "Items" },
          }),
        ],
      }),
    ];
    const result = processPathSegments(
      "/master-data/items",
      undefined,
      modulesWithNoComponent,
      "en",
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({
      segment: "master-data",
      path: "master-data",
      title: "Master Data",
      clickable: false,
    });
    expect(result.segments[1]).toEqual({
      segment: "items",
      path: "master-data/items",
      title: "Items",
      clickable: true,
    });
  });

  it("should return empty segments array for empty path without root module", () => {
    const result = processPathSegments("/", undefined, mockModules, "en");

    expect(result.basePath).toBeNull();
    expect(result.segments).toHaveLength(0);
  });

  it("should return root module breadcrumb for root path '/'", () => {
    const modulesWithRoot = [
      defineModule({
        path: "",
        component: () => null,
        meta: { title: "Home" },
        resources: [],
      }),
      ...mockModules,
    ];

    const result = processPathSegments("/", undefined, modulesWithRoot, "en");

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].title).toBe("Home");
    expect(result.segments[0].path).toBe("");
    expect(result.segments[0].clickable).toBe(true);
  });

  it("should return root module breadcrumb with basePath", () => {
    const modulesWithRoot = [
      defineModule({
        path: "",
        component: () => null,
        meta: { title: "Home" },
        resources: [],
      }),
      ...mockModules,
    ];

    const result = processPathSegments("/dashboard", "dashboard", modulesWithRoot, "en");

    expect(result.basePath).toBe("dashboard");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].title).toBe("Home");
  });

  it("should resolve resource titles under root module (path='')", () => {
    const modulesWithRootResources = [
      defineModule({
        path: "",
        component: () => null,
        meta: { title: "Home" },
        resources: [
          defineResource({
            path: "orders",
            component: () => null,
            meta: { title: "Orders" },
          }),
        ],
      }),
      ...mockModules,
    ];

    const result = processPathSegments("/orders", undefined, modulesWithRootResources, "en");

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].title).toBe("Orders");
    expect(result.segments[0].path).toBe("orders");
  });

  it("should use breadcrumbTitle string when defined on a module", () => {
    const modulesWithBreadcrumb = [
      defineModule({
        path: "dashboard",
        component: () => null,
        meta: { title: "Dashboard", breadcrumbTitle: "Home" },
        resources: [],
      }),
    ];
    const result = processPathSegments("/dashboard", undefined, modulesWithBreadcrumb, "en");

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].title).toBe("Home");
  });

  it("should use breadcrumbTitle function when defined on a module", () => {
    const modulesWithBreadcrumb = [
      defineModule({
        path: "dashboard",
        component: () => null,
        meta: { title: "Dashboard", breadcrumbTitle: () => "Custom Home" },
        resources: [],
      }),
    ];
    const result = processPathSegments("/dashboard", undefined, modulesWithBreadcrumb, "en");

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].title).toBe("Custom Home");
  });

  it("should use breadcrumbTitle on a resource", () => {
    const modulesWithBreadcrumb = [
      defineModule({
        path: "dashboard",
        component: () => null,
        meta: { title: "Dashboard" },
        resources: [
          defineResource({
            path: "orders",
            component: () => null,
            meta: { title: "Orders", breadcrumbTitle: "All Orders" },
          }),
        ],
      }),
    ];
    const result = processPathSegments("/dashboard/orders", undefined, modulesWithBreadcrumb, "en");

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].title).toBe("Dashboard");
    expect(result.segments[1].title).toBe("All Orders");
  });

  it("should use breadcrumbTitle function with dynamic segment", () => {
    const modulesWithBreadcrumb = [
      defineModule({
        path: "dashboard",
        component: () => null,
        meta: { title: "Dashboard" },
        resources: [
          defineResource({
            path: ":id",
            component: () => null,
            meta: {
              title: "Detail",
              breadcrumbTitle: (segment: string) => `Item #${segment}`,
            },
          }),
        ],
      }),
    ];
    const result = processPathSegments("/dashboard/42", undefined, modulesWithBreadcrumb, "en");

    expect(result.segments).toHaveLength(2);
    expect(result.segments[1].title).toBe("Item #42");
  });
});

describe.concurrent("filterRoutes", () => {
  const routes = [
    { path: "dashboard", title: "Dashboard", breadcrumb: ["Dashboard"] },
    {
      path: "dashboard/analytics",
      title: "Analytics",
      breadcrumb: ["Dashboard", "Analytics"],
    },
    {
      path: "dashboard/reports",
      title: "Reports",
      breadcrumb: ["Dashboard", "Reports"],
    },
    {
      path: "dashboard/reports/monthly",
      title: "Monthly Reports",
      breadcrumb: ["Dashboard", "Reports", "Monthly Reports"],
    },
    {
      path: "settings/profile",
      title: "Profile",
      breadcrumb: ["Settings", "Profile"],
    },
  ];

  it("returns all routes when search is empty", () => {
    expect(filterRoutes(routes, "")).toEqual(routes);
    expect(filterRoutes(routes, "   ")).toEqual(routes);
  });

  it("filters routes by title", () => {
    const result = filterRoutes(routes, "analytics");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Analytics");
  });

  it("filters routes by path", () => {
    const result = filterRoutes(routes, "monthly");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Monthly Reports");
  });

  it("is case insensitive", () => {
    const result = filterRoutes(routes, "ANALYTICS");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Analytics");
  });

  it("returns empty array when no matches", () => {
    const result = filterRoutes(routes, "nonexistent");

    expect(result).toHaveLength(0);
  });

  it("matches partial strings", () => {
    const result = filterRoutes(routes, "report");

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.title)).toContain("Reports");
    expect(result.map((r) => r.title)).toContain("Monthly Reports");
  });
});
