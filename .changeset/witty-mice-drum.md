---
"@tailor-platform/app-shell": minor
---

Add `withURLCollectionState` and `useURLCollectionState` for wiring collection state to the URL in `useCollectionVariables`.

`useCollectionVariables` now reports state updates through `onParamsChange` using the same `params` shape it accepts.

```tsx
const withURLCollectionState = useURLCollectionState();
const { variables, control } = useCollectionVariables(
  withURLCollectionState({
    tableMetadata,
    params: { pageSize: 20 },
  }),
);
```
