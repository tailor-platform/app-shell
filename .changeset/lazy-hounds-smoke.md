---
"@tailor-platform/app-shell": minor
---

Add expandable detail rows to `DataTable`. Pass `renderExpandedRow` to `useDataTable` and each row gets a chevron column (auto-pinned to the left edge, after the selection column) that reveals a full-width detail panel beneath the row — nothing new to compose in JSX.

```tsx
const table = useDataTable<Order>({
  columns,
  data,
  control,
  renderExpandedRow: (row) => <OrderLineItems orderId={row.id} />,
  canExpandRow: (row) => row.lineItemCount > 0,
  expandRowLabel: (row) => row.orderNumber, // → "Expand row INV-1001"
});
```

Rows must have a string or number `id` (the same constraint as row selection); rows without one render no chevron. Several rows can be open at once, and expansion survives page changes — `collapseAllRows()` resets it. Pass `expandedIds` + `onExpandedChange` to control expansion yourself.
