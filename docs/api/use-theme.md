---
title: useTheme
description: Hook for accessing and controlling theme appearance (named palettes including Cream and Bloom)
---

# useTheme

React hook to access and control the current appearance theme.

## Signature

Exported types:

```typescript
export type Theme = "light" | "dark" | "deep-dark" | "cream" | "bloom" | "system";

export type ResolvedTheme = "light" | "dark" | "deep-dark" | "cream" | "bloom";
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
- **Description:** Stored theme preference. **`system`** means “follow OS light/dark” for the **default** light/dark palettes only (not cream, bloom, or deep-dark).

### `resolvedTheme`

- **Type:** `ResolvedTheme`
- **Description:** Concrete palette after resolving **`system`** to **`light`** or **`dark`**. **`cream`**, **`bloom`**, and **`deep-dark`** are never produced by **`system`**; pick them explicitly with **`setTheme`**.

When **`resolvedTheme`** changes, **`document.documentElement`** gets **`data-theme`** set to this value and a **`light`** / **`dark`** class for Tailwind **`dark`** variant compatibility.

### `setTheme(theme)`

- **Type:** `(theme: Theme) => void`
- **Description:** Set the theme. Persisted to **`localStorage`** (key **`appshell-ui-theme`** when using AppShell’s built-in provider).

Previously saved ids **`tailor-light`**, **`tailor-bloom`**, **`tailor-dark`** are mapped on read to **`cream`**, **`bloom`**, **`deep-dark`** (see **`LEGACY_THEME_IDS`** in **`theme-context.tsx`**).

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

### Theme selector

```typescript
function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
    >
      <option value="light">Default light</option>
      <option value="dark">Default dark</option>
      <option value="deep-dark">Deep dark</option>
      <option value="cream">Cream</option>
      <option value="bloom">Bloom</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Logo or assets by lightness

Use **`resolvedTheme`** and treat **`light`**, **`cream`**, and **`bloom`** like “light” palettes and **`dark`** and **`deep-dark`** like “dark” for monochrome assets:

```typescript
function Logo() {
  const { resolvedTheme } = useTheme();
  const darkish =
    resolvedTheme === "dark" || resolvedTheme === "deep-dark";

  return <img src={darkish ? "/logo-dark.svg" : "/logo-light.svg"} alt="Logo" />;
}
```

## Theme persistence

The built-in **`ThemeProvider`** (used inside **`AppShell`**) persists the **`theme`** value to **`localStorage`** and restores it on reload.

Use **`AppShell`**’s **`defaultTheme`** prop for the initial value when nothing is stored.

## Related

- [Styling & Theming](../concepts/styling-theming.md)
