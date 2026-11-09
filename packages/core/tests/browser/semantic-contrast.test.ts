import { beforeEach, describe, expect, it } from "vitest";
import { applyPalette, colour, contrastOn, sample } from "./theme-utils";

/**
 * Shipped CSS is resolved by Chromium, including aliases, palette overrides and alpha.
 * Scope: card/background in all palettes and modes. Shell gradients and warning
 * solid/card contrast remain excluded. Subtle hover's 4.2 floor
 * is a documented exception, not an AA pass; see decisions/semantic-color-roles.md.
 */
const palettes = ["default", "cream", "bloom"] as const;
const modes = ["light", "dark"] as const;
const pages = ["--card", "--background"] as const;
const intents = ["info", "success", "warning", "danger"] as const;
const neutral = (name: string) => `--neutral-${name}`;
const alertVariantFor = { info: "info", success: "success", warning: "warning", danger: "error" };

it("measures opaque, transparent and translucent contrast without a CSS parser", () => {
  expect(contrastOn("black", "white", "white")).toBe(21);
  expect(contrastOn("rgb(255 255 255 / 0)", "black", "white")).toBe(1);
  expect(contrastOn("rgb(255 255 255 / 0.5)", "black", "white")).toBeCloseTo(5.317, 2);
  expect(contrastOn("black", "rgb(255 255 255 / 0.5)", "black")).toBeCloseTo(5.317, 2);
});

it("rejects an undefined or invalid colour instead of inheriting the body colour", () => {
  expect(() => colour("var(--missing-test-colour)")).toThrow();
  expect(() => colour("12px")).toThrow();
});

describe.each(palettes.flatMap((palette) => modes.map((mode) => [palette, mode] as const)))(
  "semantic colour contrast (%s, %s)",
  (palette, mode) => {
    beforeEach(() => applyPalette(palette, mode));
    const token = (name: string) => colour(`var(${name})`);
    const pair = (foreground: string, surface: string, page: string) =>
      contrastOn(token(foreground), token(surface), token(page));

    it.each(pages)("%s is an opaque base colour", (page) => {
      expect(sample(token(page))[3]).toBe(255);
    });

    describe.each(intents)("%s", (intent) => {
      const role = (name: string) => `--${intent}-${name}`;

      it("keeps solid, solid-hover and contrast opaque", () => {
        for (const name of ["solid", "solid-hover", "contrast"]) {
          expect(sample(token(role(name)))[3], role(name)).toBe(255);
        }
      });

      it.each(["solid", "solid-hover"])("contrast meets 4.5:1 on %s", (surface) => {
        expect(pair(role("contrast"), role(surface), "--card")).toBeGreaterThanOrEqual(4.5);
      });

      it.each(pages)("text meets 4.5:1 on surface over %s", (page) => {
        expect(pair(role("text"), role("surface"), page)).toBeGreaterThanOrEqual(4.5);
      });

      it.each(pages)("text meets the 4.2:1 hover floor over %s", (page) => {
        expect(pair(role("text"), role("surface-hover"), page)).toBeGreaterThanOrEqual(4.2);
      });

      const variant = alertVariantFor[intent];
      describe.each(["foreground", "foreground-muted"])("legacy Alert %s", (slot) => {
        it.each(pages)("meets 4.5:1 on its background over %s", (page) => {
          expect(
            pair(`--alert-${variant}-${slot}`, `--alert-${variant}-background`, page),
          ).toBeGreaterThanOrEqual(4.5);
        });
      });
    });

    // The neutral roles follow the palette's own surfaces, so they are checked separately
    // from the hue intents. Their text is the palette foreground, so hover has no floor.
    describe("neutral", () => {
      it.each(["solid", "solid-hover"])("contrast meets 4.5:1 on %s", (surface) => {
        expect(pair(neutral("contrast"), neutral(surface), "--card")).toBeGreaterThanOrEqual(4.5);
      });

      it.each(
        pages.flatMap((page) => (["surface", "surface-hover"] as const).map((s) => [s, page])),
      )("text meets 4.5:1 on %s over %s", (surface, page) => {
        expect(pair(neutral("text"), neutral(surface), page)).toBeGreaterThanOrEqual(4.5);
      });
    });

    it.each([
      ["--destructive", "--danger-solid"],
      ["--destructive-foreground", "--danger-contrast"],
    ])("%s resolves to the same colour as %s", (alias, role) => {
      expect(token(alias)).toBe(token(role));
    });

    it.each(pages)("danger solid meets 3:1 against %s for invalid-input borders", (page) => {
      expect(pair("--danger-solid", page, page)).toBeGreaterThanOrEqual(3);
    });
  },
);

it.each(["cream", "bloom"] as const)("%s changes card and muted in dark mode", async (palette) => {
  await applyPalette("default", "dark");
  const base = [colour("var(--card)"), colour("var(--muted)")];
  await applyPalette(palette, "dark");
  expect(colour("var(--card)")).not.toBe(base[0]);
  expect(colour("var(--muted)")).not.toBe(base[1]);
});

// Pins the neutral-scale refactor's original values, including translucent borders.
const expected = {
  light: {
    "--foreground": "#0a0a0a",
    "--muted-foreground": "#737373",
    "--primary": "#171717",
    "--primary-foreground": "#fafafa",
    "--secondary": "#f5f5f5",
    "--secondary-foreground": "#171717",
    "--accent-foreground": "#0a0a0a",
    "--background": "#fafafa",
    "--card": "#ffffff",
    "--card-foreground": "#0a0a0a",
    "--popover": "#ffffff",
    "--popover-foreground": "#0a0a0a",
    "--muted": "#f5f5f5",
    "--border": "#e5e5e5",
    "--input": "#e5e5e5",
    "--sidebar": "#fafafa",
    "--sidebar-foreground": "#0a0a0a",
    "--sidebar-border": "#e5e5e5",
    "--backdrop": "rgba(0, 0, 0, 0.5)",
  },
  dark: {
    "--foreground": "#fafafa",
    "--muted-foreground": "#a3a3a3",
    "--primary": "#e5e5e5",
    "--primary-foreground": "#171717",
    "--secondary": "#262626",
    "--secondary-foreground": "#fafafa",
    "--accent-foreground": "#fafafa",
    "--background": "#0a0a0a",
    "--card": "#171717",
    "--card-foreground": "#fafafa",
    "--popover": "#262626",
    "--popover-foreground": "#fafafa",
    "--muted": "#262626",
    "--border": "rgba(255, 255, 255, 0.1)",
    "--input": "rgba(255, 255, 255, 0.15)",
    "--sidebar": "#0a0a0a",
    "--sidebar-foreground": "#fafafa",
    "--sidebar-border": "rgba(255, 255, 255, 0.1)",
    "--backdrop": "rgba(0, 0, 0, 0.5)",
  },
};

describe.each(modes)("default palette neutral tokens (%s)", (mode) => {
  beforeEach(() => applyPalette("default", mode));

  it.each(Object.entries(expected[mode]))("%s preserves %s", (token, value) => {
    expect(colour(`var(${token})`)).toBe(colour(value));
  });
});
