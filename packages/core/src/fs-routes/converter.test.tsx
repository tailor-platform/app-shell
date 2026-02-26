import { describe, it, expect } from "vitest";
import {
  convertPagesToModules,
  validateExclusiveRouteConfig,
} from "./converter";
import type { PageEntry, PageComponent } from "./types";

// ============================================
// Converter Tests
// ============================================

describe("convertPagesToModules", () => {
  const createMockPage = (
    path: string,
    appShellPageProps?: PageComponent["appShellPageProps"],
  ): PageEntry => {
    const component: PageComponent = () => null;
    if (appShellPageProps) {
      component.appShellPageProps = appShellPageProps;
    }
    return { path, component };
  };

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
    const pages = [
      createMockPage("/dashboard", { meta: { title: "Dashboard" } }),
    ];
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
    const parentGuard = async () => ({ type: "pass" as const });
    const childGuard = async () => ({ type: "pass" as const });

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
    expect(modules.map((m) => m.path).sort()).toEqual([
      "dashboard",
      "profile",
      "settings",
    ]);
  });
});

// ============================================
// Validation Tests
// ============================================

describe("validateExclusiveRouteConfig", () => {
  it("throws when both pages and modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(true, true)).toThrow(
      "Cannot use both",
    );
  });

  it("throws when neither pages nor modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(false, false)).toThrow(
      "No routes configured",
    );
  });

  it("does not throw when only pages are provided", () => {
    expect(() => validateExclusiveRouteConfig(true, false)).not.toThrow();
  });

  it("does not throw when only modules are provided", () => {
    expect(() => validateExclusiveRouteConfig(false, true)).not.toThrow();
  });
});
