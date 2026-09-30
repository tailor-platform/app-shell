import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { badgeVariants } from "./badge";

/**
 * Badge is precompiled with `astw:` utilities. A `bg-semantic-*` class whose
 * token is missing from the Tailwind bridge emits no CSS and fails silently,
 * so check every semantic utility a variant uses against `theme.bridge.css`.
 */
const bridge = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../assets/theme.bridge.css"),
  "utf8",
);

const variants = [
  "success",
  "warning",
  "error",
  "info",
  "subtle-success",
  "subtle-warning",
  "subtle-error",
  "subtle-info",
] as const;

describe("badgeVariants semantic colour classes", () => {
  it.each(variants)("%s uses only bridged semantic tokens", (variant) => {
    const classes = badgeVariants({ variant }).split(/\s+/);
    const tokens = classes
      .map((c) => /^astw:(?:hover:)?(?:bg|text)-(semantic-[a-z-]+)$/.exec(c)?.[1])
      .filter((t): t is string => t !== undefined);

    expect(tokens.length).toBeGreaterThanOrEqual(3);
    for (const token of tokens) {
      expect(bridge).toContain(`--color-${token}:`);
    }
  });
});
