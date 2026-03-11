---
title: useTheme
description: Hook for accessing and controlling theme (light/dark mode)
---

# useTheme

React hook to access and control the current theme (light/dark mode).

## Signature

```typescript
const useTheme: () => {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  systemTheme: "light" | "dark";
}
```

## Return Value

### `theme`
- **Type:** `"light" | "dark" | "system"`
- **Description:** Current theme setting

### `setTheme()`
- **Type:** `(theme: "light" | "dark" | "system") => void`
- **Description:** Set the theme. Persisted to localStorage.

### `systemTheme`
- **Type:** `"light" | "dark"`
- **Description:** System preference (from OS settings)

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

```typescript
function Logo() {
  const { theme, systemTheme } = useTheme();
  const effectiveTheme = theme === "system" ? systemTheme : theme;

  return (
    <img
      src={effectiveTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
      alt="Logo"
    />
  );
}
```

## Theme Persistence

Theme preference is automatically saved to localStorage and restored on page load.

## Related

- [Styling & Theming](../concepts/styling-theming.md) - Theme customization
