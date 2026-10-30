---
"@tailor-platform/app-shell": minor
---

Add `CheckboxTree` and `CheckboxTreePicker` for picking many items from a hierarchical catalog. `CheckboxTree` is the searchable multi-select tree on its own, for use inline and in forms; `CheckboxTreePicker` is the same tree in a fixed-height dialog with an "Add N items" commit, the way `DatePicker` wraps `DateField`.

Pass your own items with `mapItem`, as with `Select` and `Combobox`. A key only needs to be unique among its siblings. Selection is leaf-only: ticking a parent selects every enabled leaf beneath it, and a parent's checkbox is checked or indeterminate from its leaves.

```tsx
import { CheckboxTree } from "@tailor-platform/app-shell";

<CheckboxTree<Category | Product>
  aria-label="Products"
  items={categories}
  mapItem={(item) =>
    "products" in item
      ? { key: item.id, label: item.name, children: item.products }
      : { key: item.sku, label: item.name }
  }
  trailingColumn={{
    header: "Unit price",
    render: ({ item, isLeaf }) => (isLeaf ? money(item.price) : null),
  }}
  value={skus}
  onValueChange={setSkus}
/>;
```

- **Two value shapes:** a list of leaf keys (`valueShape: "keys"`, the default), or an exact nested selection (`valueShape: "exact"`) for when the same key means different things under different parents. `onValueChange` reports the same shape plus the selected leaves with their paths and parents.
- **Rows:** `renderItem` for the main column, plus `leadingColumn` / `trailingColumn` with aligned header cells.
- **Forms:** `name` submits one hidden input per selected leaf; `required`, `disabled`, `itemToStringValue`, and `Field.Root` integration (label, description, error, invalid state) work as on `Select`.
- **Keyboard:** `role="tree"` with roving focus — arrows to move and expand, Space to toggle, Enter runs `onAction` (or submits the owning form; the picker commits).
- **Disabled items:** `disabled` from `mapItem`, cascading from a parent to its children.

Built-in labels are localized (English and Japanese) through the app locale; any label prop overrides them.
