# FilterRail — proposed component

> **Temporary branch, for discussion.** Not a merge candidate. It lives under
> `examples/` so it touches nothing the package publishes — no exports, no build
> surface, no tests.

An always-visible faceted filter rail: every filterable axis rendered beside the
results with live counts, instead of hidden behind a filter dropdown. Demo at
`/showcase/filter-rail`.

## Where it would live

Everything in this folder imports **only** from `@tailor-platform/app-shell` —
nothing from the example app — so it can be lifted into `packages/core` as-is.
The demo page is the only consumer-side code.

## How it relates to `DataTable.Filters`

Not an alternative — a second input surface onto the same state. It takes the
same `CollectionControl` passed to `useDataTable` and writes the same
`variables.query`. No new filter engine, no new operators, no boolean syntax for
the user: a checkbox group **is** the existing `in` operator.

|          | `DataTable.Filters`   | `FilterRail`                         |
| -------- | --------------------- | ------------------------------------ |
| Scope    | any filterable column | axes the screen curates              |
| Operator | user picks            | fixed per axis, never offered        |
| Values   | user types            | shown, with counts, before the click |
| Good for | the long tail, ad hoc | the axes used constantly             |

A field should belong to one surface, not both — a chip reading "Category is
Furniture" beside a ticked Furniture box is one fact in two places that can
drift. The demo renders the rail with no `DataTable.Filters` at all.

It is **not** `DataTable.FilterRail`: it sits in a different `Layout.Column`, so
it can never be a descendant of `DataTable.Root`.

## Files

|                      |                                                                     |
| -------------------- | ------------------------------------------------------------------- |
| `types.ts`           | the proposed public API, and the reasoning for each decision        |
| `FilterRail.tsx`     | the component                                                       |
| `controls.tsx`       | date / date-range / number-range / boolean controls                 |
| `internals.tsx`      | primitives app-shell lacks — checkbox group, radio group, show-more |
| `RailSettings.tsx`   | user control over section order, visibility and option sort         |
| `responsive.tsx`     | below `lg` the rail becomes a left sheet behind a toolbar button    |
| `facet-counts.ts`    | companion — in-memory counts; a backend would aggregate             |
| `use-saved-views.ts` | companion — capture / restore / persist a whole view                |
| `use-rail-layout.ts` | companion — section order, visibility and option sort               |
| `operators.ts`       | demo scaffolding only, so the example can filter in memory          |

## Saved views, not saved filters

The dropdown at the top of the rail saves a **view**: filters _plus_ the table's
presentation — column visibility, order, pinning, sort and page size. "Put this
screen back the way I had it" is the question people actually ask, and filters
alone do not answer it.

Nothing here needs an app-shell change. A view is a bundle of state the table
already exposes:

| read                        | write                               |
| --------------------------- | ----------------------------------- |
| `control.filters`           | `control.setFilters()`              |
| `table.sortStates`          | `control.clearSort()` / `setSort()` |
| `table.pageSize`            | `control.setPageSize()`             |
| `table.columnOrder`         | `table.setColumnOrder()`            |
| `table.isColumnVisible(id)` | `table.toggleColumn(id)`            |
| `table.pinnedColumns`       | `table.setPin(id, side)`            |

What app-shell does **not** provide is the bundle, the name, the list, or the
storage. `tableId` persists one unnamed column layout to localStorage; saved
views are the named, multiple version of the same state, and they live in
`use-saved-views.ts`.

Capture and restore sit with the **consumer**, not the rail — the rail is in a
different `Layout.Column` and never sees the table. It takes `activeId` and
`dirty` from the binding and renders the picker.

Restore order matters, and getting it wrong yields a view that looks restored
and is not: sort is cleared before re-applying so a multi-sort keeps its primary
key; `toggleColumn` is a flip rather than a setter, so it is called only where
visibility differs; a saved column order is filtered to columns that still
exist, with new ones appended.

**Storage is the load-bearing decision.** localStorage is one browser, one
person. Team-shared views — and a _default view every user gets on first open_ —
need a backend store. Swapping it touches nothing else.

## What app-shell would need to absorb it

Three are worth shipping on their own merits, whatever happens to the rail:

- **`CheckboxGroup`** — `Checkbox` exists; nothing manages the array value, the
  select-all parent or the `Fieldset` wiring. Base UI ships one.
- **`RadioGroup`** — there is no radio control in the library at all;
  `RadioGroup` is only `Menu.RadioGroup`, a dropdown item. Hand-rolled in
  `internals.tsx`.
- **`SelectOption.count?: number`** — one optional field. Would also let the
  existing enum filter dropdown show counts.

A `Popover` primitive would help too: `RailSettings` hand-rolls one because
`Menu` closes on item click and `Dialog` is modal.

## Known limits

- **A list-valued field cannot be faceted.** `in` compares the whole cell, so a
  `string[]` column matches nothing. That is why `tags` is not a facet in the
  demo — omitting it is more honest than a facet that silently returns zero.
- **Ranges must use `between`.** `addFilter` upserts by field, so `gte` **and**
  `lte` on one field is not expressible; the second overwrites the first.
- **Nested thresholds need a fourth control kind.** Options like
  _Any / Available / In stock_ nest, and a radio commits one scalar.
