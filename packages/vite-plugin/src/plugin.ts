import type { Plugin } from "vite";
import type { AppShellRoutesPluginOptions, LogLevel } from "./types";
import type { PageFile } from "./utils/scanner";
import type { Logger } from "./utils/logger";
import { createLogger } from "./utils/logger";
import { createVirtualPagesPlugin } from "./plugins/virtual-pages";
import { createAutoInjectPlugin } from "./plugins/auto-inject";
import { createTypedRoutesPlugin } from "./plugins/typed-routes";

// ============================================
// Plugin Context
// ============================================

/**
 * Resolved options with defaults applied.
 */
export type ResolvedOptions = {
  pagesDir: string;
  logLevel: LogLevel;
  generateTypedRoutes: boolean;
  typedRoutesOutput: string;
};

/**
 * Shared state between plugins.
 */
export type PluginState = {
  resolvedPagesDir: string;
  cachedPages: PageFile[] | null;
};

/**
 * Context shared between plugins.
 */
export type PluginContext = {
  options: ResolvedOptions;
  state: PluginState;
  log: Logger;
};

/**
 * Create plugin context from user options.
 */
function createPluginContext(
  userOptions: AppShellRoutesPluginOptions,
): PluginContext {
  const typedRoutesConfig = userOptions.generateTypedRoutes;
  const generateTypedRoutes = Boolean(typedRoutesConfig);
  const typedRoutesOutput =
    typeof typedRoutesConfig === "object" && typedRoutesConfig.output
      ? typedRoutesConfig.output
      : "src/routes.generated.ts";

  const options: ResolvedOptions = {
    pagesDir: userOptions.pagesDir ?? "src/pages",
    logLevel: userOptions.logLevel ?? "info",
    generateTypedRoutes,
    typedRoutesOutput,
  };

  const state: PluginState = {
    resolvedPagesDir: "",
    cachedPages: null,
  };

  const log = createLogger(options.logLevel);

  return { options, state, log };
}

// ============================================
// Vite Plugin
// ============================================

/**
 * Vite plugin for file-based routing in app-shell.
 *
 * This plugin:
 * 1. Scans `pagesDir` for page.tsx files
 * 2. Generates a virtual module `virtual:app-shell-pages`
 * 3. Validates appShellProps schema
 * 4. Supports HMR for page changes
 * 5. Auto-injects pages into pagesRegistry
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import react from '@vitejs/plugin-react';
 * import { appShellRoutes } from '@tailor-platform/app-shell-vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     react(),
 *     appShellRoutes({ pagesDir: 'src/pages' }),
 *   ],
 * });
 * ```
 */
export function appShellRoutes(
  options: AppShellRoutesPluginOptions = {},
): Plugin[] {
  const ctx = createPluginContext(options);

  const plugins: Plugin[] = [
    createVirtualPagesPlugin(ctx),
    createAutoInjectPlugin(ctx),
  ];

  if (ctx.options.generateTypedRoutes) {
    plugins.push(createTypedRoutesPlugin(ctx));
  }

  return plugins;
}
