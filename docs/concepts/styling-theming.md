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

That is the whole setup. Since 1.7.0, `styles` ships the palette (light **and** dark), the Tailwind v4 `@theme inline` bridge, and the `dark` custom variant, so your entry CSS should declare none of them itself. If yours does, see [Upgrading from 1.5.x or 1.6.x](#upgrading-from-15x-or-16x-remove-the-theme-bridge-workaround) — those leftovers silently break dark mode.

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
- **Override individual tokens; never copy the palette wholesale.** Copied tokens freeze at the value you copied while everything else tracks AppShell, and the two halves drift apart on upgrade. That is the failure described in [Upgrading from 1.5.x or 1.6.x](#upgrading-from-15x-or-16x-remove-the-theme-bridge-workaround).

`:root.dark` rather than `.dark` because the two palette families behave differently. The default palette is imported inside a cascade layer (`layer(theme.defaults)`), so any unlayered declaration of yours beats it. The branded palettes (`cream`, `bloom`) are imported by you, unlayered, and define dark values on `:root.dark` — which outranks a bare `.dark`, so a `.dark` override would silently lose. `:root.dark` is correct against both.

Overriding under a narrower scope — per-section or per-tenant — needs the same care: pair `.tenant-a` with `:root.dark .tenant-a` so the dark rule still outranks a branded palette's `:root.dark`. Note also that `:root.dark` matches only `<html class="dark">`; if you apply `.dark` to a subtree to darken one region, scope your overrides to that subtree rather than to `:root.dark`.

## Upgrading from 1.5.x or 1.6.x: remove the theme bridge workaround

**Applies to:** apps that pasted the `@theme inline` block, `@custom-variant dark`, and AppShell's palette into their entry CSS — the workaround for `styles` shipping without the Tailwind bridge.

**`styles` regained the bridge in 1.7.0.** On 1.5.0–1.6.1 the workaround is load-bearing, so upgrade to 1.7.0 or later _before_ deleting any of it. Remove it earlier and every AppShell-token utility — `bg-card`, `bg-background`, `text-muted-foreground`, `border-border` — stops resolving, while `dark:` variants fall back to Tailwind's `prefers-color-scheme` default and stop tracking the `.dark` class.

From 1.7.0 the workaround is not merely redundant. It actively breaks dark mode, and the build succeeds with no warning:

- Your pasted `:root` and `.dark` blocks are unlayered, so they beat AppShell's layered default palette. Colours freeze at the values you copied, and any surface AppShell has added since has no dark value at all — so it renders light colours in dark mode: white text on white cards, unreadable disabled inputs.
- `@custom-variant dark (&:is(.dark *))` overrides AppShell's `&:where(.dark, .dark *)`. The `:is(.dark *)` form matches only _descendants_ of `.dark`, so `dark:` utilities stop applying to the `.dark` element itself.

### Removing it

Delete from your entry CSS:

- the `@theme inline { … }` block,
- the `@custom-variant dark (…)` rule,
- every `:root` and `.dark` block copied from AppShell's palette — **all** of it, including the `*-foreground` pairs, `--status-*`, `--alert-*`, `--sidebar-*` and `--semantic-shadow-*`. The foregrounds are what leave text white on white, so a partial deletion reproduces the bug.
- any `@import "@tailor-platform/app-shell/theme.css"` (a no-op shim since 1.6.0, kept only so older apps keep building).

To find it, search every CSS file the app loads — not just the entry point, since `app/` and `styles/` are as common as `src/`:

```bash
grep -rnE "@theme inline|@custom-variant|app-shell/theme\.css|--(card|popover|muted|sidebar|destructive|accent)(-foreground)?:" --include="*.css" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.next .
```

Excluding `node_modules` matters: AppShell's own palette files declare these tokens too, and they must not be touched. In your own CSS, hits are either the workaround, which goes, or deliberate overrides, which should take the `:root` / `:root.dark` form above.

What remains is short — [`examples/vite-app/src/index.css`](https://github.com/tailor-platform/app-shell/blob/main/examples/vite-app/src/index.css) is a working reference for the shape (it also imports a branded palette, which is optional):

```css
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";

html,
body {
  margin: 0;
  padding: 0;
}
```

### Verifying

Toggle dark mode and confirm a real surface changes: inspect a `Card` and watch its computed `background-color` go from `rgb(255, 255, 255)` to `rgb(23, 23, 23)` on the default palette.

Reading the token directly also works — `getComputedStyle(document.documentElement).getPropertyValue("--card")` returns the winning declaration, so a stale copy shows up as its own value. Just compare against the authored notation: AppShell writes `rgba(23, 23, 23, 1)`, not `#171717`, and the computed value preserves that form.

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
