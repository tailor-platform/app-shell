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

`useDataTable` now also returns `sortMultiple` and `onSortStatesChange`. Custom collection controls can implement `setSortStates` to support atomic multi-key edits in SortSettings.
