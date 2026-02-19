// ============================================
// Vite Plugin Options
// ============================================

/**
 * Log level for plugin output.
 * - "info": Show detected routes table (default)
 * - "debug": Show all debug information including raw data
 * - "off": Disable all logging
 */
export type LogLevel = "info" | "debug" | "off";

/**
 * Options for generating typed routes.
 */
export type TypedRoutesOptions = {
  /**
   * Output path for the generated typed routes file.
   * Relative to the project root.
   * @default "src/routes.generated.ts"
   */
  output?: string;
};

/**
 * Options for the appShellRoutes Vite plugin.
 */
export type AppShellRoutesPluginOptions = {
  /**
   * Directory containing page files.
   * @default "src/pages"
   */
  pagesDir?: string;

  /**
   * Log level for plugin output.
   * - "info": Show detected routes table (default)
   * - "debug": Show all debug information including raw data
   * - "off": Disable all logging
   * @default "info"
   */
  logLevel?: LogLevel;

  /**
   * Generate a TypeScript file with type-safe route definitions.
   * When enabled, creates a file exporting `paths` helper with typed `for()` method.
   *
   * - `true`: Generate with default output path ("src/routes.generated.ts")
   * - `{ output: string }`: Generate with custom output path
   * - `false` or omitted: Disabled
   *
   * @default false
   */
  generateTypedRoutes?: boolean | TypedRoutesOptions;
};

// ============================================
// Path Conversion Types
// ============================================

/**
 * Segment types for path conversion.
 */
export type PathSegmentType =
  | "static" // Regular path segment (e.g., "orders")
  | "dynamic" // Dynamic parameter (e.g., "[id]" -> ":id")
  | "group" // Route group (e.g., "(admin)" -> excluded from path)
  | "ignored"; // Ignored segment (e.g., "_lib" -> excluded from routing)

/**
 * Parsed path segment information.
 */
export type ParsedSegment = {
  type: PathSegmentType;
  /**
   * Original directory name
   */
  original: string;
  /**
   * Converted segment for routing (empty for groups)
   */
  converted: string;
};
