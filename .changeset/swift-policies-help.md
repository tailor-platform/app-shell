---
"@tailor-platform/app-shell": minor
---

Add DataTable filter policy support for inferred columns and URL-backed collection state.

```tsx
const infer = inferColumns(tableMetadata.order, {
  filterPolicy: {
    string: {
      operators: ["eq", "contains"],
      supportsCaseInsensitive: false,
    },
  },
});
```

`useURLCollectionVariables()` and `withURLCollectionState()` now accept the same `filterPolicy` so unsupported URL operators are ignored during hydration.
