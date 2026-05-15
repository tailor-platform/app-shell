---
title: useTheme
description: Hook for accessing and controlling theme appearance (named palettes including Cream and Bloom)
---

# useTheme

React hook to access and control the current appearance theme.

## Signature

Exported types:

```typescript
export type Theme = "light" | "dark" | "cream" | "bloom" | "system";

export type ResolvedTheme = "light" | "dark" | "cream" | "bloom";

export type ThemeOption = { readonly value: Theme; readonly label: string };

/** Ordered labels for UI (e.g. theme menus); includes System last. */
export const THEME_OPTIONS: readonly ThemeOption[];
```

Hook return value:

```typescript
const useTheme: () => {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};
```

## Return value

### `theme`

- **Type:** `Theme`
- **Description:** Stored theme preference. **`system`** means “follow OS light/dark” for the **default** light/dark palettes only (not cream or bloom).

### `resolvedTheme`

- **Type:** `ResolvedTheme`
- **Description:** Concrete palette after resolving **`system`** to **`light`** or **`dark`**. **`cream`** and **`bloom`** are never produced by **`system`**; pick them explicitly with **`setTheme`**.

When **`resolvedTheme`** changes, **`document.documentElement`** gets **`data-theme`** set to this value and a **`light`** / **`dark`** class for Tailwind **`dark`** variant compatibility.

### `setTheme(theme)`

- **Type:** `(theme: Theme) => void`
- **Description:** Set the theme. Persisted to **`localStorage`** (key **`appshell-ui-theme`** when using AppShell’s built-in provider).

Previously saved ids **`tailor-light`**, **`tailor-bloom`**, **`tailor-dark`** are mapped on read to **`cream`**, **`bloom`**, **`dark`** (see **`LEGACY_THEME_IDS`** in **`theme-context.tsx`**).

## Usage

### Display current themes

```typescript
import { useTheme } from "@tailor-platform/app-shell";

function ThemeDisplay() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div>
      Preference: {theme} · Effective: {resolvedTheme}
    </div>
  );
}
```

### Set a named palette

```typescript
function UseCream() {
  const { setTheme } = useTheme();
  return <button onClick={() => setTheme("cream")}>Cream</button>;
}
```

### Theme menu (**`ThemeSwitcher`**)

`SidebarLayout` includes a header **`ThemeSwitcher`** by default. You can reuse it elsewhere or build a custom control from **`THEME_OPTIONS`**:

```tsx
import { ThemeSwitcher } from "@tailor-platform/app-shell";

function Toolbar() {
  return <ThemeSwitcher />;
}
```

```typescript
import { THEME_OPTIONS, useTheme, type Theme } from "@tailor-platform/app-shell";

function CustomThemeList() {
  const { theme, setTheme } = useTheme();

  return (
    <ul>
      {THEME_OPTIONS.map(({ value, label }) => (
        <li key={value}>
          <button type="button" aria-pressed={theme === value} onClick={() => setTheme(value as Theme)}>
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### Logo or assets by lightness

Use **`resolvedTheme`** and treat **`light`**, **`cream`**, and **`bloom`** like “light” palettes and **`dark`** like “dark” for monochrome assets:

```typescript
function Logo() {
  const { resolvedTheme } = useTheme();
  const darkish = resolvedTheme === "dark";

  return <img src={darkish ? "/logo-dark.svg" : "/logo-light.svg"} alt="Logo" />;
}
```

## Theme persistence

The built-in **`ThemeProvider`** (used inside **`AppShell`**) persists the **`theme`** value to **`localStorage`** and restores it on reload.

Use **`AppShell`**’s **`defaultTheme`** prop for the initial value when nothing is stored.

# useFont

Sibling hook to **`useTheme`** that controls the **font axis**, independent of color theme. Any color theme works with either font; users pick them separately in **`ThemeSwitcher`**.

## Signature

```typescript
export type Font = "inter" | "geist";

export type FontOption = { readonly value: Font; readonly label: string };

export const FONT_OPTIONS: readonly FontOption[];
```

```typescript
const useFont: () => {
  font: Font;
  setFont: (font: Font) => void;
};
```

## Return value

### `font`

- **Type:** `Font`
- **Description:** Stored font preference. Applied to **`<html>`** as **`data-font`**, which the package CSS uses to set **`font-family`** on **`body`** and headings.

### `setFont(font)`

- **Type:** `(font: Font) => void`
- **Description:** Set the font. Persisted to **`localStorage`** (key **`appshell-ui-font`** when using AppShell’s built-in provider).

## Usage

```typescript
import { useFont } from "@tailor-platform/app-shell";

function UseInter() {
  const { setFont } = useFont();
  return <button onClick={() => setFont("inter")}>Inter</button>;
}
```

Use **`AppShell`**’s **`defaultFont`** prop for the initial value when nothing is stored. Default is **`"geist"`**.

## Avoiding FOUC: `getInitialAppearanceScript()`

`ThemeProvider` writes **`data-theme`** / **`data-font`** to **`<html>`** from a **post-mount effect**. On SSR'd apps that creates a flash of the default palette before the stored preference is applied, plus a React hydration warning.

The package exports **`getInitialAppearanceScript()`** which returns a tiny script string consumers inline in **`<head>`** so the stored preference is applied **before first paint**:

```tsx
// app/layout.tsx (Next.js App Router)
import { getInitialAppearanceScript } from "@tailor-platform/app-shell";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getInitialAppearanceScript() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

The script reads **`localStorage`**, runs the same legacy-id migration as the provider, resolves **`system`** via **`matchMedia`**, and sets **`data-theme`**, **`data-font`**, and **`class="light"|"dark"`** on **`<html>`**. Safe to call without arguments; pass overrides for non-default storage keys / defaults.

```ts
getInitialAppearanceScript({
  storageKey: "my-app-theme",
  fontStorageKey: "my-app-font",
  defaultTheme: "cream",
  defaultFont: "inter",
});
```

For Vite / static HTML apps, paste the returned string into a **`<script>`** tag in **`index.html`**.

## Related

- [Styling & Theming](../concepts/styling-theming.md)
