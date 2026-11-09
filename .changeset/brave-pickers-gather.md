---
"@tailor-platform/app-shell": minor
---

Add `Tree` and `TreePicker`. `Tree` shows your own hierarchical items as an ARIA tree, for browsing, picking one node, or ticking many as a form control. `TreePicker` is a checkbox tree in a fixed-height dialog with search and an "Add N items" commit, the way `DatePicker` wraps `DateField`.

Pass your own items with `mapItem`, as with `Select` and `Combobox`. A key is the item's identity across the whole tree, and `mapItem` receives the item's `parents` so you can compose a unique key when codes repeat. The item type comes from `items`; when levels are different types, type `items` as their union (here `categories: (Category | Product)[]`).

```tsx
import { Tree } from "@tailor-platform/app-shell";

<Tree
  aria-label="Products"
  items={categories}
  mapItem={(item) =>
    "products" in item
      ? { key: item.id, label: item.name, children: item.products }
      : { key: item.sku, label: item.name }
  }
  selectionMode="checkbox"
  value={skus}
  onValueChange={setSkus}
/>;
```

- **Selection modes:** `selectionMode` is `"none"` (the default, for browsing with `onAction`), `"single"` (one selected row through `selectedKey`), or `"checkbox"` (a multi-select `value`). Each mode's props are ruled out in the others, so a form prop without checkbox mode is a type error.
- **How ticking works:** `selectionStrategy` is `"leaves"` (the default), `"topmost"` or `"all"`, where parents are containers and the value lists leaves, a fully ticked parent in place of its leaves, or everything ticked; or `"cascade"` or `"independent"`, where a parent can be ticked on its own, with or without ticking everything beneath it.
- **Filtering:** `filter` narrows the tree to matches and their ancestors and opens the groups they're in. The tree has no search box of its own; `TreePicker` adds one, with `matchesSearch` and `filterSlot`.
- **Forms:** in checkbox mode, `name` submits one hidden input per value key; `required`, `disabled`, `itemToStringValue`, and `Field.Root` integration (label, description, error, invalid state) work as on `Select`.
- **Keyboard:** `role="tree"` with roving focus. Arrows move and open, Space selects or ticks, and Enter runs `onAction` (or, in checkbox mode with no `onAction`, submits the owning form; the picker commits).
- **Disabled items:** `disabled` from `mapItem`, cascading from a parent to its children.

Built-in labels are localised (English and Japanese) through the app locale; any label prop overrides them.
