---
"@tailor-platform/app-shell": minor
---

Introduce a **theme** (palette) system with built-in `default`, `cream`, and `bloom` themes. Themes are independent of **color mode** (`light` / `dark` / `system`), so every theme works in both light and dark. CSS variables and design tokens have been reorganized to make it easier to create new custom themes.

#### Color mode (end-user preference, persisted)

- `useTheme()` hook continues to return `{ theme, resolvedTheme, setTheme }` (backward compatible).
- `<AppShell defaultColorMode="system">` sets the initial preference; user choice is persisted to localStorage.

#### Theme / Palette (developer configuration, not persisted)

- `<AppShell defaultTheme="default">` selects the brand palette; not stored in localStorage so a stale value never shadows the configured brand.
- Palette is applied via `data-theme` attribute on `<html>`.

#### AppearanceSwitcher

- New `<AppearanceSwitcher />` component for toggling color mode.
