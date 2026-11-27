---
"@tailor-platform/app-shell": minor
---

Add `DataTable.SortSettings`, a "Sort" toolbar control next to `DataTable.ColumnSettings`. Its popover lists the active sort keys in priority order, each with an Ascending / Descending select and a remove button, adds keys from a searchable list of sortable columns, and clears them all. With `sort: { multiple: true }`, drag a key's handle (or focus it and press Arrow Up / Arrow Down) to change its priority. The trigger shows how many keys are active.

```tsx
<Toolbar.Group>
  <DataTable.SortSettings />
  <DataTable.ColumnSettings />
</Toolbar.Group>
```

Sorted column headers now show stacked up/down carets with the active direction highlighted, replacing the single ▲/▼ glyph. The caret slot is reserved on every sortable header, so applying a sort no longer widens the column; unsorted sortable headers are about 8px wider than before as a result.

**Breaking:** `useDataTable`, `UseDataTableReturn`, and `DataTableContextValue` replace `onSort(field, direction)` with `onSortStatesChange(nextStates)`. Every header and SortSettings action now replaces the ordered keys in one call. `CollectionControl.setSortStates` is required and must reset pagination; its existing `setSort` and `clearSort` methods remain available.

```ts
// Before
table.onSort?.("name", "Desc");
// After: update the existing key without dropping other keys or changing priority.
table.onSortStatesChange?.(
  table.sortStates.map((sort) => (sort.field === "name" ? { ...sort, direction: "Desc" } : sort)),
);
```

`useDataTable` also returns `sortMultiple`. In single-sort mode, adding a new field replaces existing keys; changing direction or removing an existing field preserves the other keys, including persisted multiple keys. See the [migration guide](../docs/migrations.md#1220-datatable-sorting-uses-one-ordered-state-callback) for custom control and hand-built root migrations.
