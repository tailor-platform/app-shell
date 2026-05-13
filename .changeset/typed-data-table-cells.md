---
"@tailor-platform/app-shell": minor
---

Add `type` and `typeOptions` to `DataTable` `Column` for built-in cell rendering. Set `type` to `text`, `number`, `money`, `date`, `badge`, or `link` to skip writing a `render` function for the common cases. `render` stays required for untyped columns and becomes an optional override when `type` is set.

`Column<TRow>` is a discriminated union on `type`, so wrong-shape options are a compile error rather than silently ignored at runtime — and `type: "link"` requires `typeOptions.href`.

```tsx
column({
  label: "Total",
  accessor: (row) => row.total,
  type: "money",
  typeOptions: { currency: "USD" },
});

column({
  label: "Status",
  accessor: (row) => row.status,
  type: "badge",
  typeOptions: {
    badgeVariantMap: { active: "success", draft: "neutral" },
    badgeLabelMap: { active: "Active", draft: "Draft" },
  },
});
```
