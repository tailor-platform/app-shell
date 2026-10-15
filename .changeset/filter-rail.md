---
"@tailor-platform/app-shell": minor
---

Add `FilterRail`, an always-visible faceted filter rail that sits beside a `DataTable` and writes the same `CollectionControl`.

Sections are config — any mix of `checkbox`, `radio`, `boolean`, `text`, `numberRange`, `date`, `dateRange` and `custom` — and every other feature is an optional part: `Header`, `ClearAll` and `Settings` (show / hide, reorder, sort). Each section collapses from a chevron by its title (`defaultCollapsed` to start closed) and still shows its selected count while collapsed. Below `lg` the rail turns itself into a left sheet behind a "Filters" button, like the Sidebar; wrap the page in `FilterRail.Provider` to place that button (`FilterRail.Trigger`) anywhere.

```tsx
<FilterRail.Root control={control} sections={sections} layout={layout}>
  <FilterRail.Header>
    <FilterRail.ClearAll />
    <FilterRail.Settings />
  </FilterRail.Header>
  <FilterRail.Sections />
</FilterRail.Root>
```

Companion hook: `useFilterRailLayout` (persisted section layout). Checkbox and radio sections are for small, fixed sets of values; the docs explain which control to use for fields whose values keep growing.
