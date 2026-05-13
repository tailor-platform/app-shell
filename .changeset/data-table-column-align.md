---
"@tailor-platform/app-shell": minor
---

Add `align: "left" | "right"` to `DataTable` `Column`. When set to `"right"`, the header label, body cell, and loading-skeleton bar are right-aligned together — eliminating the inline `<span className="text-right">` wrappers callers were adding inside `render` for numeric columns (Amount, Score, Total).

`align` is **auto-defaulted to `"right"` for `type: "number"` and `type: "money"`** so the common case Just Works without extra config. Other types default to `"left"`. Pass `"left"` explicitly to opt a numeric column out.

```tsx
// Auto-aligned right — no `align` needed
column({
  label: "Total",
  type: "money",
  accessor: (row) => row.total,
  typeOptions: { currency: "USD" },
});

// Explicit alignment for a custom-render column
column({
  label: "Amount",
  align: "right",
  render: (row) => formatMoney(row.amount),
});
```
