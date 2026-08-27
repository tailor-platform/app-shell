---
"@tailor-platform/app-shell": minor
---

Add `filter.operators` on DataTable columns to narrow which conditions the built-in filter UI exposes.

```tsx
column({
  label: "Customer",
  filter: { field: "customer", type: "string", operators: ["contains", "eq"] },
});
```

`inferColumns()` now also accepts `filter: { operators: [...] }` so metadata-derived columns can use the same restriction.
