---
"@tailor-platform/app-shell": minor
---

Add inline cell editing to `DataTable`. Give a typed column an `edit` config and users can change its values right in the list: `text`, `number` and `money` cells are typed into; `text` / `link` columns with `edit.options` and `badge` columns become dropdowns you can type into to search; `date` columns open a calendar. Editable columns show a pen after their title, and each cell shows a pen, chevron or calendar icon on hover. Rules (`min`, `max`, `maxDecimals`, `required`, `validate`) are checked when the user saves; a value that breaks one stays on screen, outlined in orange, and is never saved until it's fixed or undone. Per-row control (`canEdit(row, { selected })`) and Enter / Tab keyboard entry come built in. The value reaches `edit.onCommit(row, value)` when the user leaves the cell or picks a choice; return a promise to autosave, and the cell reverts if it rejects. Leaving the page with unsaved edits asks first.

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

column({
  id: "supplierId",
  label: "Supplier",
  type: "text",
  edit: {
    options: suppliers.map((s) => ({ value: s.id, label: s.name })),
    onCommit: (row, value) => updateLine(row.id, { supplierId: value }),
  },
});
```

Also fixes date display: a date-only `"YYYY-MM-DD"` value now shows that day in every time zone instead of the day before west of UTC. A `number` / `money` column with `edit.maxDecimals` displays up to that many decimals, and a `number` column whose `maxDecimals` is below its `minDecimals` no longer throws.
