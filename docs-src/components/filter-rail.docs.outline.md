---
kind: code-backed
group: filter-rail
title: FilterRail
description: An always-visible faceted filter rail with counts, user layout settings and saved views, driven by the same CollectionControl as DataTable
sources:
  - packages/core/src/components/filter-rail/**
---

# FilterRail

`FilterRail` shows every filterable axis beside the results instead of hiding it behind a filter dropdown. Each section displays its options, and optionally how many rows each option would return, before the user clicks.

It writes the same `CollectionControl` a `DataTable` reads, so there is no second filter engine: a checkbox section **is** the `in` operator, a radio section is `eq`, a range is `between`.

```tsx
import { FilterRail, type FilterRailSection } from "@tailor-platform/app-shell";

const sections: FilterRailSection[] = [
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: categories,
  },
  { id: "status", label: "Status", control: "radio", field: "status", options: statuses },
];

<FilterRail.Root control={control} sections={sections}>
  <FilterRail.Sections />
</FilterRail.Root>;
```

## Sections and parts

What the rail shows is **config**: `sections`, one entry per axis, in screen order. How the rail is assembled is **parts**: leave a part out and that feature is not rendered.

| Part                    | Renders                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `FilterRail.Root`       | The rail landmark. Takes `control`, `sections`, `counts`, `layout`.     |
| `FilterRail.Header`     | A title row with a slot for actions.                                    |
| `FilterRail.ClearAll`   | Clears the rail's own filters only. Hidden while none are active.       |
| `FilterRail.Settings`   | Show / hide, reorder and sort sections. Needs `layout` on `Root`.       |
| `FilterRail.SavedViews` | A saved-view picker and Save button. Also works outside `Root`.         |
| `FilterRail.Sections`   | The sections, in the user's layout. Scrolls while the header stays put. |
| `FilterRail.Trigger`    | A toolbar button carrying the active count, for narrow screens.         |
| `FilterRail.Sheet`      | A left sheet to hold the rail on narrow screens.                        |

```tsx
<FilterRail.Root control={control} sections={sections} counts={counts} layout={layout}>
  <FilterRail.Header>
    <FilterRail.ClearAll />
    <FilterRail.Settings />
  </FilterRail.Header>
  <FilterRail.SavedViews {...views} />
  <FilterRail.Sections />
</FilterRail.Root>
```

### Section types

Every section has an `id`, a `label` and an optional `hint`. The operator is fixed per section — the user picks values, never operators.

| `control`     | Commits                                | Notes                                                       |
| ------------- | -------------------------------------- | ----------------------------------------------------------- |
| `checkbox`    | `in` (or `nin`) with the ticked values | `sort`, `truncate` (default 8), `pinned`, `searchThreshold` |
| `radio`       | `eq` (or `ne`) with one value          | An "Any" row removes the filter; `anyLabel: null` hides it  |
| `boolean`     | `eq` with `true` / `false`             | Three states: Any, `trueLabel`, `falseLabel`                |
| `text`        | `contains`, `hasPrefix` or `eq`        | Debounced (`debounceMs`, default 250)                       |
| `numberRange` | `between` `{ min, max }`               | Commits on blur / Enter; an empty end uses `min` / `max`    |
| `date`        | `eq`, `gte` or `lte` a `YYYY-MM-DD`    | Uses `DatePicker`                                           |
| `dateRange`   | `between` `{ min, max }`               | Uses `DateRangePicker`; optional `presets`                  |
| `custom`      | Whatever `render` writes               | Declares the `fields` it owns so Clear all includes them    |

A field holds one filter, so two sections must not share a field; the rail warns in the console when they do.

```tsx
const stockLevel: FilterRailSection = {
  id: "stockLevel",
  label: "Stock level",
  control: "custom",
  fields: ["stock"],
  render: ({ getFilter, setFilter }) => (
    <Button
      variant="outline"
      size="xs"
      onClick={() => setFilter("stock", { operator: "between", value: { min: 1, max: 20 } })}
    >
      Low stock
    </Button>
  ),
};
```

The rail never hides state: a selected option is never truncated away, never disabled and never hidden by a section's search box, and sections do not collapse.

## Counts

Pass `counts` to show a number beside each option and disable options that would return nothing (`zeroBehavior="show"` keeps them enabled). The rail never sees rows, so counts come from you. For rows held in memory, `useFilterRailCounts` does standard faceting: each section's count excludes its own filter, so ticking one box never zeroes its neighbours.

```tsx
const counts = useFilterRailCounts(rows, sections, control.filters, { baseline: true });
```

For a server-side collection, return the same shape from an aggregation query: `{ live: { [sectionId]: { [value]: count } }, baseline?, total?, withoutSection? }`. With `total` and `withoutSection`, an empty result shows which section to clear to get rows back.

## User layout

`useFilterRailLayout(storageKey)` persists the user's section order, hidden sections and option sort to localStorage. Pass it as `layout` and add `FilterRail.Settings`. Hiding a section that carries a filter also clears that filter. To share a layout across a team, pass your own `{ value, onChange, onReset }` binding instead.

## Saved views

`useSavedViews(table, { storageKey })` saves a `DataTable` **view** — filters plus sort, page size and column order, visibility and pinning — and returns the binding `FilterRail.SavedViews` renders. Pass `storage: { load, save }` to keep views in a backend store instead of localStorage.

```tsx
const table = useDataTable({ columns, data, control });
const views = useSavedViews(table, { storageKey: "products" });

<FilterRail.SavedViews {...views} />;
```

## Beside a DataTable

The rail sits in its own `Layout.Column`, outside `DataTable.Root`, which is why `control` is a prop. Do not also render `DataTable.Filters` for the same fields — one fact in two places can drift.

Below the `lg` breakpoint there is no room for a side column. `useFilterRailCompact()` reports that, and the same rail moves into `FilterRail.Sheet` behind a `FilterRail.Trigger`.

```tsx
const compact = useFilterRailCompact();
const [open, setOpen] = useState(false);
const rail = (
  <FilterRail.Root control={control} sections={sections}>
    <FilterRail.Sections />
  </FilterRail.Root>
);

<Layout fill>
  {!compact && <Layout.Column area="left">{rail}</Layout.Column>}
  <Layout.Column area="main">
    <DataTable.Root value={table}>
      <DataTable.Toolbar>
        {compact && (
          <FilterRail.Trigger control={control} sections={sections} onClick={() => setOpen(true)} />
        )}
      </DataTable.Toolbar>
      <DataTable.Table />
    </DataTable.Root>
  </Layout.Column>
  {compact && (
    <FilterRail.Sheet open={open} onOpenChange={setOpen}>
      {rail}
    </FilterRail.Sheet>
  )}
</Layout>;
```
