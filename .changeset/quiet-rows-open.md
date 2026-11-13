---
"@tailor-platform/app-shell": minor
---

Add `useDataTable({ rowInteraction })` to render a visible primary link or button in the pinned actions column, alongside optional secondary row actions. Ordinary row clicks activate the same control using normal React event bubbling, without extra column interaction settings. Built-in controls and `edit` columns keep their clicks independent; custom interactive renderers should stop propagation. Primary controls remain independent of data-column layout. Configure `label`, optional `getLabel`, and `canApply` for accessible, per-row actions.

```tsx
rowInteraction: {
  type: "link",
  label: "Open",
  getLabel: (row) => row.orderNumber,
  href: (row) => `/orders/${row.id}`,
}
```

The existing `onClickRow` remains supported but is deprecated and cannot be combined with `rowInteraction`.
