# DataTable — multi-select bulk actions in the footer

**Status:** open — for a team call. No decision taken here.
**Prototype:** `examples/vite-app/src/pages/data-table-selection/page.tsx` (`/data-table-selection` in the vite example). Nothing under `packages/**` or `catalogue/` changes.

Multi-select already works: passing `onSelectionChange` to `useDataTable` adds the checkbox column, and the footer already reads "N of M row(s) selected". What AppShell has no settled answer for is **where the bulk actions go** once rows are selected.

Sean suggested putting them in the **footer**, next to the selection count that already lives there, instead of a bar floating over the table. The prototype builds that out so we can look at it:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ☑  V2016   Globex K.K.   Raw material   D. Alvarez   LATAM   Active   US$355,974.26 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 20 of 240 selected │ ▷ Activate (6)  ⏸ Deactivate (14)  🗑 Delete (0) │ Clear        │
│                                            Rows per page 25   Page 1/10   « ‹ › »    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Why the footer: the selection count already lives there, its middle is empty in every table we ship, it never covers rows, it needs no overlay or z-index, and in `<Layout fill>` it is already pinned on screen.

## What already exists, and conflicts

`catalogue/src/pattern/interaction/multi-select` — shipped to agents as part of the `app-shell-patterns` skill — specifies the **floating bottom bar**: `position: fixed`, centered, elevated, appearing when the count goes 0 → 1. Its anti-patterns say bulk actions belong _only_ in that floating bar, and its reference implementation is built on raw `Table.Root` with native checkboxes, predating DataTable's own selection. `pattern/list/dense-scan` points DataTable users at it ("combine with `interaction/multi-select`").

So this pattern needs rewriting either way. The question is what it should point at.

## The question: component or pattern?

### Option A — build it into DataTable

Actions are declared once and the footer renders the bar:

```tsx
const table = useDataTable({
  columns,
  data,
  control,
  onSelectionChange: setSelectedIds,
  selectionActions: [
    { id: "activate", label: "Activate", icon: <Play />, count: 6, onClick: (ids) => … },
    { id: "delete", label: "Delete", icon: <Trash2 />, variant: "destructive", count: 0, onClick: (ids) => … },
  ],
});
```

`interaction/multi-select` then becomes a thin pattern that says "use `selectionActions`".

- Mirrors `rowActions` — a declarative array on the hook that makes the component render a whole affordance (the kebab column). Same shape, same place.
- Existing tables opt in with one option; wording, spacing, disable-at-zero and responsive behaviour are decided once, for every app, and can be tested.
- Costs: more presentation config on the hook, one opinionated bar, and adoption needs a version bump.

### Option B — keep it a pattern

Ship nothing in `packages/**`; rewrite `interaction/multi-select` around the footer, composed from `useDataTableContext()` inside `DataTable.Footer`.

- No API surface, no version bump — apps and agents pick it up as soon as the skill regenerates.
- Patterns are already how AppShell ships interaction guidance, and agents consume them directly.
- Costs: each app carries the code, so consistency depends on the pattern being followed; behaviour can't be tested in this repo.

## For the call

- Component (A) or pattern (B)?
- Either way: who rewrites `interaction/multi-select`, and does the floating bar stay as a documented alternative for non-DataTable lists (its current implementation is `Table.Root`-based)?
