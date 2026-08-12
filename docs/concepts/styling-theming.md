---
title: Styling and Theming
description: Learn how to style your AppShell application using Tailwind CSS v4 and customize the theme
---

# Styling and Theming

Styling is done using Tailwind CSS v4. AppShell exports `@tailor-platform/app-shell/styles`, which includes the default palette and CSS variables.

To configure your application, import AppShell styles from your global CSS or top-level Tailwind CSS file:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
```

That is the whole setup. `styles` already ships the palette (light **and** dark), the Tailwind v4 `@theme inline` bridge, and the `dark` custom variant — your entry CSS should not declare any of them itself. If yours contains a `@theme inline` block, a `@custom-variant dark` rule, or copies of AppShell's palette tokens, see [Upgrading from 1.5.x](#upgrading-from-15x-remove-the-theme-bridge-workaround): they will silently break dark mode.

If you want a branded palette, import exactly one theme file after `styles`:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/themes/bloom";
```

After including this, your application's Tailwind utilities will resolve against the active AppShell tokens.

E.g.

```tsx
<div className="text-muted-foreground bg-muted">...</div>
```

Note, many of these are default Tailwind colors, but there are some differences. If you omit this, much of the UI will look the same, but we will lose some of the Tailor-preferred colors.

## A note on AppShell component class names

AppShell components use Tailwind utility classes for their styling. Tailwind classes are generated at build-time, so stylesheet for AppShell components is already built and is separate to the Tailwind stylesheet generated for your application.

In CSS, the order of style-definition affects the final styles which are computed for an element. Tailwind takes this into account when generating its stylesheet, however because it does not know that there's already a Tailwind-generated stylesheet included in the browser (AppShell's styles), there would be incorrect ordering of style definitions, and clashes can (though do not always) occur.

To avoid this situation, and to ensure correct style resolution, AppShell components use a class prefix "astw" (AppShell TailWind) to avoid clashes.

This is important to note for developing in AppShell.

## Color Themes (Light / Dark / System)

AppShell supports three color modes: `light`, `dark`, and `system` (follows the OS setting).

Set the initial mode via the `defaultColorTheme` prop on `<AppShell>`. The user's selection is persisted to `localStorage` and restored on subsequent visits:

```tsx
<AppShell defaultColorTheme="system" modules={modules}>
  {/* ... */}
</AppShell>
```

Use the [`useTheme`](../api/use-theme.md) hook to read or change the theme at runtime:

```tsx
import { useTheme } from "@tailor-platform/app-shell";

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
    </button>
  );
}
```

Drop the pre-built [`AppearanceSwitcher`](../components/appearance-switcher.md) component anywhere in your layout for a ready-made light/dark/system toggle:

```tsx
import { AppearanceSwitcher } from "@tailor-platform/app-shell";

<AppearanceSwitcher />;
```

## Theme Palettes

AppShell ships three palettes, each with light and dark variants:

| Palette   | CSS import                                                     |
| --------- | -------------------------------------------------------------- |
| `default` | Included automatically via `@tailor-platform/app-shell/styles` |
| `cream`   | `@tailor-platform/app-shell/themes/cream`                      |
| `bloom`   | `@tailor-platform/app-shell/themes/bloom`                      |

Select a palette by importing its CSS file — no prop needed. Import it in your global CSS **after** `@tailor-platform/app-shell/styles`:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/themes/cream"; /* overrides default palette */
```

Only import one palette at a time.

## Overriding tokens and cascade layers

AppShell's palette is imported inside a cascade layer:

```css
/* inside @tailor-platform/app-shell/styles */
@import "./themes/default.css" layer(theme.defaults);
```

Anything you declare in your own CSS is **unlayered**, and unlayered declarations always beat layered ones — regardless of specificity or source order. That is deliberate: it is what lets you override a token without `!important` or import-order games.

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

/* Wins over the layered default. This is the supported way to override. */
:root {
  --radius: 0.5rem;
}
```

The trap is that this cuts both ways. Because your declarations always win, a **partial** copy of AppShell's palette silently pins whatever it defines, and any token you did not copy stays on AppShell's value. The two halves then drift apart across upgrades.

Two rules keep you out of trouble:

- Override the specific tokens you mean to change, and nothing else. Never copy the palette wholesale.
- If you override a token in `:root`, override it in `.dark` too. A `:root`-only override applies in both modes, so a light-mode value will leak into dark mode.

```css
/* Good — one token, both modes */
:root {
  --card: rgba(255, 255, 255, 1);
}

.dark {
  --card: rgba(23, 23, 23, 1);
}
```

## Upgrading from 1.5.x: remove the theme bridge workaround

**Applies to:** apps upgrading from 1.5.x to 1.6 or later that adopted the documented 1.5.0 workaround.

In 1.5.0 the `@tailor-platform/app-shell/theme.css` export stopped shipping the Tailwind v4 theme bridge, and the recommended workaround was to paste the `@theme inline` block, a `@custom-variant dark` rule, and the palette definitions into your app's entry CSS.

From 1.6.0 onwards `@tailor-platform/app-shell/styles` ships all three again, so the workaround is no longer needed. **It is not merely redundant — leaving it in place actively breaks dark mode**, and the build succeeds with no warning:

- Your pasted `:root` and `.dark` palette blocks are unlayered, so they beat AppShell's layered palette. The app renders your frozen 1.5.0-era colours forever. Any surface added to AppShell after you copied the palette has no dark value at all, so it renders light-mode colours in dark mode — white text on white cards, unreadable values in disabled inputs.
- The workaround's `@custom-variant dark (&:is(.dark *))` overrides AppShell's `@custom-variant dark (&:where(.dark, .dark *))`. The `:is(.dark *)` form matches only _descendants_ of `.dark`, so `dark:` utilities stop applying to the `.dark` element itself.
- Because the symptoms look like ordinary app-side CSS bugs, they are expensive to trace back to the workaround.

### Detecting it

Search your app's CSS for the three shapes of the workaround:

```bash
grep -rn "@theme inline\|@custom-variant dark\|--card:\|--background:" src --include="*.css"
```

Hits inside your own entry CSS are the workaround (or overrides that need the treatment described in [Overriding tokens and cascade layers](#overriding-tokens-and-cascade-layers)). A clean app has none.

### Fixing it

Delete from your entry CSS:

- the entire `@theme inline { … }` block,
- the `@custom-variant dark (…)` rule,
- every `:root` and `.dark` block that redefines AppShell palette tokens (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--border`, `--input`, `--primary`, `--secondary`, `--accent`, `--destructive`, `--ring`, `--radius`, `--chart-*`, `--sidebar-*`),
- any `@import "@tailor-platform/app-shell/theme.css"` (a deprecated no-op shim since 1.6.0 — kept only so old apps keep building).

Keep only genuine app-specific rules. The correct end state is short:

```css
/* Before — 1.5.0 workaround, breaks dark mode on 1.6+ */
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/theme.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-card: var(--card);
  /* …dozens more… */
}

:root {
  --background: rgba(250, 250, 250, 1);
  --card: rgba(255, 255, 255, 1);
  /* …the whole palette… */
}

.dark {
  --background: rgba(10, 10, 10, 1);
  /* …the whole dark palette… */
}
```

```css
/* After — everything comes from `styles` */
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

html,
body {
  margin: 0;
  padding: 0;
}
```

[`examples/vite-app/src/index.css`](https://github.com/tailor-platform/app-shell/blob/main/examples/vite-app/src/index.css) is a working reference for this shape.

If you need to change specific colours, add a branded palette import (see [Theme Palettes](#theme-palettes)) or override individual tokens per [Overriding tokens and cascade layers](#overriding-tokens-and-cascade-layers) — do not reinstate the copied palette.

### Verifying the fix

Switch the app to dark mode and confirm the computed values flip. Against the default palette you should see `--card` go from `#fff` to `#171717`, `--input` from `#e5e5e5` to `rgba(255, 255, 255, 0.15)`, and `--destructive` from `#dc2626` to `#f87171`.

## Z-Index Layering

AppShell defines CSS custom properties for z-index values so you can adjust the stacking order to integrate with other libraries or overlays in your application.

These properties are defined in `:root` and can be overridden in your own CSS:

| Property           | Default | Used for                                                            |
| ------------------ | ------- | ------------------------------------------------------------------- |
| `--z-sidebar`      | `10`    | The sidebar panel                                                   |
| `--z-sidebar-rail` | `20`    | The sidebar collapse rail / toggle button                           |
| `--z-popup`        | `50`    | Portal-based popups (Menu, Select, Combobox, Autocomplete, Tooltip) |
| `--z-overlay`      | `50`    | Modal overlays (Dialog, Sheet)                                      |

### Example: Raising popup z-index

```css
/* your-app/globals.css */
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

:root {
  --z-popup: 100;
}
```

## Adding a palette

Theme tokens live in `packages/core/src/assets/themes/`. Copy `_template.css` to start a new palette — it lists exactly which sections to fill in for light and dark mode.

| Section               | Required?             | What to set                                                                    |
| --------------------- | --------------------- | ------------------------------------------------------------------------------ |
| **1. Brand**          | Yes                   | `primary`, `secondary`, `accent` (+ foregrounds) — both modes                  |
| **2. Shell gradient** | Branded palettes only | `--shell-gradient-base`, `--shell-gradient-tint`                               |
| **3. System**         | Tune or copy default  | Surfaces: background, card, popover, muted, borders                            |
| **4. Palette**        | Optional              | Radius, chart colors, shadows                                                  |
| **5. Semantic**       | Do not duplicate      | Status and alert tokens inherit from `default.css`                             |
| **6. Structural**     | Branded palettes      | Copy the structural override block from `bloom.css` or `cream.css` when needed |

A palette is selected by CSS import, not by an AppShell prop. Import exactly one theme file after `@tailor-platform/app-shell/styles`; if you import none, the default palette from `styles` is used.

Preview token values at `/custom-page/color` in the Next.js example app.

Or skip the local setup: **[theme.tailor.tech](https://theme.tailor.tech/playground)**
takes a primary color, previews it on real AppShell components, and exports a
`themes/{name}.css` structured according to the tier table above.
