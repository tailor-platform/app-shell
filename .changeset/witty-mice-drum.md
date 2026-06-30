---
"@tailor-platform/app-shell": minor
---

Add `useURLCollectionVariables` for wiring collection state (filters, sort, page size) to the URL query string in a single call. It seeds initial state from the current router search params and writes changes back as the user filters, sorts, or pages.

```tsx
const { variables, control } = useURLCollectionVariables({
  tableMetadata,
  params: { pageSize: 20 },
});
```

For cases that need URL persistence without react-router's `useSearchParams` (e.g. a custom binding), the pure `withURLCollectionState(options, [searchParams, setSearchParams])` decorator is also exported and can be composed with `useCollectionVariables` directly.

`useCollectionVariables` now reports state updates through `onParamsChange` using the same `params` shape it accepts.
