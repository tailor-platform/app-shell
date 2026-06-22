---
"@tailor-platform/app-shell": minor
---

Add `withURLCollectionState` and `useURLCollectionState` for wiring collection state to the URL in `useCollectionVariables`.

```tsx
const withURLCollectionState = useURLCollectionState();
const { variables, control } = useCollectionVariables(
  withURLCollectionState({
    tableMetadata,
    params: { pageSize: 20 },
  }),
);
```
