import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The bridge is what makes semantic tokens reachable as Tailwind utilities in
 * consumer apps (`bg-alert-info-background`). Nothing else in the suite covers
 * it: component snapshots record *class names*, not resolved CSS, so dropping a
 * bridge entry would leave every other test green while the utility silently
 * stops producing colour.
 */
const here = dirname(fileURLToPath(import.meta.url));
const bridge = readFileSync(join(here, "theme.bridge.css"), "utf8");
const defaultTheme = readFileSync(join(here, "themes/default.css"), "utf8");

/** Token names defined in the default palette for a given prefix, e.g. `alert`. */
function definedTokens(prefix: string): string[] {
  const matches = defaultTheme.matchAll(new RegExp(`^\\s*--(${prefix}-[a-z-]+):`, "gm"));
  return [...new Set([...matches].map((m) => m[1]))].toSorted();
}

/** Token names bridged as `--color-<name>`, mapped to the var() they resolve to. */
function bridgedTokens(prefix: string): Map<string, string> {
  const matches = bridge.matchAll(
    new RegExp(`^\\s*--color-(${prefix}-[a-z-]+):\\s*var\\(--([a-z-]+)\\);`, "gm"),
  );
  return new Map([...matches].map((m) => [m[1], m[2]]));
}

describe("theme bridge", () => {
  describe.each(["alert", "status"])("--%s-* tokens", (prefix) => {
    const defined = definedTokens(prefix);
    const bridged = bridgedTokens(prefix);

    it("defines at least one token in the default palette", () => {
      expect(defined.length).toBeGreaterThan(0);
    });

    it("bridges every token defined in the default palette", () => {
      expect([...bridged.keys()].toSorted()).toEqual(defined);
    });

    it("maps each bridged token to its own source variable", () => {
      // Guards against cross-wiring, e.g. --color-alert-info-foreground
      // accidentally resolving to var(--alert-info-foreground-muted).
      for (const [name, target] of bridged) {
        expect(target).toBe(name);
      }
    });
  });

  it("bridges all 20 alert slots", () => {
    // 5 variants x 4 slots. Pinned so that dropping a whole variant — which
    // would still satisfy the symmetry checks above if it were removed from
    // both files — fails loudly.
    expect(bridgedTokens("alert").size).toBe(20);
  });
});
