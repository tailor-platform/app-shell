---
"@tailor-platform/app-shell": minor
---

Add Visibility and Sorting tabs to `DataTable.ColumnSettings`. Drag sortable columns into a chosen priority position, drag them back to available columns to remove them, or select candidates to append. Reorder active keys by drag-and-drop or Arrow Up/Down on their grips, toggle direction with the arrow button, and remove individual keys with ×. Search filters available columns while active keys stay visible.

Table values and context now expose `sortMultiple` so custom controls can follow the same mode. The sorting tab respects the table's existing sorting configuration; pass `sort: { multiple: true }` to `useDataTable` to keep multiple keys. Visibility controls remain unchanged. The popover is wider, its row spacing is consistent between tabs, and its Japanese trigger label is now `列設定`.
