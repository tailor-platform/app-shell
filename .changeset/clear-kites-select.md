---
"@tailor-platform/app-shell": minor
---

Add controlled and uncontrolled row selection through `useDataTable`'s `rowSelection` option. Pass `selectedIds` with `onChange` to control selection, or `defaultSelectedIds` to initialize table-owned selection. The existing `onSelectionChange` callback is deprecated in favor of `rowSelection.onChange`, but remains supported for compatibility.

```tsx
const table = useDataTable({
  columns,
  data,
  rowSelection: { selectedIds, onChange: setSelectedIds },
});
```
