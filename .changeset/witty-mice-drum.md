---
"@tailor-platform/app-shell": minor
---

Add `withURLCollectionState` as the preferred name for wiring collection state to the URL in `useCollectionVariables`.

`withURLState` remains available as a deprecated alias.

```tsx
const searchParams = useSearchParams();
const { variables, control } = useCollectionVariables(
  withURLCollectionState({ tableMetadata, params: { pageSize: 20 } }, searchParams),
);
```
