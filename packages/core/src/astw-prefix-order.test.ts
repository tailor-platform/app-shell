import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Tailwind v4 requires a configured prefix to be the *first* segment of a class
 * name, so `hover:astw:opacity-100` is not a class Tailwind recognises — it
 * emits nothing, with no error and no warning. Nothing else in the suite covers
 * it: snapshots record class names rather than resolved CSS, so a misordered
 * class stays green while the style it was meant to apply never ships.
 *
 * Boundary: this reads source text, so it cannot see a class assembled across
 * string literals (`"astw:flex " + variant + ":astw:hidden"`). Prose outside
 * this package (docs, decisions) is out of scope too.
 */
const srcDir = dirname(fileURLToPath(import.meta.url));

/** Whitespace-delimited tokens containing `astw:`, quotes excluded so a token stops at the string literal's edge. */
const TOKEN = /[^\s"'`]*astw:[^\s"'`]*/g;

/**
 * A token is well-formed only if `astw:` appears exactly once, at position 0.
 * Checking every occurrence rather than just the start also catches the
 * doubled `astw:hover:astw:opacity-100` shape, which `startsWith` would pass.
 */
function misorderedClasses(source: string): { line: number; token: string }[] {
  return source.split("\n").flatMap((text, index) =>
    [...text.matchAll(TOKEN)]
      .map((match) => match[0])
      .filter((token) => token.indexOf("astw:") !== 0 || token.indexOf("astw:", 1) !== -1)
      .map((token) => ({ line: index + 1, token })),
  );
}

/** `hover:astw:opacity-100` -> `astw:hover:opacity-100`; also collapses a doubled prefix. */
function suggest(token: string): string {
  return `astw:${token.replaceAll("astw:", "")}`;
}

describe("astw: prefix order", () => {
  // .css is in scope because globals.css drives five `@apply astw:*` rules,
  // where the same mistake is just as silent.
  const files = globSync("**/*.{ts,tsx,css}", { cwd: srcDir })
    .filter((file) => !/\.test\.tsx?$/.test(file))
    .toSorted();

  it("scans the whole package source", () => {
    // Pinned near the real count so a glob regression that drops
    // components/ (the bulk of it) fails rather than passing on a remnant.
    expect(files.length).toBeGreaterThan(180);
  });

  it("writes the prefix as the first segment of every class", () => {
    const offenders = files.flatMap((file) =>
      misorderedClasses(readFileSync(join(srcDir, file), "utf8")).map(
        ({ line, token }) => `${file}:${line}  ${token}  ->  ${suggest(token)}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});
