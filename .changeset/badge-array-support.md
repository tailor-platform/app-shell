---
"@tailor-platform/app-shell": minor
---

Add array badge support to DataTable and DescriptionCard with shared `BadgeList` rendering and overflow popover.

```tsx
// DataTable — badge column with array accessor
column({
  ...infer("tags"),
  type: "badge",
  accessor: (row) => row.tags,
  typeOptions: {
    badgeVariantMap: { Premium: "warning", Office: "outline-info" },
    maxVisible: 2,
  },
})

// DescriptionCard — array badges with maxVisible
<DescriptionCard
  data={{ tags: ["urgent", "fragile", "international"] }}
  fields={[{
    key: "tags",
    label: "Tags",
    type: "badge",
    meta: {
      badgeVariantMap: { urgent: "error", fragile: "warning", international: "outline-info" },
      maxVisible: 2,
    },
  }]}
/>
```

Additional changes:

- Unify badge variant resolution into shared `resolveBadgeVariant()` utility with `"outline-neutral"` as the default variant (previously `"neutral"` in DataTable)
- Export `BadgeVariant` and `BadgeOptions` types from the public API
- `inferColumns()` no longer sets a default `render` function — columns without an explicit `type` or `render` now display `—` for null/empty values (aligns with typed-column behavior)
- Deprecate `BadgeVariantType` in favor of `BadgeVariant`
