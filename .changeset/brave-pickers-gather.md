---
"@tailor-platform/app-shell": minor
---

Add `TreeSelect` and `TreePicker` for picking many items from a hierarchical catalog. `TreeSelect` is the searchable multi-select tree on its own, for use inline on a page or in a panel; `TreePicker` is the same tree in a fixed-height dialog with an "Add N items" commit, the way `DatePicker` wraps `DateField`.

Selection is leaf-only: a parent checkbox is derived from its descendants (checked, or indeterminate when partial), and ticking it selects every leaf beneath. Searching keeps any node that matches or has a matching descendant, and auto-expands the ancestors of matches. The tree is keyboard-navigable (`role="tree"` with roving focus, arrow keys to move and expand, Space to toggle, Enter to commit).

```tsx
import { TreePicker } from "@tailor-platform/app-shell";

<TreePicker<CatalogItem>
  open={open}
  onOpenChange={setOpen}
  title="Add items from catalog"
  items={catalog}
  renderRow={({ node }) => node.data.name}
  renderMetric={({ node }) => (node.children ? null : `$${node.data.price.toFixed(2)}`)}
  matchesSearch={({ node, query }) => node.data.name.toLowerCase().includes(query.toLowerCase())}
  onCommit={(picked) => addToOrder(picked.map((n) => n.data))}
/>;
```

It is generic and standalone: `data` is opaque to the picker, and `onCommit` hands back the picked leaves for the app to use however it needs.

Built-in labels are localized (English and Japanese) through the app locale; any label prop overrides them.
