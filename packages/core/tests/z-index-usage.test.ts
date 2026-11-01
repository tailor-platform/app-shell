import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the stacking rule in decisions/floating-ui-stacking.md: a layer that sits
// on the viewport (fixed, portaled) takes a z token (`z-(--z-*)` or an inline
// `var(--z-*)`), never a raw value. Raw `z-10`/`z-20` stay allowed for local
// layering inside a component (a sticky table header, the timeline rails), where
// they are ordered within that component's own stacking context.
const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "../src");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [path] : [];
  });

const sources = sourceFiles(srcDir).map((path) => ({
  file: relative(srcDir, path),
  text: readFileSync(path, "utf8"),
}));

const tokens = new Set(
  [
    ...readFileSync(join(srcDir, "globals.css"), "utf8").matchAll(/^\s*--z-([a-z-]+):\s*\d+;/gm),
  ].map((m) => m[1]),
);

const findAll = (pattern: RegExp) =>
  sources.flatMap(({ file, text }) => [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`));

// Every quoted class list (string literal or template) in every source file.
const classLists = sources.flatMap(({ file, text }) =>
  [...text.matchAll(/["'`]([^"'`\n]*astw:[^"'`\n]*)["'`]/g)].map((m) => ({ file, classes: m[1] })),
);

const rawZ = /astw:(?:[a-z0-9-]+:)*z-(?:\d+|\[[^\]]+\])(?![\w-])/g;

describe("z-index usage", () => {
  it("declares the z tokens", () => {
    expect([...tokens].sort()).toEqual(["overlay", "popup", "sidebar", "sidebar-rail", "toast"]);
  });

  it("uses no raw z utility on a viewport-fixed element", () => {
    const hits = classLists
      .filter(({ classes }) => /astw:(?:[a-z0-9-]+:)*fixed(?![\w-])/.test(classes))
      .flatMap(({ file, classes }) => [...classes.matchAll(rawZ)].map((m) => `${file}: ${m[0]}`));
    expect(hits).toEqual([]);
  });

  it("uses no raw z value in the portal band or above (50+)", () => {
    const hits = findAll(rawZ).filter((hit) => {
      const value = Number(hit.match(/z-\[?(\d+)/)?.[1]);
      return Number.isNaN(value) || value >= 50;
    });
    expect(hits).toEqual([]);
  });

  it("sets an inline z-index only through a token", () => {
    const hits = findAll(/zIndex:\s*[^,\n}]+/g).filter((hit) => !/var\(--z-[a-z-]+\)/.test(hit));
    expect(hits).toEqual([]);
  });

  it("references only declared tokens", () => {
    const used = findAll(/(?:z-\(|var\()--z-([a-z-]+)\)/g);
    expect(used.filter((hit) => !tokens.has(hit.match(/--z-([a-z-]+)/)?.[1] ?? ""))).toEqual([]);
  });
});
