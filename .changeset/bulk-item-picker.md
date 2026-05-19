---
"@tailor-platform/app-shell": minor
---

Add `BulkItemPicker` — a generic tree-select dialog for bulk choosing from a hierarchical list.

Designed for "Bulk add" flows on documents that pick from a catalog with optional sub-items (products with variants, accounts with sub-accounts, categories with tags, etc.). Decoupled from `LineItems` so it can be used anywhere a multi-select-from-tree is needed.

- Generic via render-props: consumer supplies `items[]` + `renderRow` + optional `renderMetric` for the right-aligned column. The picker draws the checkbox column, expand/collapse caret, search, and Add-N-items CTA.
- Selection is leaf-only. Parent rows show a tri-state checkbox derived from descendant leaves; clicking a parent selects/deselects all descendants.
- Built-in case-insensitive search (overridable via `matchesSearch`); parents auto-expand when a descendant matches the query.
- Selection state resets on close so each open starts fresh.
- Exports: `BulkItemPicker`, `BulkItemPickerProps<T>`, `BulkItemPickerNode<T>`.

```tsx
<BulkItemPicker<MyNode>
  open={open}
  onOpenChange={setOpen}
  title="Bulk picker"
  rowLabel="Product Name"
  metricLabel="Total available"
  items={tree}
  renderRow={(node) => <span>{node.data.name}</span>}
  renderMetric={(node) => node.data.available}
  onCommit={(leaves) => addLines(leaves.map(toLine))}
/>
```
