---
"@tailor-platform/app-shell": minor
---

Add inline cell editing to `DataTable`. Give a `text`, `number`, `money` or `link` column an `edit` config and users can type straight into its cells, with rules (`min`, `max`, `maxDecimals`, `required`, `validate`), per-row control (`canEdit(row, { selected })`) and Enter / Tab keyboard entry. The value reaches `edit.onCommit(row, value)` when the user leaves the cell; return a promise to autosave, and the cell reverts if it rejects.

```tsx
column({
  id: "received",
  label: "Received",
  type: "number",
  edit: {
    canEdit: (row, { selected }) => selected,
    min: 0,
    maxDecimals: 0, // whole numbers only
    onCommit: (row, value) => updateLine(row.id, { received: value }),
  },
});
```

A `number` / `money` column with `edit.maxDecimals` also displays up to that many decimals, so an entered 2.5 no longer renders as "3". A `number` column whose `maxDecimals` is below its `minDecimals` no longer throws.
