---
"@tailor-platform/app-shell": minor
---

Add `withURLCollectionState` for wiring collection state to the URL in `useCollectionVariables`.

```tsx
const searchParams = useSearchParams();
const { variables, control } = useCollectionVariables(
  withURLCollectionState({ tableMetadata, params: { pageSize: 20 } }, searchParams),
);
```
