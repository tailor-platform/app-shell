import { describe, it, expect } from "vitest";
import { createAutoInjectPlugin } from "./auto-inject";
import {
  APP_SHELL_PACKAGE,
  VIRTUAL_PROXY_ID,
  VIRTUAL_APPSHELL_WITH_PAGES_ID,
  VIRTUAL_MODULE_ID,
} from "../constants";
import type { PluginContext, PluginState } from "../plugin";
import { createLogger } from "../utils/logger";

function createTestPlugin() {
  const state: PluginState = { resolvedPagesDir: "", cachedPages: null };
  const ctx: PluginContext = {
    options: {
      pagesDir: "src/pages",
      logLevel: "off",
      generateTypedRoutes: false,
      typedRoutesOutput: "",
    },
    state,
    log: createLogger("off"),
  };

  const plugin = createAutoInjectPlugin(ctx);
  const resolveId = plugin.resolveId as (id: string, importer: string | undefined) => string | null;
  const load = plugin.load as (id: string) => string | null;

  return { resolveId, load };
}

describe("auto-inject plugin", () => {
  describe("resolveId", () => {
    it("intercepts app-shell imports from user code", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId(APP_SHELL_PACKAGE, "/project/src/App.tsx");
      expect(result).toBe(VIRTUAL_PROXY_ID);
    });

    it("does NOT intercept imports from virtual modules (containing \\0)", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId(APP_SHELL_PACKAGE, "\0virtual:app-shell-proxy");
      expect(result).toBeNull();
    });

    it("ignores unrelated imports", () => {
      const { resolveId } = createTestPlugin();
      const result = resolveId("react", "/project/src/App.tsx");
      expect(result).toBeNull();
    });
  });

  describe("load", () => {
    it("proxy module re-exports real package and overrides AppShell from with-pages module", () => {
      const { load } = createTestPlugin();
      const code = load(VIRTUAL_PROXY_ID);
      expect(code).toContain(`export * from "${APP_SHELL_PACKAGE}"`);
      expect(code).toContain(`export { AppShell } from "${VIRTUAL_APPSHELL_WITH_PAGES_ID}"`);
      // The proxy must NOT import pages directly — that would cause TDZ
      expect(code).not.toContain(VIRTUAL_MODULE_ID);
    });

    it("with-pages module imports pages and wraps AppShell", () => {
      const { load } = createTestPlugin();
      const code = load(VIRTUAL_APPSHELL_WITH_PAGES_ID);
      expect(code).toContain(`import { pages } from "${VIRTUAL_MODULE_ID}"`);
      expect(code).toContain(
        `import { AppShell as _OriginalAppShell } from "${APP_SHELL_PACKAGE}"`,
      );
      expect(code).toContain("_OriginalAppShell.WithPages(pages)");
    });

    it("with-pages module does NOT re-export everything from app-shell", () => {
      const { load } = createTestPlugin();
      const code = load(VIRTUAL_APPSHELL_WITH_PAGES_ID);
      // If it did `export *`, page components importing Table etc. through
      // the with-pages module could still hit TDZ
      expect(code).not.toContain("export *");
    });

    it("returns null for unknown module ids", () => {
      const { load } = createTestPlugin();
      expect(load("unknown")).toBeNull();
    });
  });
});
