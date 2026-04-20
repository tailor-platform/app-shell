---
"@tailor-platform/app-shell": patch
---

Fix CommandPalette not showing page entries for top-level pages without child resources.

When using file-based routing with a flat page structure (e.g. `pages/dashboard/page.tsx`), these pages were silently excluded from the CommandPalette because `buildNavItems` skipped modules with no visible sub-resources. Modules that are directly navigable (`menuItemClickable: true`) are now included as leaf navigation items.
