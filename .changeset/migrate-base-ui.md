---
"@tailor-platform/app-shell": patch
---

Migrated internal UI primitives from Radix UI/shadcn to Base UI.

**Changed dependencies:**
- Removed: `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`
- Added: `@base-ui/react` (^1.2.0)

**Migrated internal components:**
- Separator: Replaced Radix implementation with simple `<div>` element
- Tooltip: Migrated to Base UI Tooltip
- Collapsible: Migrated to Base UI Collapsible
- Dialog/Sheet: Migrated to Base UI Dialog
- Button/Breadcrumb: Replaced `asChild` + `Slot` pattern with Base UI's `useRender` hook
- Sidebar: Updated to use migrated components

**Internal refactoring:**
- Flattened `src/components/ui/` directory into `src/components/`

This is an internal refactoring with no changes to the public API.
