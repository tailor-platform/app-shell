---
"@tailor-platform/app-shell": minor
---

Introduce the **Tailor** brand appearance: two new color palettes, an independent font axis, a ready-made `ThemeSwitcher`, and a pre-paint helper to avoid FOUC.

### Color palettes — `cream`, `bloom`

`useTheme` / `ThemeProvider` now accept `light`, `dark`, `cream`, `bloom`, and `system`. The document root sets `data-theme` to the resolved palette and keeps `class="light"` or `class="dark"` for Tailwind's `dark:` variant. `cream` and `bloom` paint a fixed vertical shell gradient on `<html>` (light tint at top → white at bottom) and use squircle corners where the browser supports `corner-shape`.

`bloom` is the new default when no `defaultTheme` is provided. Existing apps with `tailor-light` / `tailor-bloom` / `tailor-dark` stored in `localStorage` are migrated on read to `cream` / `bloom` / `dark`.

### Independent font axis — `geist`, `inter`

A second appearance axis, separate from the color theme. Applied to `<html>` as `data-font`, persisted to `localStorage` under `appshell-ui-font`. Set via `useFont` (`setFont("inter")`) or `AppShell`'s `defaultFont` prop (default `"geist"`).

AppShell no longer fetches fonts at runtime. Pick a loading strategy:

```css
/* (a) zero-config: bundled Geist + Inter variable fonts */
@import "@tailor-platform/app-shell/styles";
@import "@tailor-platform/app-shell/fonts";
```

```tsx
// (b) next/font/google — the new family fallback chain ("Geist Variable", "Geist Sans", …)
// catches Next's registered family automatically
import { Geist, Inter } from "next/font/google";
```

### `ThemeSwitcher` + `SidebarLayout.themeSwitcher`

New `ThemeSwitcher` (exported from `@tailor-platform/app-shell` and `@tailor-platform/app-shell/sidebar`) provides a two-axis appearance menu (color grid + font grid). `SidebarLayout` now mounts it in the header by default, replacing the old `SunIcon` light/dark toggle. Override or hide via the new `themeSwitcher` prop:

```tsx
<SidebarLayout themeSwitcher={null}>           {/* hide */}
<SidebarLayout themeSwitcher={<MySwitcher />}> {/* replace */}
```

### Pre-paint script — `getInitialAppearanceScript()`

`ThemeProvider` writes `data-theme` / `data-font` from a post-mount effect. To avoid FOUC and React hydration warnings on SSR'd apps, inline the new helper in `<head>`:

```tsx
// app/layout.tsx
import { getInitialAppearanceScript } from "@tailor-platform/app-shell";

<html suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: getInitialAppearanceScript() }} />
  </head>
  …
</html>;
```

### New tokens in `theme.css`

- `--shell-gradient-start` / `--shell-gradient-end` (cream/bloom).
- `--status-{default,neutral,completed,attention,danger}`.
- `--semantic-shadow-{xs,sm,md,lg}`, mapped through `@theme` so each palette can override elevation.

### Cross-theme refactors bundled here

These are intentional and visible on **all** palettes, not just cream/bloom — call them out when communicating the upgrade:

- **`Badge` `neutral` variant** is no longer themed. It uses literal `bg-neutral-200` / `dark:bg-neutral-800` so a neutral badge stays neutral on light, dark, cream, and bloom (previously `bg-secondary`, which is light violet on cream/bloom).
- **`Table.Row` hover** is now `bg-muted` (was `bg-muted/50`) — twice as opaque on every DataTable.
- **`Dialog.Close`** is now wrapped with `<Button variant="ghost" size="icon">` so the close button inherits standard button accessibility and key handling.
- **Inputs** (`Input`, `Select.Trigger`, `Combobox.Input` / `Chips`, `Autocomplete.Input`, `Field.Control`) use `bg-transparent` with a `dark:bg-input/30` wash so they pick up the surface behind them. Inside non-card containers, the page background shows through on light/dark too.
- **Outline `Button` on cream/bloom** is transparent so the shell gradient shows through; hover restores the accent fill.

### Public API additions

`useFont`, `THEME_OPTIONS`, `FONT_OPTIONS`, `ThemeSwitcher`, `getInitialAppearanceScript`, plus types `Theme`, `ResolvedTheme`, `ThemeOption`, `Font`, `FontOption`.
