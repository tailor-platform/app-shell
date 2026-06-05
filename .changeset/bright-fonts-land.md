---
"@tailor-platform/app-shell": minor
---

### Multi-theme appearance system

Add `ThemeSwitcher` component and font axis.

- New color palettes: `cream` and `bloom` alongside existing `light`/`dark`, plus a `system` option that follows OS preference
- Independent font axis (`geist` / `inter`) switchable at runtime via `useFont()` hook
- `ThemeSwitcher` dropdown component replaces the old light/dark toggle in `SidebarLayout`
- New `defaultTheme` and `defaultFont` props on `<AppShell>`
- Variable fonts (Geist and Inter) are bundled via fontsource and included in the default `styles` import
