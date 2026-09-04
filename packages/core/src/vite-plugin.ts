/**
 * Re-export the Vite plugin from the main app-shell package.
 *
 * This allows users to import the plugin and its public option types from:
 *
 * @example
 * ```ts
 * import {
 *   appShellRoutes,
 *   type AppShellRoutesPluginOptions,
 *   type TypedRoutesOptions,
 * } from "@tailor-platform/app-shell/vite-plugin";
 * ```
 */
export { appShellRoutes } from "@tailor-platform/app-shell-vite-plugin";
export type {
  AppShellRoutesPluginOptions,
  TypedRoutesOptions,
} from "@tailor-platform/app-shell-vite-plugin";
