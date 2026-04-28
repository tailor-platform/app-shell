---
title: useTheme
description: Hook for accessing and controlling theme appearance (default and Tailor palettes)
---

# useTheme

React hook to access and control the current appearance theme.

## Signature

Exported types:

```typescript
export type Theme = "light" | "dark" | "tailor-light" | "tailor-dark" | "system";

export type ResolvedTheme = "light" | "dark" | "tailor-light" | "tailor-dark";
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
- **Description:** Stored theme preference. **`system`** means “follow OS light/dark” for the **default** light/dark palettes only (not Tailor).

### `resolvedTheme`

- **Type:** `ResolvedTheme`
- **Description:** Concrete palette after resolving **`system`** to **`light`** or **`dark`**. **`tailor-light`** and **`tailor-dark`** are never produced by **`system`**; pick them explicitly with **`setTheme`**.

When **`resolvedTheme`** changes, **`document.documentElement`** gets **`data-theme`** set to this value and a **`light`** / **`dark`** class for Tailwind **`dark`** variant compatibility.

### `setTheme(theme)`

- **Type:** `(theme: Theme) => void`
- **Description:** Set the theme. Persisted to **`localStorage`** (key **`appshell-ui-theme`** when using AppShell’s built-in provider).

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
function UseTailorLight() {
  const { setTheme } = useTheme();
  return <button onClick={() => setTheme("tailor-light")}>Tailor (light)</button>;
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
      <option value="tailor-light">Tailor light</option>
      <option value="tailor-dark">Tailor dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Logo or assets by lightness

Use **`resolvedTheme`** and treat **`tailor-light`** like light and **`tailor-dark`** like dark for monochrome assets:

```typescript
function Logo() {
  const { resolvedTheme } = useTheme();
  const darkish =
    resolvedTheme === "dark" || resolvedTheme === "tailor-dark";

  return <img src={darkish ? "/logo-dark.svg" : "/logo-light.svg"} alt="Logo" />;
}
```

## Theme persistence

The built-in **`ThemeProvider`** (used inside **`AppShell`**) persists the **`theme`** value to **`localStorage`** and restores it on reload.

Use **`AppShell`**’s **`defaultTheme`** prop for the initial value when nothing is stored.

## Related

- [Styling & Theming](../concepts/styling-theming.md)
