/**
 * Vite plugin for file-based routing in app-shell.
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
export { appShellRoutes } from "./plugin";

// Types
export type {
  AppShellRoutesPluginOptions,
  TypedRoutesOptions,
  PathSegmentType,
  ParsedSegment,
} from "./types";

// Path utilities
export { parseSegment, parsePath, segmentsToPath } from "./converter";
