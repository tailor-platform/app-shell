---
"@tailor-platform/app-shell": minor
---

The z-index tokens are named by layer: `--z-nav` (10), `--z-portal` (50) and `--z-toast` (100). The old names keep working as aliases: `--z-sidebar` is `var(--z-nav)`, and `--z-popup` and `--z-overlay` are `var(--z-portal)`. They are deprecated and will be removed in the next major. Nothing moves on screen.

A theme that overrides an old name no longer reaches the components, which read the new names. `--z-sidebar-rail` is no longer read by the sidebar rail; the variable stays declared for elements of your own. See the 1.20.0 note in the migration guide.
