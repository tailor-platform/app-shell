# DataTable and Stateful UI Review Criteria

Review these changes as **state machines with layout seams**, not as ordinary leaf components.

## Why this area exists in AppShell

`DataTable` is one of the few places where AppShell owns substantial interaction logic on top of shared primitives: persisted column state, pinning, filters, pagination, row actions, and toolbar popovers all have to stay coherent as one feature.

## Current AppShell examples

- `packages/core/src/components/data-table/data-table.tsx` measures header widths and turns them into sticky offsets for pinned columns.
- `packages/core/src/components/data-table/use-data-table.ts` owns pagination, selection, sort state, and persisted column order/visibility/pinning.
- `packages/core/src/components/data-table/column-settings.tsx` combines visibility toggles, drag-reorder, and left/scrollable/right pin sections in one popover.
- `packages/core/src/components/data-table/toolbar.tsx` composes filters using other controls such as `packages/core/src/components/select-standalone.tsx`, `packages/core/src/components/date-field/date-field.tsx`, and `packages/core/src/components/calendar/calendar.tsx`, so table changes can break through those seams.

## Area-exclusive review checks

### One state path per concept

Check whether the change preserves one understandable path for:

- pagination boundaries
- sort state
- selection state
- filter editing and filter value fidelity
- column visibility/order/pin state
- URL/state synchronization where applicable

Be skeptical when a change adds another independent state path for the same concept.

### Pinned/sticky parity

Pinned columns are not a separate feature branch; they are the same table rendered under a different layout constraint. Review whether pinned and non-pinned cells still agree on:

- hover and selected-row visuals
- header semantics and sort affordances
- row height and cell background behavior
- built-in selection / row-actions columns at the seam

### Layout and interaction seams

Check seams that often regress even when the happy path works:

- many-column behavior
- short viewport behavior
- internal scroll vs outer scroll ownership
- filter / drag / pin / reorder combinations
- toolbar popovers inside scrollable or width-constrained layouts

### Public API and typing

For public helpers and column APIs, review whether:

- override and spread patterns still read clearly
- type inference remains usable for consumers
- custom render escape hatches preserve sort/layout/accessibility expectations

## Expected evidence

Prefer interaction evidence for the risky combinations, not only the default table render: pinned columns, filter editing, pagination edges, and column-settings interactions.

## Pair with

- `../cross-cutting/react.md`
- `../cross-cutting/accessibility.md`
- `../cross-cutting/component-design.md`
