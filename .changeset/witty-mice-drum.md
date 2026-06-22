---
"@tailor-platform/app-shell": minor
---

Add `withURLCollectionState` and `useURLCollectionState` for wiring collection state to the URL in `useCollectionVariables`.

```tsx
const collectionState = useURLCollectionState({
  tableMetadata,
  params: { pageSize: 20 },
});
const { variables, control } = useCollectionVariables(collectionState);
```
