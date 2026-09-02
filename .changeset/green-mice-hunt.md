---
"@tailor-platform/app-shell": minor
---

Add `infiniteScroll` support to `DataTable` for append-as-you-scroll tables.

```tsx
const table = useDataTable({
  columns,
  data,
  loading,
  control,
  infiniteScroll: {
    loadingMore,
    onLoadMore: () => {
      const endCursor = data?.pageInfo?.endCursor;
      if (endCursor) control.goToNextPage({ endCursor });
    },
  },
});
```

`DataTable` now renders a bottom sentinel/loading row and calls `onLoadMore` when its own scrollport reaches the end, while the consumer keeps ownership of fetching and concatenating `data.rows`.
