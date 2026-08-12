---
"@tailor-platform/app-shell": patch
---

fix(skill): align bundled `app-shell-patterns` design-system docs with the shipped package

The `design-system.md` reference in the bundled `app-shell-patterns` skill documented a
token system that does not exist in the package. Coding agents read it as canonical and
emitted classes like `bg-surface-1`, `text-fg-default`, and `bg-danger`, which produce no
CSS at all — a silent failure with no error or warning.

Corrected against the shipped CSS (`themes/default.css` + `theme.bridge.css`):

- **Dark mode** is a `.dark` class on `<html>` (via the theme provider / `AppearanceSwitcher`),
  not `[data-theme="dark"]`.
- **Color tokens** are shadcn-style semantic pairs (`--background`/`--foreground`, `--card`,
  `--muted`, `--popover`, `--primary`, `--destructive`, `--status-*`, `--sidebar-*`, `--chart-*`),
  replacing the fabricated `--color-surface-*` / `--color-fg-*` / `--color-danger` families.
  Notes that `--alert-*` are variables only, with no Tailwind utilities.
- **Removed fabricated scales** for spacing, typography, motion, and icon sizing — AppShell
  defines none; the doc now points at stock Tailwind, with role→utility pairings taken from
  AppShell's own components.
- **Elevation** is `shadow-xs/sm/md/lg` (`--semantic-shadow-*`), not `--elevation-0..4`.
- **Z-index** values corrected (`--z-sidebar-rail` is `20`, not `10`) and marked as raw
  variables with no Tailwind mapping.
- **Setup** no longer instructs importing `@tailor-platform/app-shell/theme.css`, a deprecated
  no-op shim; `./styles` alone is correct.
- Replaced references to `Icon` and `Stat`, which are not exported, with `lucide-react` icons
  and `MetricCard`; corrected `Sheet` panel sizing to the real `size` prop, replacing a
  `contentClassName` prop that does not exist.

The `astw:` prefix guidance is deliberately out of scope here and is tracked separately —
see `tailor-professional-service/knowledge` discussion #342.

Documentation only — no runtime or CSS changes.
