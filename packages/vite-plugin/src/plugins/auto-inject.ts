import type { Plugin } from "vite";
import type { PluginContext } from "../plugin";
import {
  VIRTUAL_MODULE_ID,
  APP_SHELL_PACKAGE,
  VIRTUAL_PROXY_ID,
  VIRTUAL_APPSHELL_WITH_PAGES_MODULE,
  VIRTUAL_APPSHELL_WITH_PAGES_ID,
} from "../constants";

/**
 * Create the auto-inject plugin.
 *
 * This plugin intercepts @tailor-platform/app-shell imports and replaces them
 * with a proxy that re-exports everything from the real package but overrides
 * AppShell with a version that has pages pre-configured.
 *
 * To avoid circular TDZ errors, the proxy is split into two virtual modules:
 *
 *   proxy (\0virtual:app-shell-proxy)
 *     - Re-exports everything from the real @tailor-platform/app-shell
 *     - Overrides AppShell by importing it from the "with-pages" module
 *     - Does NOT import pages or page components
 *
 *   with-pages (\0virtual:app-shell-with-pages)
 *     - Imports pages from virtual:app-shell-pages
 *     - Wraps _OriginalAppShell.WithPages(pages)
 *
 * This separation ensures that when page components (or their transitive
 * dependencies like app-module) import from @tailor-platform/app-shell,
 * they resolve through the proxy whose re-exports are already initialized
 * — no circular dependency on page loading.
 */
export function createAutoInjectPlugin(ctx: PluginContext): Plugin {
  const { log } = ctx;

  return {
    name: "app-shell-auto-pages-inject",
    enforce: "pre",

    resolveId(id, importer) {
      // Only intercept imports from user code, not from our virtual modules
      if (id === APP_SHELL_PACKAGE && importer && !importer.includes("\0")) {
        log.debug(`Intercepting import of ${APP_SHELL_PACKAGE}`);
        return VIRTUAL_PROXY_ID;
      }
      // Resolve the with-pages virtual module
      if (id === VIRTUAL_APPSHELL_WITH_PAGES_MODULE) {
        return VIRTUAL_APPSHELL_WITH_PAGES_ID;
      }
      return null;
    },

    load(id) {
      if (id === VIRTUAL_PROXY_ID) {
        log.debug("Loading app-shell proxy module");
        // Re-export everything from the real package, but override AppShell
        // with the pages-injected version from a separate virtual module.
        // This module does NOT import pages, so no circular dependency.
        return [
          `export * from "${APP_SHELL_PACKAGE}";`,
          `export { AppShell } from "${VIRTUAL_APPSHELL_WITH_PAGES_MODULE}";`,
        ].join("\n");
      }

      if (id === VIRTUAL_APPSHELL_WITH_PAGES_ID) {
        log.debug("Loading app-shell-with-pages module");
        // This module is the only place that imports pages.
        // It is NOT part of the re-export chain, so page components
        // importing from the proxy won't trigger circular evaluation.
        return [
          `import { pages } from "${VIRTUAL_MODULE_ID}";`,
          `import { AppShell as _OriginalAppShell } from "${APP_SHELL_PACKAGE}";`,
          `export const AppShell = _OriginalAppShell.WithPages(pages);`,
        ].join("\n");
      }

      return null;
    },
  };
}
