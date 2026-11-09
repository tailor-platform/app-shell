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

// Every `--z-*` declaration in `globals.css`, name to value. A token holds a
// number; an old name holds `var(--z-*)` and is kept only for consumers until
// the next major (tailor-inc/platform-planning#2084). `--z-sidebar-rail` is the
// one old name with a number: the rail orders itself inside the sidebar with a
// raw `z-20` now, and the variable stays for consumers who referenced it.
const declarations = Object.fromEntries(
  [
    ...readFileSync(join(srcDir, "globals.css"), "utf8").matchAll(
      /^\s*--z-([a-z-]+):\s*([^;]+);/gm,
    ),
  ].map((m) => [m[1], m[2]]),
);
const tokens = new Set(["nav", "portal", "toast"]);

const findAll = (pattern: RegExp) =>
  sources.flatMap(({ file, text }) => [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`));

// Every class list in a double-quoted string or a template literal (the two
// forms the formatter leaves in source). A single quote may appear inside an
// arbitrary variant such as `[class*='size-']`, so it does not end the list.
const classLists = sources.flatMap(({ file, text }) =>
  [...text.matchAll(/["`]([^"`\n]*astw:[^"`\n]*)["`]/g)].map((m) => ({ file, classes: m[1] })),
);

// A raw z utility: a number or an arbitrary value that is not a z token.
const rawZ = /astw:(?:[a-z0-9-]+:)*z-(?:\d+|\[(?!var\(--z-)[^\]]+\])(?![\w-])/g;

describe("z-index usage", () => {
  it("declares the z tokens and keeps the old names as aliases", () => {
    expect(declarations).toEqual({
      nav: "10",
      portal: "50",
      toast: "100",
      sidebar: "var(--z-nav)",
      "sidebar-rail": "20",
      popup: "var(--z-portal)",
      overlay: "var(--z-portal)",
    });
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

  it("references only the tokens, never an old name", () => {
    const used = findAll(/(?:z-\(|var\()--z-([a-z-]+)\)/g);
    expect(used.filter((hit) => !tokens.has(hit.match(/--z-([a-z-]+)/)?.[1] ?? ""))).toEqual([]);
  });
});
