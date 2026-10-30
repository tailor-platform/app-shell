import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Components read the semantic colour roles. The old status, alert and destructive
 * tokens are deprecated aliases for consumers (see decisions/semantic-color-roles.md),
 * so core code must not use them again.
 */
const root = join(import.meta.dirname, "../src");

const DEPRECATED = [
  // Tailwind utilities, with or without the astw: prefix and variants.
  /(?<![\w-])(?:bg|text|border(?:-[xytrblse])?|divide|outline|ring|ring-offset|fill|stroke|from|via|to|decoration|placeholder|caret|accent|shadow)-(?:destructive(?:-foreground)?|status-[a-z]+|alert-[a-z]+-[a-z-]+)(?![\w-])/g,
  // CSS variables.
  /--(?:destructive(?:-foreground)?|status-[a-z]+|alert-[a-z]+-[a-z-]+)(?![\w-])/g,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });
}

describe("deprecated colour tokens", () => {
  it("are not used in core source files", () => {
    const found = sourceFiles(root).flatMap((file) => {
      const text = readFileSync(file, "utf8");
      return DEPRECATED.flatMap((pattern) =>
        [...text.matchAll(pattern)].map((match) => `${relative(root, file)}: ${match[0]}`),
      );
    });
    expect(found).toEqual([]);
  });
});
