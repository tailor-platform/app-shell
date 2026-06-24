---
title: useTheme
description: Hook for accessing and controlling theme (light/dark mode)
---

# useTheme

React hook to access and control the current theme (light/dark mode).

## Signature

```typescript
import { type ColorTheme, type ResolvedColorTheme } from "@tailor-platform/app-shell";

const useTheme: () => {
  theme: ColorTheme;
  resolvedTheme: ResolvedColorTheme;
  setTheme: (theme: ColorTheme) => void;
};
```

## Return Value

### `theme`

- **Type:** `ColorTheme` (`"light" | "dark" | "system"`)
- **Description:** Current user preference. `"system"` means the OS setting is followed.

### `resolvedTheme`

- **Type:** `ResolvedColorTheme` (`"light" | "dark"`)
- **Description:** Concrete color mode after resolving `"system"`. Always `"light"` or `"dark"`.

### `setTheme()`

- **Type:** `(theme: ColorTheme) => void`
- **Description:** Set the color theme. Persisted to `localStorage` under the key `appshell-ui-theme`.

## Usage

### Display Current Theme

```typescript
import { useTheme } from "@tailor-platform/app-shell";

function ThemeDisplay() {
  const { theme } = useTheme();

  return <div>Current theme: {theme}</div>;
}
```

### Theme Toggle

```typescript
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return <button onClick={toggleTheme}>Toggle Theme</button>;
}
```

### Theme Selector

```typescript
function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

### Conditional Rendering

Use `resolvedTheme` when you need a concrete `"light"` or `"dark"` value — it already accounts for `"system"`:

```typescript
function Logo() {
  const { resolvedTheme } = useTheme();

  return (
    <img
      src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
      alt="Logo"
    />
  );
}
```

## Theme Persistence

Theme preference is automatically saved to localStorage and restored on page load.

## Related

- [Styling & Theming](../concepts/styling-theming.md) - Theme customization
