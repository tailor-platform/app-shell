import type { LogLevel } from "../types";
import type { PageFile } from "./scanner";
import { LOG_PREFIX } from "../constants";

// ============================================
// Logger
// ============================================

export type Logger = {
  info: (message: string) => void;
  debug: (message: string, data?: unknown) => void;
};

/**
 * Create a logger with the specified log level.
 */
export function createLogger(logLevel: LogLevel): Logger {
  const logInfo = (message: string) => {
    if (logLevel === "info" || logLevel === "debug") {
      console.log(`[${LOG_PREFIX}] ${message}`);
    }
  };

  const logDebug = (message: string, data?: unknown) => {
    if (logLevel === "debug") {
      console.log(`[${LOG_PREFIX}] ${message}`);
      if (data !== undefined) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  };

  return { info: logInfo, debug: logDebug };
}

// ============================================
// Route Table Formatting
// ============================================

/**
 * Format routes as an ASCII table for info-level logging.
 *
 * Example output:
 * ```
 * route                    path
 * ----------------------   ------------------------------------------
 * /                        src/pages/page.tsx
 * /dashboard               src/pages/dashboard/page.tsx
 * /dashboard/orders        src/pages/dashboard/orders/page.tsx
 * /dashboard/orders/:id    src/pages/dashboard/orders/[id]/page.tsx
 * ```
 */
export function formatRoutesTable(pages: PageFile[], pagesDir: string): string {
  if (pages.length === 0) {
    return "  (no routes detected)";
  }

  // Sort pages: root first, then nested alphabetically
  const sortedPages = [...pages].sort((a, b) => {
    const routeA = a.routePath ? `/${a.routePath}` : "/";
    const routeB = b.routePath ? `/${b.routePath}` : "/";

    // Root route comes first
    if (routeA === "/") return -1;
    if (routeB === "/") return 1;

    // Sort alphabetically (which naturally handles nesting)
    return routeA.localeCompare(routeB);
  });

  // Calculate column widths
  const routes = sortedPages.map((p) =>
    p.routePath ? `/${p.routePath}` : "/",
  );
  const paths = sortedPages.map(
    (p) =>
      pagesDir + (p.relativePath ? `/${p.relativePath}` : "") + "/page.tsx",
  );

  const routeHeader = "route";
  const pathHeader = "path";

  const maxRouteWidth = Math.max(
    routeHeader.length,
    ...routes.map((r) => r.length),
  );
  const maxPathWidth = Math.max(
    pathHeader.length,
    ...paths.map((p) => p.length),
  );

  // Build table
  const lines: string[] = [];

  // Header row
  lines.push(`  ${routeHeader.padEnd(maxRouteWidth)}   ${pathHeader}`);

  // Separator row
  lines.push(`  ${"-".repeat(maxRouteWidth)}   ${"-".repeat(maxPathWidth)}`);

  // Data rows
  for (let i = 0; i < pages.length; i++) {
    lines.push(`  ${routes[i].padEnd(maxRouteWidth)}   ${paths[i]}`);
  }

  return lines.join("\n");
}
