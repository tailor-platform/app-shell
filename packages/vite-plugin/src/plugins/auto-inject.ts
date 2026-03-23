import path from "node:path";
import type { Plugin } from "vite";
import { normalizePath } from "vite";
import type { PluginContext } from "../plugin";
import { VIRTUAL_MODULE_ID, APP_SHELL_PACKAGE, VIRTUAL_PROXY_ID } from "../constants";

/**
 * Create the auto-inject plugin.
 *
 * This plugin intercepts @tailor-platform/app-shell imports and replaces
 * AppShell with a version that has pages pre-configured via AppShell.WithPages().
 *
 * ## Entrypoint mode (recommended)
 *
 * When `options.entrypoint` is set, only imports from that file are intercepted.
 * All other files import directly from the real package, so there is no circular
 * dependency in the module graph.
 *
 * ## Legacy mode (entrypoint not set)
 *
 * All user-code imports are intercepted. This creates a circular dependency
 * (proxy → pages → page components → proxy) which works in practice because
 * indirect re-exports resolve to the already-evaluated real package. However,
 * page components must NOT import `AppShell` in this mode, as it would hit a
 * TDZ error.
 */
export function createAutoInjectPlugin(ctx: PluginContext): Plugin {
  const { log } = ctx;
  let resolvedEntrypoint: string | undefined;

  return {
    name: "app-shell-auto-pages-inject",
    enforce: "pre",

    configResolved(config) {
      if (ctx.options.entrypoint) {
        resolvedEntrypoint = normalizePath(path.resolve(config.root, ctx.options.entrypoint));
        log.debug(`Entrypoint resolved to ${resolvedEntrypoint}`);
      }
    },

    resolveId(id, importer) {
      if (id === APP_SHELL_PACKAGE && importer && !importer.includes("\0")) {
        // When entrypoint is set, only intercept imports from that file
        if (resolvedEntrypoint && normalizePath(importer) !== resolvedEntrypoint) {
          return null;
        }
        log.debug(`Intercepting import of ${APP_SHELL_PACKAGE} from ${importer}`);
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
