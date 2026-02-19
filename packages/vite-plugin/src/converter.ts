import type { ParsedSegment } from "./types";

// ============================================
// Path Parsing Utilities
// ============================================

/**
 * Parse a directory name into a path segment.
 *
 * Conversion rules:
 * - `orders` → static segment "orders"
 * - `[id]` → dynamic parameter ":id"
 * - `(group)` → group (excluded from path)
 * - `_name` → ignored (excluded from routing)
 */
export function parseSegment(dirName: string): ParsedSegment {
  // Ignored: _name (underscore prefix)
  if (dirName.startsWith("_")) {
    return {
      type: "ignored",
      original: dirName,
      converted: "",
    };
  }

  // Group: (name)
  if (dirName.startsWith("(") && dirName.endsWith(")")) {
    return {
      type: "group",
      original: dirName,
      converted: "",
    };
  }

  // Dynamic: [name]
  if (dirName.startsWith("[") && dirName.endsWith("]")) {
    const paramName = dirName.slice(1, -1);
    return {
      type: "dynamic",
      original: dirName,
      converted: `:${paramName}`,
    };
  }

  // Static
  return {
    type: "static",
    original: dirName,
    converted: dirName,
  };
}

/**
 * Parse a full path like "/dashboard/orders/[id]" into segments.
 */
export function parsePath(path: string): ParsedSegment[] {
  const segments = path.split("/").filter((s) => s.length > 0);
  return segments.map(parseSegment);
}

/**
 * Convert parsed segments back to a route path.
 * Groups and ignored segments are excluded from the output.
 */
export function segmentsToPath(segments: ParsedSegment[]): string {
  const pathParts = segments
    .filter((s) => s.type !== "group" && s.type !== "ignored")
    .map((s) => s.converted);

  return pathParts.length > 0 ? pathParts.join("/") : "";
}
