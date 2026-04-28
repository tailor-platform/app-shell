---
"@tailor-platform/app-shell": minor
---

Change `useDataTable()` to use single-column sorting by default and add a `sort` option for configuring sorting behavior.

Before:

```tsx
const table = useDataTable({
  columns,
  data,
  control,
});
```

After:

```tsx
const table = useDataTable({
  columns,
  data,
  control,
  sort: { multiple: true },
});
```

Use `sort: false` to disable sorting entirely.
