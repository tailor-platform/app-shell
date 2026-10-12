---
"@tailor-platform/app-shell": minor
---

Add `BulkItemPicker` — a tree-select dialog for picking many items from a hierarchical catalog and committing them in one batch.

Selection is leaf-only: a parent checkbox is derived from its descendants (checked, or indeterminate when partial), and ticking it selects every leaf beneath. Searching keeps any node that matches or has a matching descendant, and auto-expands the ancestors of matches. The tree is keyboard-navigable (`role="tree"` with roving focus, arrow keys to move and expand, Space to toggle, Enter to commit).

```tsx
import { BulkItemPicker } from "@tailor-platform/app-shell";

<BulkItemPicker<CatalogItem>
  open={open}
  onOpenChange={setOpen}
  title="Add items from catalog"
  items={catalog}
  renderRow={(node) => node.data.name}
  renderMetric={(node) => (node.children ? null : `$${node.data.price.toFixed(2)}`)}
  matchesSearch={(node, q) => node.data.name.toLowerCase().includes(q.toLowerCase())}
  onCommit={(picked) => lineItems.addLines(picked.map((n) => ({ sku: n.data.sku, quantity: 1 })))}
/>;
```

It is decoupled from `LineItems` and works for any multi-select-from-tree flow. Pair it with `useLineItems().addLines()` to insert every pick in a single render.

Built-in labels are localized (English and Japanese) through the app locale; any label prop overrides them.
