---
"@tailor-platform/app-shell": minor
---

Add `truncate: boolean` to `DataTable` `Column`. When set, the cell content is truncated with an ellipsis on overflow, and a `title` tooltip is auto-set from `accessor` when it returns a string or number — so the full value appears on hover without callers wiring `title` inline. Pair with `width` on neighboring columns to anchor row width, since truncate cells use `max-w-0` to stay shrinkable.

```tsx
column({
  label: "Description",
  render: (row) => row.description,
  accessor: (row) => row.description,
  truncate: true,
});
```
