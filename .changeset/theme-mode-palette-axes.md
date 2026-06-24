---
"@tailor-platform/app-shell": minor
---

Introduce theming support — **ColorTheme** axis, static **theme palettes** via CSS imports, a new `AppearanceSwitcher` component, and bundled Inter variable fonts.

#### ColorTheme (end-user preference, persisted)

`ColorTheme` (`"light" | "dark" | "system"`) is the end-user color mode preference. Applied to `<html>` as `.light` / `.dark` class.

- `<AppShell defaultColorTheme="system">` sets the initial preference; user choice is persisted to localStorage.
- `useTheme()` hook returns `{ theme, resolvedTheme, setTheme }`.

#### Theme Palettes (static CSS imports)

Each palette (`default`, `cream`, `bloom`) ships both light and dark variants.
Select a palette by importing its CSS file — no prop needed:

```ts
import "@tailor-platform/app-shell/themes/cream";
```

The default palette is included automatically via `@tailor-platform/app-shell/styles`.

#### AppearanceSwitcher

- New `<AppearanceSwitcher />` component for toggling color theme (light / dark / system).
