---
"@tailor-platform/app-shell": minor
---

Add controlled and uncontrolled row selection through `useDataTable`'s `rowSelection` option. Pass `selectedIds` with `onChange` to control selection, or `defaultSelectedIds` to initialize table-owned selection. The existing `onSelectionChange` callback remains supported.

```tsx
const table = useDataTable({
  columns,
  data,
  rowSelection: { selectedIds, onChange: setSelectedIds },
});
```
