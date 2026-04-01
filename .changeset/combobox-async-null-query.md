---
"@tailor-platform/app-shell": major
---

**Breaking:** `AsyncFetcherFn` now receives `string | null` instead of `string` as the `query` parameter.

The fetcher is called with `null` when the user has not typed anything (e.g. the dropdown was just opened or the input was cleared). Return initial/default items for `null`, or return an empty array to show nothing until the user starts typing.

`useAsync` also now returns an `onOpenChange` handler that triggers `fetcher(null)` on the first open, so `Combobox.Async` shows initial items immediately when the dropdown opens.

```tsx
// Before
const fetcher = async (query: string, { signal }) => { ... };

// After
const fetcher = async (query: string | null, { signal }) => {
  const res = await fetch(`/api/items?q=${query ?? ""}`, { signal });
  return res.json();
};
```
