---
"@tailor-platform/app-shell": minor
---

Add expandable detail rows to `DataTable`. Pass `rowExpansion` to `useDataTable` and each row gets a chevron column (auto-pinned to the left edge, after the selection column) that reveals a full-width detail panel beneath the row — nothing new to compose in JSX.

```tsx
const table = useDataTable<Order>({
  columns,
  data,
  control,
  rowExpansion: {
    render: (row) => <OrderLineItems orderId={row.id} />,
    canExpand: (row) => row.lineItemCount > 0,
    getLabel: (row) => row.orderNumber, // → "Expand row INV-1001"
  },
});
```

Rows must have a string or number `id` (the same constraint as row selection); rows without one render no chevron. Several rows can be open at once, and expansion survives page changes — `collapseAllRows()` resets it. Pass `expandedIds` + `onChange` inside `rowExpansion` to control expansion yourself; the type requires them together, so a half-configured controlled table is a compile error rather than inert chevrons.

Also fixes `onSelectionChange` firing twice per toggle under React StrictMode. It was dispatched from inside a state updater, which StrictMode intentionally double-invokes to surface impurity, so handlers doing real work (fetches, analytics, history entries) ran twice in development. It is now dispatched from the event handler and fires exactly once. No signature change; if you added your own de-duplication to work around this, it is no longer needed.
