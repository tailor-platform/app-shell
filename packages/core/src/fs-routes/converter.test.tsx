import { describe, it, expect } from "vitest";
import { convertPagesToModules, validateExclusiveRouteConfig } from "./converter";
import { createContentRoutes } from "@/routing/routes";
import type { PageEntry, PageComponent } from "./types";

// ============================================
// Converter Tests
// ============================================

const parentGuard = async () => ({ type: "pass" as const });
const childGuard = async () => ({ type: "pass" as const });

const createMockPage = (
  path: string,
  appShellPageProps?: PageComponent["appShellPageProps"],
): PageEntry => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const component: PageComponent = () => null;
  if (appShellPageProps) {
    component.appShellPageProps = appShellPageProps;
  }
  return { path, component };
};

describe("convertPagesToModules", () => {
  it("returns empty array for empty pages", () => {
    expect(convertPagesToModules([])).toEqual([]);
  });

  it("converts single root page", () => {
    const pages = [createMockPage("/")];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(1);
    expect(modules[0].path).toBe("");
    expect(modules[0]._type).toBe("module");
  });

  it("converts single module page", () => {
    const pages = [createMockPage("/dashboard", { meta: { title: "Dashboard" } })];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(1);
    expect(modules[0].path).toBe("dashboard");
    expect(modules[0].meta.title).toBe("Dashboard");
  });

  it("converts nested pages to module with resources", () => {
    const pages = [
      createMockPage("/purchasing"),
      createMockPage("/purchasing/orders"),
      createMockPage("/purchasing/orders/:id"),
    ];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(1);
    expect(modules[0].path).toBe("purchasing");
    expect(modules[0].resources).toHaveLength(1);
    expect(modules[0].resources[0].path).toBe("orders");
    expect(modules[0].resources[0].subResources).toHaveLength(1);
    expect(modules[0].resources[0].subResources![0].path).toBe(":id");
  });

  it("does not inherit guards from parent to children", () => {
    const pages = [
      createMockPage("/dashboard", { guards: [parentGuard] }),
      createMockPage("/dashboard/orders", { guards: [childGuard] }),
    ];
    const modules = convertPagesToModules(pages);

    // Parent has only its own guard
    expect(modules[0].guards).toHaveLength(1);
    expect(modules[0].guards).toContain(parentGuard);

    // Child has only its own guard (no inheritance)
    expect(modules[0].resources[0].guards).toHaveLength(1);
    expect(modules[0].resources[0].guards).toContain(childGuard);
    expect(modules[0].resources[0].guards).not.toContain(parentGuard);
  });

  it("handles multiple top-level modules", () => {
    const pages = [
      createMockPage("/dashboard"),
      createMockPage("/settings"),
      createMockPage("/profile"),
    ];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(3);
    expect(modules.map((m) => m.path).toSorted()).toEqual(["dashboard", "profile", "settings"]);
  });

  it("allows module directory without page.tsx", () => {
    const pages = [createMockPage("/admin/users"), createMockPage("/admin/roles")];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(1);
    expect(modules[0].path).toBe("admin");
    expect(modules[0].component).toBeUndefined();
    expect(modules[0].meta.menuItemClickable).toBe(false);
    expect(modules[0].resources).toHaveLength(2);
    expect(modules[0].resources.map((r) => r.path).toSorted()).toEqual(["roles", "users"]);
  });

  it("resource directory without page.tsx has undefined component", () => {
    const pages = [
      createMockPage("/dashboard"),
      createMockPage("/dashboard/namespace/page-a"),
      createMockPage("/dashboard/namespace/page-b"),
    ];
    const modules = convertPagesToModules(pages);

    expect(modules).toHaveLength(1);
    const namespaceResource = modules[0].resources[0];
    expect(namespaceResource.path).toBe("namespace");
    expect(namespaceResource.component).toBeUndefined();
    expect(namespaceResource.subResources).toHaveLength(2);
    expect(namespaceResource.subResources!.map((r) => r.path).toSorted()).toEqual([
      "page-a",
      "page-b",
    ]);
  });

  it("resource directory without page.tsx produces a 404 index route", () => {
    const pages = [createMockPage("/dashboard"), createMockPage("/dashboard/namespace/page-a")];
    const modules = convertPagesToModules(pages);

    const routes = createContentRoutes({ modules, settingsResources: [] });
    const moduleRoute = routes[1].children?.[0]; // "dashboard"
    const namespaceRoute = moduleRoute?.children?.[1]; // "namespace"
    expect(namespaceRoute?.path).toBe("namespace");

    const indexRoute = namespaceRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    expect(typeof indexRoute?.Component).toBe("function");
    expect(typeof indexRoute?.loader).toBe("function"); // 404 loader

    // Sub-resource should still be accessible
    const subResource = namespaceRoute?.children?.find((r) => r.path === "page-a");
    expect(subResource).toBeDefined();
  });

  it("module directory without page.tsx produces a 404 index route", () => {
    const pages = [createMockPage("/admin/users"), createMockPage("/admin/roles")];
    const modules = convertPagesToModules(pages);

    const routes = createContentRoutes({ modules, settingsResources: [] });
    const moduleRoute = routes[1].children?.[0]; // the "admin" route

    const indexRoute = moduleRoute?.children?.find(
      (r) => (r as { index?: boolean }).index === true,
    );
    expect(indexRoute).toBeDefined();
    expect(typeof indexRoute?.Component).toBe("function");
    expect(typeof indexRoute?.loader).toBe("function"); // 404 loader
  });
});

// ============================================
// Validation Tests
// ============================================

describe("validateExclusiveRouteConfig", () => {
  it("throws when both pages and modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(true, true)).toThrow("Cannot use both");
  });

  it("throws when neither pages nor modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(false, false)).toThrow("No routes configured");
  });

  it("does not throw when only pages are provided", () => {
    expect(() => validateExclusiveRouteConfig(true, false)).not.toThrow();
  });

  it("does not throw when only modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(false, true)).not.toThrow();
  });
});
