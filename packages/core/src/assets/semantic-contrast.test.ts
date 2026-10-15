import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * WCAG 1.4.3 contrast checks for the semantic colour roles, computed from
 * `themes/default.css` itself. Nothing is copied into the test, so a change to
 * a hue step or an alias that breaks a pair fails here.
 *
 * Scope of the guarantee: the default state of each pair, on the default
 * palette's `--card` and `--background`. Not covered on purpose:
 * - hover states (`surface-hover`) against 4.5:1: subtle-badge hover text is
 *   below 4.5:1 for some roles (danger and success in light mode). They are held
 *   at a documented floor (MIN_HOVER_TEXT) so they cannot get worse unnoticed,
 *   see decisions/semantic-color-roles.md;
 * - branded palettes (cream, bloom) and their tinted shell backgrounds;
 * - the neutral intent, whose values are the pre-existing system tokens;
 * - the warning `solid` fill against the card (a fill, not a text pair).
 */
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "themes/default.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

type Rgba = { r: number; g: number; b: number; a: number };
type Mode = "light" | "dark";

/** Custom properties in effect on <html> for a mode, applying rules in source order. */
function variablesFor(mode: Mode): Map<string, string> {
  const vars = new Map<string, string>();
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].split(",").map((s) => s.trim());
    // <html class="dark"> matches both `:root` and `.dark`; light matches `:root` only.
    const applies = selectors.some((s) => s === ":root" || (mode === "dark" && s === ".dark"));
    if (!applies) continue;
    for (const decl of rule[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      vars.set(decl[1], decl[2].replace(/\s+/g, " ").trim());
    }
  }
  return vars;
}

function parseColor(value: string, vars: Map<string, string>): Rgba {
  const v = value.trim();
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  if (ref) {
    const target = vars.get(ref[1]);
    if (target === undefined) throw new Error(`Undefined variable ${ref[1]}`);
    return parseColor(target, vars);
  }
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) throw new Error(`Bad hex colour ${v}`);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(v);
  if (fn) {
    const [r, g, b, a = "1"] = fn[1].split(",").map((p) => p.trim());
    return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
  }
  throw new Error(`Unsupported colour syntax: ${v}`);
}

function over(top: Rgba, base: Rgba): Rgba {
  const a = top.a + base.a * (1 - top.a);
  const mix = (t: number, b: number) => (t * top.a + b * base.a * (1 - top.a)) / a;
  return { r: mix(top.r, base.r), g: mix(top.g, base.g), b: mix(top.b, base.b), a };
}

function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const MIN_TEXT = 4.5;
/** WCAG 1.4.11 non-text contrast, for the invalid-input border. */
const MIN_NON_TEXT = 3;
/** Known and accepted: subtle hover text is below AA for some roles. A floor, not a pass. */
const MIN_HOVER_TEXT = 4.2;
const modes: Mode[] = ["light", "dark"];
const intents = ["info", "success", "warning", "danger"] as const;
const alertVariantFor = { info: "info", success: "success", warning: "warning", danger: "error" };
const pages = ["--card", "--background"] as const;

describe.each(modes)("semantic colour contrast (%s)", (mode) => {
  const vars = variablesFor(mode);
  const color = (name: string) => parseColor(`var(${name})`, vars);
  /** Foreground drawn on a translucent surface that sits on a page colour. */
  const pair = (fg: string, surface: string, page: string) => {
    const base = color(page);
    const bg = over(color(surface), base);
    return contrast(over(color(fg), bg), bg);
  };

  it("resolves the page colours to opaque values", () => {
    for (const page of pages) expect(color(page).a).toBe(1);
  });

  describe.each(intents)("%s", (intent) => {
    const role = (name: string) => `--${intent}-${name}`;

    it("the contrast role meets 4.5:1 on solid", () => {
      expect(contrast(color(role("contrast")), color(role("solid")))).toBeGreaterThanOrEqual(
        MIN_TEXT,
      );
    });

    it("the contrast role meets 4.5:1 on solid-hover", () => {
      expect(contrast(color(role("contrast")), color(role("solid-hover")))).toBeGreaterThanOrEqual(
        MIN_TEXT,
      );
    });

    it.each(pages)("text meets 4.5:1 on surface over %s", (page) => {
      expect(pair(role("text"), role("surface"), page)).toBeGreaterThanOrEqual(MIN_TEXT);
    });

    it.each(pages)(
      "text stays above the documented hover floor on surface-hover over %s",
      (page) => {
        expect(pair(role("text"), role("surface-hover"), page)).toBeGreaterThanOrEqual(
          MIN_HOVER_TEXT,
        );
      },
    );

    const variant = alertVariantFor[intent];

    it.each(pages)("alert foreground meets 4.5:1 on alert background over %s", (page) => {
      expect(
        pair(`--alert-${variant}-foreground`, `--alert-${variant}-background`, page),
      ).toBeGreaterThanOrEqual(MIN_TEXT);
    });

    it.each(pages)("alert description meets 4.5:1 on alert background over %s", (page) => {
      expect(
        pair(`--alert-${variant}-foreground-muted`, `--alert-${variant}-background`, page),
      ).toBeGreaterThanOrEqual(MIN_TEXT);
    });
  });

  describe("destructive aliases", () => {
    it.each([
      ["--destructive", "--danger-solid"],
      ["--destructive-foreground", "--danger-contrast"],
    ])("%s resolves to %s", (alias, role) => {
      expect(vars.get(alias)).toBe(`var(${role})`);
      expect(color(alias)).toEqual(color(role));
    });

    it.each(pages)("danger solid meets 3:1 against %s (invalid-input border)", (page) => {
      expect(contrast(color("--danger-solid"), color(page))).toBeGreaterThanOrEqual(MIN_NON_TEXT);
    });
  });
});
