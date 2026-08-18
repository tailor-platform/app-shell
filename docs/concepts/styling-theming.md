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

That is the whole setup. `styles` ships the palette (light **and** dark), the Tailwind v4 `@theme inline` bridge, and the `dark` custom variant, so your entry CSS should declare none of them itself. A copy of any of them in your own CSS overrides AppShell's and silently breaks dark mode.

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

## Semantic color utilities

Beyond the standard shadcn/Tailwind names (`background`, `muted`, `primary`, …), AppShell bridges two semantic token families into Tailwind's color namespace, so they work with any color utility (`bg-`, `text-`, `border-`, `ring-`, …) and appear in editor autocomplete.

**Status** — flat colors, typically for badges and indicators:

| Utility suffix     | Token                |
| ------------------ | -------------------- |
| `status-default`   | `--status-default`   |
| `status-neutral`   | `--status-neutral`   |
| `status-completed` | `--status-completed` |
| `status-attention` | `--status-attention` |
| `status-danger`    | `--status-danger`    |

```tsx
<span className="bg-status-attention">Pending review</span>
```

**Alert** — grouped sets for callouts, banners, and highlighted rows. Each of the five variants (`neutral`, `success`, `warning`, `error`, `info`) provides four slots:

| Slot               | Utility example                    | Use for                    |
| ------------------ | ---------------------------------- | -------------------------- |
| `background`       | `bg-alert-info-background`         | Callout fill               |
| `foreground`       | `text-alert-info-foreground`       | Primary text and icons     |
| `foreground-muted` | `text-alert-info-foreground-muted` | Secondary/description text |
| `border`           | `border-alert-info-border`         | Callout border             |

```tsx
<div className="rounded-lg border px-4 py-3 bg-alert-info-background text-alert-info-foreground border-alert-info-border">
  <p className="font-medium">Heads up</p>
  <p className="text-alert-info-foreground-muted">
    This is the same palette the built-in Alert uses.
  </p>
</div>
```

These are the tokens the [`Alert`](../components/alert.md) component uses internally — reach for them when you need the same callout treatment somewhere `Alert` doesn't fit. All twenty resolve in both light and dark mode, and branded palettes inherit them from the default palette.

> Prefer these named utilities over arbitrary-value syntax like `bg-[color:var(--alert-info-background)]`. Both produce identical CSS, but a typo in an arbitrary value fails silently — the element simply renders unstyled — whereas a misspelled utility class is caught by editor tooling.

Note that the `background` and `border` slots are already semi-transparent (a ~10% and ~20% tint respectively). An opacity modifier therefore compounds rather than replaces: `bg-alert-info-background/50` yields roughly 5% alpha, not 50%. Set the background with an unmodified utility, or reach for the underlying accent color if you need a specific opacity.

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

## Overriding tokens

Redeclare any token after the AppShell imports. Use `:root` for light and `:root.dark` for dark — that pair wins against every palette AppShell ships:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

:root {
  --primary: #2563eb;
}

:root.dark {
  --primary: #60a5fa;
}
```

Two rules:

- **Set each override in both modes.** Overriding only `:root` misbehaves either way: on the default palette the light value carries into dark mode, and on a branded palette the override stops applying in dark mode altogether.
- **Override individual tokens; never copy the palette wholesale.** Copied tokens freeze at the value you copied while everything else tracks AppShell, so the two halves drift apart — and any surface AppShell adds later has no value in your copy at all.

`:root.dark` rather than `.dark` because the two palette families behave differently. The default palette is imported inside a cascade layer (`layer(theme.defaults)`), so any unlayered declaration of yours beats it. The branded palettes (`cream`, `bloom`) are imported by you, unlayered, and define dark values on `:root.dark` — which outranks a bare `.dark`, so a `.dark` override would silently lose. `:root.dark` is correct against both.

Overriding under a narrower scope — per-section or per-tenant — needs the same care: pair `.tenant-a` with `:root.dark .tenant-a` so the dark rule still outranks a branded palette's `:root.dark`. Note also that `:root.dark` matches only `<html class="dark">`; if you apply `.dark` to a subtree to darken one region, scope your overrides to that subtree rather than to `:root.dark`.

## Typography and Fonts

AppShell bundles **Inter Variable** and applies it via the `body` rule in
`@tailor-platform/app-shell/styles`. Because it is a variable font with a continuous
100–900 weight axis, every weight the design system names — `font-normal`, `font-medium`,
`font-semibold`, `font-bold` — resolves to a real weight rather than whatever faces happen
to be installed.

### Japanese text needs the opt-in font bundle

Inter has no CJK glyphs, so Japanese characters fall through to the operating system's font.
Those fonts do **not** ship a 500 weight — Yu Gothic UI on Windows has only
Light/Semilight/Regular/Semibold/Bold — and CSS weight matching resolves a `font-weight: 500`
request down to Regular. The practical effect is that `font-medium`, which AppShell uses for
most labels, table cells and card titles, is **indistinguishable from body text in Japanese**.

Import the Japanese font bundle to fix this:

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/fonts/noto-sans-jp";
```

This adds Noto Sans JP Variable — also a continuous 100–900 axis — so Japanese weights match
Latin ones. It is metric-harmonised against Inter (`size-adjust: 94%` plus ascent/descent
overrides) so mixed Japanese/Latin strings read at one optical size and a line containing
Japanese is exactly as tall as one without.

### Why it is opt-in

The bundle is roughly **5 MB of woff2 subsets**, and a bundler emits every subset it can see
into your build output regardless of which ones get used — it cannot know at build time which
characters your data will contain. Apps that never render Japanese would pay that cost for
nothing, so it ships behind the subpath import.

What your **users** download is much smaller. Each subset carries a `unicode-range`, so the
browser fetches one only when it is about to paint a character in that range:

| what the user has seen                   | downloaded  |
| ---------------------------------------- | ----------- |
| all hiragana + katakana                  | ~237 KB     |
| + ~230 common ERP kanji                  | ~458 KB     |
| + ~30 name kanji including variant forms | ~467 KB     |
| **typical first Japanese screen**        | **~910 KB** |

Files are content-hashed and cached, so the cost is front-loaded rather than per-navigation,
and it grows slowly as unusual characters appear in your data. Weight costs nothing extra —
every weight lives in the same file, so using `font-medium` and `font-bold` downloads no more
than `font-normal` alone.

### Using your own font

Set `--astw-font-sans` on `:root` **after** importing AppShell styles to replace the whole
stack:

```css
@import "@tailor-platform/app-shell/styles";

:root {
  --astw-font-sans: "Your Brand Sans", ui-sans-serif, system-ui, sans-serif;
}
```

A replacement should be a variable font, or otherwise supply real 400/500/600/700 faces —
AppShell's weight scale assumes all four exist. If your app renders Japanese, include a
Japanese family with a continuous weight axis for the same reason.

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
