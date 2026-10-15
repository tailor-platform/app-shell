# Decision: `FilterRail` — an exposed faceted filter rail

> Status: **Proposed — ships `FilterRail` as a new public component.**
> Scope: a second filter surface beside `DataTable`. `DataTable.Filters` is unchanged.

## Context

`DataTable.Filters` hides filterable fields behind an "Add filter" panel. That suits the long tail of ad-hoc filters, but ERP list screens usually have a handful of axes people use constantly (category, status, availability), and for those a dropdown costs a click to learn what is even filterable and gives no hint of how many rows a choice returns.

A demo on `demo/filter-rail` proved out an always-visible rail with counts. This decision covers promoting it into the package.

## Decision

### Config sections + optional parts

Sections are a config array (`sections`, like `DataTable` `columns` or `DescriptionCard` `fields`); assembly is a compound namespace (`FilterRail.Provider / Root / Header / ClearAll / Settings / Sections / Trigger`).

- The rail must know every section to offer Clear all, reorder/hide settings and the "hiding clears its filter" rule. Pure JSX sections would need a registration protocol for that.
- A single component with a prop per feature cannot place pieces elsewhere (the narrow-screen button in a table toolbar) and grows a flag per feature. Parts are included or left out.
- A `custom` section type covers anything the built-in controls do not, and declares the `fields` it owns so it still takes part in Clear all.

### Not `DataTable.FilterRail`

The rail lives in a different `Layout.Column`, so it can never be a descendant of `DataTable.Root`. It therefore takes `control` as a prop rather than reading context.

### Same filter model, no new operators

Checkbox = `in`/`nin`, radio = `eq`/`ne`, boolean = `eq`, ranges = `between` (a field holds one filter, so `gte` + `lte` is not expressible). The operator is fixed per section; users pick values, not operators.

### Counts and storage belong to the consumer

The rail never sees rows. `counts` is a prop; `useFilterRailCounts` covers the in-memory case, a backend returns the same shape from an aggregation. Layout storage is a binding with a localStorage default (`useFilterRailLayout`) and a seam for a backend store — a team-shared layout is a product decision, not a component one.

### Narrow screens: the Sidebar pattern

Below `lg` the rail turns itself into a left sheet behind a "Filters" button, as the Sidebar does on mobile. The breakpoint check stays internal — AppShell exports no breakpoint hooks (`useIsMobile` / `useIsTablet` are private too), so apps write no breakpoint code.

The app still owns where the button goes: `FilterRail.Trigger`, inside `FilterRail.Provider`, can sit anywhere (a table toolbar, a page header). If none is mounted, `Root` renders a fallback button in its own spot, so the filters are never unreachable on a screen whose author never tested narrow widths.

`Root` takes the config directly in the common case; `Provider` is only needed when the Trigger lives outside the rail. Inside a Provider, `Root` takes no config (enforced by its prop types).

### Saved views are a separate change

Named views (filters plus sort, page size and column layout) were prototyped here and moved to a follow-up. A view is mostly `DataTable` state, its storage needs an async design for team-shared views, and keeping it out lets this review focus on the rail.

### No hidden state

Sections do not collapse; a selected option is never truncated, disabled or searched away; hiding a section clears its filter; zero-count options are disabled rather than hidden (there is no `"hide"` — removing rows reshuffles the list on every click and loses the "this has nothing" answer).

### Radio stays private

app-shell has no radio control. The rail uses a native radio in a `<fieldset>` internally; a public `RadioGroup` can be promoted later without changing the rail's API.

## Consequences

- New public surface: `FilterRail`, `FilterRailRootProps`, `FilterRailSection`, `useFilterRailCounts`, `useFilterRailLayout`.
- A field should belong to one surface: do not render `DataTable.Filters` for fields the rail owns.
- Known limit: the URL serializer stringifies scalars, so a backend must coerce `"true"`/numeric strings as it would any input (the rail itself reads `"true"` back correctly).
