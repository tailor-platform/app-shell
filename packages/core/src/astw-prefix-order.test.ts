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
 */
const srcDir = dirname(fileURLToPath(import.meta.url));

/** Whitespace-delimited tokens containing `astw:`, quotes excluded so a token stops at the string literal's edge. */
const TOKEN = /[^\s"'`]*astw:[^\s"'`]*/g;

function misorderedClasses(source: string): { line: number; token: string }[] {
  return source.split("\n").flatMap((text, index) =>
    [...text.matchAll(TOKEN)]
      .map((match) => match[0])
      .filter((token) => !token.startsWith("astw:"))
      .map((token) => ({ line: index + 1, token })),
  );
}

describe("astw: prefix order", () => {
  const files = globSync("**/*.{ts,tsx}", { cwd: srcDir })
    .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .toSorted();

  it("scans the whole package source", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("writes the prefix as the first segment of every class", () => {
    const offenders = files.flatMap((file) =>
      misorderedClasses(readFileSync(join(srcDir, file), "utf8")).map(
        ({ line, token }) => `${file}:${line}  ${token}  ->  astw:${token.replace("astw:", "")}`,
      ),
    );

    expect(offenders).toEqual([]);
  });
});
