# Overlays and Portals Review Criteria

Review these changes as **AppShell integration work**, not as standalone popup rendering.

## Why this area exists in AppShell

AppShell ships many overlay-like surfaces, and the risky bugs are often about where they render inside the shell rather than whether the popup itself opens.

## Current AppShell examples

- `packages/core/src/components/dialog.tsx` and `packages/core/src/components/sheet.tsx` own fixed overlays/backdrops with `--z-overlay` layering.
- `packages/core/src/components/menu.tsx`, `packages/core/src/components/tooltip.tsx`, `packages/core/src/components/select.tsx`, `packages/core/src/components/combobox.tsx`, and `packages/core/src/components/autocomplete.tsx` portal their popup content with `--z-popup` stacking.
- `packages/core/src/components/sheet.tsx` has explicit modal vs non-modal behavior via backdrop rendering and `allowOutsidePointerEvents`.
- `packages/core/src/components/data-table/toolbar.tsx` and `packages/core/src/components/data-table/column-settings.tsx` embed popovers inside already stateful, scrollable shell UI.

## Area-exclusive review checks

### Portal and container ownership

Check where the overlay renders and who owns that decision:

- default portal target
- optional `container` props for modal/drawer embedding
- anchor/positioner ownership
- whether one wrapper change silently alters behavior for an entire component family

### Shell layering

Review layering against the contexts where AppShell actually runs them:

- sidebar
- dialog
- sheet/drawer
- sticky/fixed UI
- scrollable layout containers

The important question is not "does the popup render?" but "does it render above the right thing, in the right place, in real shell layouts?"

### Modal boundaries and pointer ownership

Review whether modal vs non-modal behavior is still clear for:

- backdrop rendering
- outside pointer events
- scroll lock ownership
- dismissal boundaries

### Scroll and positioning seams

Check seams that often regress even when the popup appears:

- popup width or position tied to the wrong anchor
- clipping inside scroll containers
- fixed/sticky parents changing the effective stacking context
- nested overlays fighting each other for ownership

## Expected evidence

Prefer interaction or browser evidence inside realistic shell containers, especially when z-index, portal container, modal behavior, or popup positioning changed.

## Pair with

- `../cross-cutting/accessibility.md`
- `../cross-cutting/react.md`
- `../cross-cutting/low-level-apis.md` only if the diff uses timing, measurement loops, or imperative DOM coordination
