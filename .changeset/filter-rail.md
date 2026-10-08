---
"@tailor-platform/app-shell": minor
---

Add `FilterRail`, an always-visible faceted filter rail that sits beside a `DataTable` and writes the same `CollectionControl`.

Sections are config — any mix of `checkbox`, `radio`, `boolean`, `text`, `numberRange`, `date`, `dateRange` and `custom` — and every other feature is an optional part: `Header`, `ClearAll`, `Settings` (reorder / hide / sort), `SavedViews`, and `Trigger` + `Sheet` for narrow screens.

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

Companion hooks: `useFilterRailCounts` (in-memory facet counts), `useFilterRailLayout` (persisted section layout), `useSavedViews` (named DataTable views — filters, sort, page size and column layout) and `useFilterRailCompact`.
