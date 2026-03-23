import { describe, it, expect } from "vitest";
import { createAutoInjectPlugin } from "./auto-inject";
import { APP_SHELL_PACKAGE, VIRTUAL_PROXY_ID, VIRTUAL_MODULE_ID } from "../constants";
import type { PluginContext, PluginState } from "../plugin";
import { createLogger } from "../utils/logger";

function createTestPlugin(entrypoint?: string) {
  const state: PluginState = { resolvedPagesDir: "", cachedPages: null };
  const ctx: PluginContext = {
    options: {
      pagesDir: "src/pages",
      logLevel: "off",
      generateTypedRoutes: false,
      typedRoutesOutput: "",
      entrypoint,
    },
    state,
    log: createLogger("off"),
  };

  const plugin = createAutoInjectPlugin(ctx);

  // Simulate configResolved to resolve entrypoint path
  if (plugin.configResolved) {
    const hook = plugin.configResolved as (config: { root: string }) => void;
    hook({ root: "/project" });
  }

  const resolveId = plugin.resolveId as (id: string, importer: string | undefined) => string | null;
  const load = plugin.load as (id: string) => string | null;

  return { resolveId, load };
}

describe("auto-inject plugin", () => {
  describe("resolveId with entrypoint", () => {
    it("intercepts app-shell imports from the entrypoint", () => {
      const { resolveId } = createTestPlugin("src/App.tsx");
      const result = resolveId(APP_SHELL_PACKAGE, "/project/src/App.tsx");
      expect(result).toBe(VIRTUAL_PROXY_ID);
    });

    it("does NOT intercept imports from non-entrypoint files", () => {
      const { resolveId } = createTestPlugin("src/App.tsx");
      const result = resolveId(APP_SHELL_PACKAGE, "/project/src/pages/dashboard/page.tsx");
      expect(result).toBeNull();
    });

    it("does NOT intercept imports from virtual modules", () => {
      const { resolveId } = createTestPlugin("src/App.tsx");
      const result = resolveId(APP_SHELL_PACKAGE, "\0virtual:app-shell-proxy");
      expect(result).toBeNull();
    });

    it("ignores unrelated imports", () => {
      const { resolveId } = createTestPlugin("src/App.tsx");
      const result = resolveId("react", "/project/src/App.tsx");
      expect(result).toBeNull();
    });
  });

  describe("resolveId without entrypoint (legacy)", () => {
    it("intercepts app-shell imports from any user file", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId(APP_SHELL_PACKAGE, "/project/src/App.tsx");
      expect(result).toBe(VIRTUAL_PROXY_ID);
    });

    it("intercepts app-shell imports from page components", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId(APP_SHELL_PACKAGE, "/project/src/pages/dashboard/page.tsx");
      expect(result).toBe(VIRTUAL_PROXY_ID);
    });

    it("does NOT intercept imports from virtual modules", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId(APP_SHELL_PACKAGE, "\0virtual:app-shell-proxy");
      expect(result).toBeNull();
    });
  });

  describe("load", () => {
    it("proxy module re-exports real package and overrides AppShell with pages", () => {
      const { load } = createTestPlugin();
      const code = load(VIRTUAL_PROXY_ID);
      expect(code).toContain(`import { pages } from "${VIRTUAL_MODULE_ID}"`);
      expect(code).toContain(`export * from "${APP_SHELL_PACKAGE}"`);
      expect(code).toContain("_OriginalAppShell.WithPages(pages)");
    });

    it("returns null for unknown module ids", () => {
      const { load } = createTestPlugin();
      expect(load("unknown")).toBeNull();
    });
  });
});
