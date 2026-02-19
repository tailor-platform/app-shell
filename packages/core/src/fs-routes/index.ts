/**
 * Internal file-based routing implementation.
 *
 * This module is internal and should not be imported directly by users.
 * Use @tailor-platform/app-shell for public types like AppShellPageProps.
 *
 * @internal
 */

// Types
export type {
  AppShellPageProps,
  PageComponent,
  PageEntry,
  VirtualPagesModule,
  AppShellRoutesPluginOptions,
  ValidationLevel,
  PathSegmentType,
  ParsedSegment,
} from "./types";

// Converter
export {
  convertPagesToModules,
  validateExclusiveRouteConfig,
  parseSegment,
  parsePath,
  segmentsToPath,
} from "./converter";

// Typed paths
export { createTypedPaths } from "./typed-paths";
