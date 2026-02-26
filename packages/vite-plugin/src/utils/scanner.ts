import fs from "node:fs";
import path from "node:path";
import { parseSegment, segmentsToPath } from "../parser";
import { PAGE_FILE_NAME } from "../constants";

// ============================================
// Types
// ============================================

export type PageFile = {
  /** Absolute file path */
  filePath: string;
  /** Relative path from pagesDir (e.g., "dashboard/orders/[id]") */
  relativePath: string;
  /** Converted route path (e.g., "dashboard/orders/:id") */
  routePath: string;
};

// ============================================
// File System Utilities
// ============================================

/**
 * Recursively scan directory for page.tsx files.
 */
export function scanPages(dir: string, baseDir: string): PageFile[] {
  const pages: PageFile[] = [];

  if (!fs.existsSync(dir)) {
    return pages;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip directories that start with underscore
      if (entry.name.startsWith("_")) {
        continue;
      }
      // Recurse into subdirectories
      pages.push(...scanPages(fullPath, baseDir));
    } else if (entry.isFile() && entry.name === PAGE_FILE_NAME) {
      // Found a page file
      const relativePath = path.relative(baseDir, path.dirname(fullPath));
      const routePath = convertPathToRoute(relativePath);

      pages.push({
        filePath: fullPath,
        relativePath,
        routePath,
      });
    }
  }

  return pages;
}

/**
 * Convert a file system path to a route path.
 *
 * Examples:
 * - "" → ""
 * - "dashboard" → "dashboard"
 * - "dashboard/orders/[id]" → "dashboard/orders/:id"
 * - "(admin)/settings" → "settings"
 */
export function convertPathToRoute(relativePath: string): string {
  if (!relativePath) return "";

  const segments = relativePath.split(path.sep).map(parseSegment);
  return segmentsToPath(segments);
}
