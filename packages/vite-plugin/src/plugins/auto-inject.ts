import type { Plugin } from "vite";
import type { PluginContext } from "../plugin";
import {
  VIRTUAL_MODULE_ID,
  APP_SHELL_PACKAGE,
  VIRTUAL_PROXY_ID,
} from "../constants";

/**
 * Create the auto-inject plugin.
 *
 * This plugin intercepts @tailor-platform/app-shell imports
 * and wraps AppShell with pre-configured pages using AppShell.WithPages().
 */
export function createAutoInjectPlugin(ctx: PluginContext): Plugin {
  const { log } = ctx;

  return {
    name: "app-shell-auto-pages-inject",
    enforce: "pre",

    resolveId(id, importer) {
      // Only intercept imports from user code, not from our proxy
      if (id === APP_SHELL_PACKAGE && importer && !importer.includes("\0")) {
        log.debug(`Intercepting import of ${APP_SHELL_PACKAGE}`);
        return VIRTUAL_PROXY_ID;
      }
      return null;
    },

    load(id) {
      if (id === VIRTUAL_PROXY_ID) {
        log.debug("Loading app-shell proxy module");
        // Generate a proxy module that:
        // 1. Imports pages from virtual:app-shell-pages
        // 2. Wraps AppShell with WithPages to inject pages
        // 3. Re-exports everything from the real package
        return `
import { pages } from "${VIRTUAL_MODULE_ID}";
import { AppShell as _OriginalAppShell } from "${APP_SHELL_PACKAGE}";

// Re-export everything from the original package
export * from "${APP_SHELL_PACKAGE}";

// Override AppShell with pages pre-configured via WithPages
export const AppShell = _OriginalAppShell.WithPages(pages);
`.trim();
      }
      return null;
    },
  };
}
