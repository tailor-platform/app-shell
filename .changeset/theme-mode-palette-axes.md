---
"@tailor-platform/app-shell": minor
---

Split theming into two independent axes — **mode** (`light` / `dark` / `system`) and **theme/palette** (`default` / `cream` / `bloom`) — so every palette works in both light and dark.

- New `useMode()` hook + `MODE_OPTIONS` for the end-user appearance control (light/dark/system). `useTheme()` now returns the color palette: `{ theme, setTheme }`. `ResolvedTheme` is replaced by `ResolvedMode`.
- `<AppShell>` gains `defaultMode` (default `"system"`, persisted as the user preference); `defaultTheme` now selects the palette (default `"default"`). The palette is a developer config driven by the prop — it is **not** persisted to localStorage, so a stale stored value can't shadow the configured brand. Only mode (and font) persist.
- DOM: `<html>` carries the mode as the `.light` / `.dark` class and the palette as `data-theme`.
- CSS: `light.css` + `dark.css` are merged into `default.css`; **Cream** and **Bloom** gain dark variants. The shell gradient is parameterized per mode.
- The appearance switcher now offers Light / Dark / System only — the palette is a developer configuration. The font axis is unchanged.
