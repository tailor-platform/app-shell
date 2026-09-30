// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

/**
 * Compiles theme.bridge.css with Tailwind and checks the emitted utility rules.
 * The string-level checks in src/assets/theme-bridge.test.ts confirm that the
 * bridge names the right variables. This test confirms that Tailwind turns those
 * entries into the four declarations a role needs, both for AppShell's own
 * prefixed build (`astw:`) and for a consumer's unprefixed build.
 */
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "../src/assets");
const defaultTheme = readFileSync(join(assetsDir, "themes/default.css"), "utf8");

async function compile(header: string, candidates: string[]): Promise<string> {
  const css = `${header}
@source inline("${candidates.join(" ")}");
@import "./theme.bridge.css";
`;
  // `from` must be a real path inside packages/core so that `tailwindcss` and
  // `./theme.bridge.css` resolve.
  const result = await postcss([tailwind()]).process(css, { from: join(assetsDir, "entry.css") });
  return result.css;
}

/** The declarations of the rule with the given selector, as a property to value map. */
function declarationsOf(css: string, selector: string): Map<string, string> {
  const root = postcss.parse(css);
  const declarations = new Map<string, string>();
  root.walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls((decl) => {
      declarations.set(decl.prop, decl.value.replace(/\s+/g, " ").trim());
    });
  });
  return declarations;
}

describe("typography role utilities", () => {
  it.each([
    [
      "prefixed (AppShell build)",
      '@import "tailwindcss" prefix(astw) source(none);',
      "astw:",
      "astw\\:",
    ],
    ["unprefixed (consumer build)", '@import "tailwindcss" source(none);', "", ""],
  ])(
    "%s emits all four declarations from the role variables",
    async (_name, header, prefix, escaped) => {
      const css = await compile(header, [`${prefix}text-label-md`, `${prefix}text-heading-lg`]);

      const label = declarationsOf(css, `.${escaped}text-label-md`);
      expect(label.get("font-size")).toBe("var(--app-shell-type-label-md-size)");
      expect(label.get("line-height")).toBe(
        "var(--tw-leading, var(--app-shell-type-label-md-line-height))",
      );
      expect(label.get("font-weight")).toBe(
        "var(--tw-font-weight, var(--app-shell-type-label-md-weight))",
      );
      expect(label.get("letter-spacing")).toBe(
        "var(--tw-tracking, var(--app-shell-type-label-md-letter-spacing))",
      );

      const heading = declarationsOf(css, `.${escaped}text-heading-lg`);
      expect(heading.get("font-size")).toBe("var(--app-shell-type-heading-lg-size)");
    },
  );

  it("lets stock leading-* utilities override the role line-height", async () => {
    // `leading-none` sets --tw-leading, which the role reads before its own variable.
    const css = await compile('@import "tailwindcss" source(none);', [
      "text-label-md",
      "leading-none",
    ]);
    expect(declarationsOf(css, ".leading-none").get("--tw-leading")).toBe("1");
    expect(declarationsOf(css, ".text-label-md").get("line-height")).toMatch(/^var\(--tw-leading,/);
  });

  it("emits every role defined in the default palette", async () => {
    const roles = [
      ...new Set(
        [...defaultTheme.matchAll(/^\s*--app-shell-type-([a-z-]+)-size:/gm)].map((m) => m[1]),
      ),
    ];
    const css = await compile(
      '@import "tailwindcss" source(none);',
      roles.map((role) => `text-${role}`),
    );
    for (const role of roles) {
      const decls = declarationsOf(css, `.text-${role}`);
      expect(decls.get("font-size"), role).toBe(`var(--app-shell-type-${role}-size)`);
      expect(decls.size, role).toBe(4);
    }
  });
});
