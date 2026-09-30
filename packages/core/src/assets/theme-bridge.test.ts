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

  describe("typography roles", () => {
    const slots = ["size", "line-height", "weight", "letter-spacing"] as const;
    /** `--app-shell-type-<role>-<slot>` variables in the default palette, grouped by role. */
    const defined = new Map<string, Map<string, string>>();
    for (const m of defaultTheme.matchAll(
      /^\s*--app-shell-type-([a-z-]+)-(size|line-height|weight|letter-spacing):\s*([^;]+);/gm,
    )) {
      const role = m[1];
      defined.set(role, (defined.get(role) ?? new Map()).set(m[2], m[3].trim()));
    }
    /** Bridge entries `--text-<role>[--<suffix>]: var(--app-shell-type-...)`, keyed by property name. */
    const bridgedText = new Map(
      [...bridge.matchAll(/^\s*(--text-[a-z-]+):\s*var\((--app-shell-type-[a-z-]+)\);/gm)].map(
        (m) => [m[1], m[2]],
      ),
    );

    it("pins the role count at 10", () => {
      // Dropping a whole role from both files would still pass the symmetry checks.
      expect(defined.size).toBe(10);
    });

    it("defines exactly four variables per role", () => {
      for (const [role, values] of defined) {
        expect([...values.keys()].toSorted(), role).toEqual([...slots].toSorted());
      }
    });

    it("bridges every role slot to its own variable", () => {
      const suffix = {
        size: "",
        "line-height": "--line-height",
        weight: "--font-weight",
        "letter-spacing": "--letter-spacing",
      } as const;
      const expected = new Map<string, string>();
      for (const role of defined.keys()) {
        for (const slot of slots) {
          expected.set(`--text-${role}${suffix[slot]}`, `--app-shell-type-${role}-${slot}`);
        }
      }
      expect(bridgedText).toEqual(expected);
    });

    it("does not collide with a --color-* token that Tailwind resolves first", () => {
      // `text-<name>` resolves against --color-<name> before --text-<name>.
      const colors = [...bridge.matchAll(/^\s*--color-([a-z0-9-]+):/gm)].map((m) => m[1]);
      for (const role of defined.keys()) {
        expect(colors, role).not.toContain(role);
      }
      for (const name of colors) {
        expect(name).not.toMatch(/^(heading|body|label|code)(-|$)/);
      }
    });

    it("keeps the line boxes on the spec values", () => {
      // size (px) x line-height ratio = line box (px); weight and letter spacing are pinned too. Values from decisions/typography-roles.md.
      const spec: Record<
        string,
        [size: number, lineBox: number, weight: number, letterSpacing: string]
      > = {
        "heading-lg": [24, 32, 700, "-0.025em"],
        "heading-md": [18, 28, 600, "0em"],
        "heading-sm": [14, 20, 600, "0em"],
        "body-md": [14, 20, 400, "0em"],
        "body-sm": [12, 16, 400, "0em"],
        "label-md": [14, 20, 500, "0em"],
        "label-sm": [12, 16, 500, "0em"],
        "code-sm": [12, 18, 400, "0em"],
        "body-md-relaxed": [14, 24, 400, "0em"],
        "body-sm-relaxed": [12, 20, 400, "0em"],
      };
      expect([...defined.keys()].toSorted()).toEqual(Object.keys(spec).toSorted());
      for (const [role, [size, lineBox, weight, letterSpacing]] of Object.entries(spec)) {
        const values = defined.get(role)!;
        const rem = /^([0-9.]+)rem$/.exec(values.get("size") ?? "");
        expect(rem, `${role} size`).not.toBeNull();
        expect(Number(rem![1]) * 16, `${role} size`).toBe(size);
        const ratio = /^calc\((\d+) \/ (\d+)\)$/.exec(values.get("line-height") ?? "");
        expect(ratio, `${role} line-height`).not.toBeNull();
        expect(Number(ratio![2]), `${role} ratio base`).toBe(size);
        expect(Number(ratio![1]), `${role} line box`).toBe(lineBox);
        expect(Number(values.get("weight")), `${role} weight`).toBe(weight);
        expect(values.get("letter-spacing"), `${role} letter-spacing`).toBe(letterSpacing);
      }
    });
  });
});
