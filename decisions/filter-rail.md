# Decision: `FilterRail` — an exposed faceted filter rail

> Status: **Proposed — ships `FilterRail` as a new public component.**
> Scope: a second filter surface beside `DataTable`. `DataTable.Filters` is unchanged.

## Context

`DataTable.Filters` hides filterable fields behind an "Add filter" panel. That suits the long tail of ad-hoc filters, but ERP list screens usually have a handful of axes people use constantly (category, status, availability), and for those a dropdown costs a click to learn what is even filterable and gives no hint of how many rows a choice returns.

A demo on `demo/filter-rail` proved out an always-visible rail with counts. This decision covers promoting it into the package.

## Decision

### Config sections + optional parts

Sections are a config array (`sections`, like `DataTable` `columns` or `DescriptionCard` `fields`); assembly is a compound namespace (`FilterRail.Root / Header / ClearAll / Settings / SavedViews / Sections / Trigger / Sheet`).

- The rail must know every section to offer Clear all, reorder/hide settings and the "hiding clears its filter" rule. Pure JSX sections would need a registration protocol for that.
- A single component with a prop per feature cannot place pieces elsewhere (saved views in a page header) and grows a flag per feature. Parts are included or left out.
- A `custom` section type covers anything the built-in controls do not, and declares the `fields` it owns so it still takes part in Clear all.

### Not `DataTable.FilterRail`

The rail lives in a different `Layout.Column`, so it can never be a descendant of `DataTable.Root`. It therefore takes `control` as a prop rather than reading context.

### Same filter model, no new operators

Checkbox = `in`/`nin`, radio = `eq`/`ne`, boolean = `eq`, ranges = `between` (a field holds one filter, so `gte` + `lte` is not expressible). The operator is fixed per section; users pick values, not operators.

### Counts and storage belong to the consumer

The rail never sees rows. `counts` is a prop; `useFilterRailCounts` covers the in-memory case, a backend returns the same shape from an aggregation. Layout and saved-view storage are bindings with localStorage defaults (`useFilterRailLayout`, `useSavedViews`) and a seam for a backend store — team-shared views and a default view for everyone are product decisions, not component ones.

### No hidden state

Sections do not collapse; a selected option is never truncated, disabled or searched away; hiding a section clears its filter; zero-count options are disabled rather than hidden (there is no `"hide"` — removing rows reshuffles the list on every click and loses the "this has nothing" answer).

### Radio stays private

app-shell has no radio control. The rail uses a native radio in a `<fieldset>` internally; a public `RadioGroup` can be promoted later without changing the rail's API.

## Consequences

- New public surface: `FilterRail`, `FilterRailRootProps`, `FilterRailSection`, `useFilterRailCounts`, `useFilterRailLayout`, `useSavedViews`, `useFilterRailCompact`.
- A field should belong to one surface: do not render `DataTable.Filters` for fields the rail owns.
- Known limit: the URL serializer stringifies scalars, so a backend must coerce `"true"`/numeric strings as it would any input (the rail itself reads `"true"` back correctly).
