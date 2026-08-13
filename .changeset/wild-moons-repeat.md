---
"@tailor-platform/app-shell": patch
---

Fix the bundled `app-shell-patterns` skill, whose `design-system.md` documented a token system that does not exist in the package. Agents read it as canonical and emitted classes like `bg-surface-1`, `text-fg-default`, and `bg-danger`, which produce no CSS at all — a silent failure with no error or warning.

Tokens, dark mode (`.dark` on `<html>`), elevation, z-index, and the `styles` import now match the shipped CSS, and the fabricated spacing, typography, motion, and icon scales are gone in favour of stock Tailwind. Also drops references to `Icon` and `Stat`, which aren't exported, and to a `Sheet` `contentClassName` prop that doesn't exist.

Documentation only — no runtime or CSS changes.
