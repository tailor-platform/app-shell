---
"@tailor-platform/app-shell": minor
---

Add `truncate: boolean` to `DataTable` `Column`. When set, the cell content is truncated with an ellipsis on overflow, and an app-shell `<Tooltip>` is auto-wired to reveal the full value on hover when the cell value is a stringifiable primitive. The tooltip resolves through the same precedence rule the built-in `type` renderers use — `accessor` first, then `row[col.id]` — so `inferColumns` consumers get the tooltip for free without an explicit accessor. Pair `truncate` with `width` on neighboring columns to anchor row width, since truncate cells use `max-w-0` to stay shrinkable.

```tsx
column({
  label: "Description",
  render: (row) => row.description,
  accessor: (row) => row.description,
  truncate: true,
});

// Or with `inferColumns`, no explicit `accessor` needed — the inferred
// column pins `id` to the field name so the tooltip resolves automatically:
column({ ...infer("description"), truncate: true });
```

`inferColumns` now also pins `id` to the metadata field name (previously omitted). This makes the cell renderer's `row[col.id]` fallback resolve cleanly and stabilizes the React key / column-visibility identifier across re-renders.
