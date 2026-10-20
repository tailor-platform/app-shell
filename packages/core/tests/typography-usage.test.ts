import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the rule in decisions/typography-roles.md: component text takes a typography role,
// never a raw Tailwind size, and every role name used in a class exists.
const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(here, "../src/components");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name) ? [path] : [];
  });

const sources = sourceFiles(componentsDir).map((path) => ({
  file: relative(componentsDir, path),
  text: readFileSync(path, "utf8"),
}));

const roles = new Set(
  [
    ...readFileSync(join(here, "../src/assets/themes/default.css"), "utf8").matchAll(
      /^\s*--type-([a-z-]+)-size:/gm,
    ),
  ].map((m) => m[1]),
);

const findAll = (pattern: RegExp) =>
  sources.flatMap(({ file, text }) => [...text.matchAll(pattern)].map((m) => `${file}: ${m[0]}`));

describe("typography role usage in components", () => {
  it("uses no raw Tailwind text size", () => {
    expect(
      findAll(
        /astw:(?:[a-z0-9-]+:)*text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[0-9.]+(?:px|rem)\])(?![\w-])/g,
      ),
    ).toEqual([]);
  });

  it("uses no line height outside the roles except leading-none", () => {
    expect(findAll(/astw:(?:[^\s"'`:]+:)*leading-(?!none(?![\w-]))[\w.[\]-]+/g)).toEqual([]);
  });

  it("uses only defined role names in role classes", () => {
    const used = findAll(
      /astw:(?:[a-z0-9-]+:)*text-((?:heading|body|label|code)-[a-z0-9-]*)(?![\w-])/g,
    );
    expect(used.filter((hit) => !roles.has(hit.split("text-").pop() ?? ""))).toEqual([]);
  });

  it("pairs the code-sm class with font-mono", () => {
    const strings = sources.flatMap(({ file, text }) =>
      [...text.matchAll(/"[^"\n]*astw:text-code-sm[^"\n]*"/g)].map((m) => ({ file, s: m[0] })),
    );
    expect(strings.filter(({ s }) => !s.includes("astw:font-mono"))).toEqual([]);
  });
});
