---
"@tailor-platform/app-shell": minor
---

Introduce two independent theming axes — **ColorTheme** and **ThemePalette** — plus a new `AppearanceSwitcher` component and bundled Inter variable fonts.

#### ColorTheme (end-user preference, persisted)

`ColorTheme` (`"light" | "dark" | "system"`) is the end-user color mode preference. Applied to `<html>` as `.light` / `.dark` class.

- `<AppShell defaultColorTheme="system">` sets the initial preference; user choice is persisted to localStorage.
- `useTheme()` hook returns `{ theme, resolvedTheme, setTheme }` (backward compatible).

#### ThemePalette (developer configuration, not persisted)

`ThemePalette` (`"default" | "cream" | "bloom"`) is the brand palette. Each palette ships both light and dark variants.

- `<AppShell defaultThemePalette="default">` selects the palette; not stored in localStorage so a stale value never shadows the configured brand.
- Applied via `data-theme` attribute on `<html>`.

#### AppearanceSwitcher

- New `<AppearanceSwitcher />` component for toggling color theme (light / dark / system).
