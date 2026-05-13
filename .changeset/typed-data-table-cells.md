---
"@tailor-platform/app-shell": minor
---

Add `type` and `typeOptions` to `DataTable` `Column` for built-in cell rendering. Set `type` to `text`, `number`, `money`, `date`, `badge`, or `link` to skip writing a `render` function for the common cases. `render` becomes optional when `type` is set and still wins when both are present.

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
