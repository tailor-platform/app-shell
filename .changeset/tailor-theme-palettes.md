---
"@tailor-platform/app-shell": minor
---

Adds **Tailor** brand theme presets alongside the existing default light and dark palettes. `useTheme` / `ThemeProvider` accept `light`, `dark`, `tailor-light`, `tailor-dark`, and `system`. The document root sets `data-theme` to the resolved palette and keeps `class="light"` or `class="dark"` for Tailwind `dark` mode (`tailor-dark` uses the `dark` class).

Semantic tokens in `theme.css` include placeholder **Tailor light** and **Tailor dark** values (indigo / slate–emerald styling) you can tune toward final brand colors. Status colors and elevation shadows (`--semantic-shadow-*`, mapped to `@theme` shadow keys) are centralized so each palette can override them.

`AppShell` accepts an optional `defaultTheme` when no value is stored in `localStorage`. Exports: `Theme`, `ResolvedTheme`.

The sidebar floating menu outline hover style now uses `var(--sidebar-border)` / `var(--sidebar-accent)` instead of `hsl(...)`, fixing invalid color math with `rgba`-based CSS variables.

```tsx
import { AppShell, useTheme, type Theme } from "@tailor-platform/app-shell";

<AppShell defaultTheme="tailor-light">{/* ... */}</AppShell>;

function Switcher() {
  const { setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme("tailor-dark")}>
      Tailor dark
    </button>
  );
}
```
