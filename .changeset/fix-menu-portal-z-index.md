---
"@tailor-platform/app-shell": patch
---

Fix portal-based components (`Menu`, `Select`, `Combobox`, `Autocomplete`, `Tooltip`) rendering behind the sidebar by establishing a stacking context on each portal container.

Centralize all z-index values into CSS custom properties (`--z-sidebar`, `--z-sidebar-rail`, `--z-popup`, `--z-overlay`) defined in `globals.css`.
