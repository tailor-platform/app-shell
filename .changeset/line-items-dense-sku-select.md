---
"@tailor-platform/app-shell": minor
---

**LineItems:** Default table chrome is denser and card-aligned: `bg-card`, column/row dividers, no header shadow, `32px` virtual row height, zero cell padding, and borderless cell inputs so the grid reads like a spreadsheet.

**LineItems:** `LineItemsField.type` adds `kind: "select"` with `options: { value, label, description? }[]` and optional `placeholder`. Options render in a combobox with a two-line layout when `description` is set.

```tsx
f.field({
  key: "sku",
  label: "SKU",
  type: {
    kind: "select",
    options: [{ value: "A", label: "A", description: "Line two" }],
    placeholder: "Pick…",
  },
  render: (row) => row.sku,
  editable: ["edit"],
});
```
