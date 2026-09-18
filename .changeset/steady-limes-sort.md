---
"@tailor-platform/app-shell": minor
---

Add controlled and uncontrolled row selection through `useDataTable`'s `rowSelection` option. The existing `onSelectionChange` callback remains supported for uncontrolled selection.

```tsx
const table = useDataTable({
  columns,
  data,
  rowSelection: { selectedIds, onChange: setSelectedIds },
});
```
