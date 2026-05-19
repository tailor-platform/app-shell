---
title: BulkItemPicker
description: Generic tree-select dialog for multi-selecting from a hierarchical list — products with variants, accounts with sub-accounts, categories with tags. Decoupled from LineItems.
---

# BulkItemPicker

`BulkItemPicker` is a render-prop dialog that lets the user multi-select leaves from a tree of items, with a search input, tri-state checkboxes on parents, and an "Add N items" CTA. It is **decoupled from `LineItems`** — it can drive any flow that needs a multi-select-from-tree (bulk-add line items, bulk-tag, wizard step picker, etc.).

The picker owns selection state, search filtering, expand / collapse, and the dialog chrome. The consumer fully controls per-row visuals via `renderRow` and `renderMetric`.

## Import

```tsx
import {
  BulkItemPicker,
  type BulkItemPickerNode,
  type BulkItemPickerProps,
} from "@tailor-platform/app-shell";
```

## Basic usage

```tsx
type Product = { name: string; available: number };

const tree: BulkItemPickerNode<Product>[] = [
  { id: "p1", data: { name: "Nike Vomero 18", available: 3 } },
  {
    id: "p2",
    data: { name: "Adidas Ultraboost 22", available: 0 },
    children: [
      { id: "p2-uk8w", data: { name: "UK 8 / Black / Women", available: 9 } },
      { id: "p2-uk9m", data: { name: "UK 9 / Black / Men", available: 9 } },
    ],
  },
];

function PickerExample() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Bulk add</Button>
      <BulkItemPicker<Product>
        open={open}
        onOpenChange={setOpen}
        title="Bulk line item picker"
        rowLabel="Product Name"
        metricLabel="Total available"
        items={tree}
        renderRow={(node) => (
          <span className="astw:font-medium">{node.data.name}</span>
        )}
        renderMetric={(node) => node.data.available}
        matchesSearch={(node, q) =>
          node.data.name.toLowerCase().includes(q.toLowerCase())
        }
        onCommit={(leaves) => {
          // leaves is the selected leaf nodes in tree order.
          lineItems.addLines(leaves.map((n) => ({ sku: n.id, ... })));
        }}
      />
    </>
  );
}
```

## Props

| Prop                | Type                                          | Default                                                    | Description                                                                               |
| ------------------- | --------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `open`              | `boolean`                                     | **Required**                                               | Controls dialog visibility.                                                               |
| `onOpenChange`      | `(open: boolean) => void`                     | **Required**                                               | Fires on user-driven open / close (Esc, backdrop click, Cancel, after commit).            |
| `items`             | `ReadonlyArray<BulkItemPickerNode<T>>`        | **Required**                                               | Hierarchical items. A node is a leaf if `children` is `undefined` or empty.               |
| `renderRow`         | `(node, depth) => ReactNode`                  | **Required**                                               | Renders the row content (the picker draws the checkbox + metric).                         |
| `onCommit`          | `(selected: BulkItemPickerNode<T>[]) => void` | **Required**                                               | Receives the selected **leaf** nodes in tree order. Picker closes itself after the call.  |
| `title`             | `ReactNode`                                   | `"Select items"`                                           | Dialog title.                                                                             |
| `rowLabel`          | `ReactNode`                                   | `"Item"`                                                   | Header label above the row content column.                                                |
| `metricLabel`       | `ReactNode`                                   | —                                                          | Header label above the right-aligned metric column.                                       |
| `renderMetric`      | `(node, depth) => ReactNode`                  | —                                                          | Optional right-aligned metric (e.g. "Total available").                                   |
| `matchesSearch`     | `(node, query) => boolean`                    | Default: case-insensitive substring on `String(node.data)` | Search predicate. Override for object payloads.                                           |
| `filterSlot`        | `ReactNode`                                   | —                                                          | Render-prop slot to the right of the search input — host a category / tag filter UI here. |
| `ctaLabel`          | `(count: number) => string`                   | `"Add ${count} items"`                                     | Customise the primary CTA label.                                                          |
| `emptyText`         | `ReactNode`                                   | `"No matching items."`                                     | Shown when search has no matches.                                                         |
| `searchPlaceholder` | `string`                                      | `"Search"`                                                 | Search input placeholder.                                                                 |

### `BulkItemPickerNode<T>`

```ts
type BulkItemPickerNode<T = unknown> = {
  id: string;
  data: T;
  children?: BulkItemPickerNode<T>[];
};
```

- `id` must be unique across the entire tree (it doubles as the selection key).
- `data` is opaque — the picker only passes it to `renderRow`, `renderMetric`, and `matchesSearch`.
- A node with `undefined` or empty `children` is a **leaf**. Selection is leaf-only.

## Behaviour

### Selection model

- Selection is stored as a `Set<id>` of leaf ids.
- Clicking a parent's checkbox toggles every descendant leaf — selects all if any are unselected, deselects all if all are selected.
- Parents render a tri-state checkbox: unchecked / `indeterminate` / checked, derived from descendants.
- Selection resets when the dialog closes — each open starts fresh.

### Search

- Empty query → full tree visible.
- Non-empty query → a node survives if it matches OR any of its descendants does.
- Parents whose descendants match auto-expand (so the matching variants are reachable without manual expand).
- Override `matchesSearch` when `data` is an object (the default matcher stringifies, which is rarely what you want).

### Keyboard

- `Esc` — closes (Dialog default).
- `Enter` — commits if any leaves are selected. Suppressed inside the search input so typing doesn't accidentally submit.

### Commit

- `onCommit` fires with leaf nodes in **DFS tree order** (matches what the user visually selected top-to-bottom).
- The dialog closes itself after `onCommit`. The consumer should not call `onOpenChange(false)` separately.
- The CTA is disabled while no leaves are selected.

## Common pairings

### With `useLineItems().addLines`

The canonical pairing. Each leaf becomes one line, committed in a single render:

```tsx
<BulkItemPicker
  ...
  onCommit={(picks) =>
    lineItems.addLines(
      picks.map((n) => ({
        sku: n.id,
        productName: n.data.productName,
        quantity: 1,
        unitPrice: n.data.unitPrice,
      })),
    )
  }
/>
```

### Async catalog

For server-paginated catalogs, fetch upstream and pass the static `items` once loaded:

```tsx
const { data: tree, isLoading } = useCatalog();

<BulkItemPicker
  open={open}
  onOpenChange={setOpen}
  items={tree ?? []}
  emptyText={isLoading ? "Loading…" : "No matches."}
  ...
/>
```

The picker doesn't bake in fetching so consumers can use whatever data layer they already have.

### Custom filter button

Use `filterSlot` to host a filter trigger next to the search input. The picker doesn't dictate the filter UI:

```tsx
<BulkItemPicker
  ...
  filterSlot={
    <Button variant="outline" size="icon" onClick={openFilterDrawer}>
      <FilterIcon />
    </Button>
  }
/>
```

Apply the filter outside the picker by narrowing the `items` prop accordingly.

## Tips

- The picker's height is capped at `80vh`. For very deep trees, prefer flattening with `searchableText` over forcing the user to expand many parents — the auto-expand on search already handles most discovery.
- If you need single-select instead, gate `onCommit` to the first leaf or use `Combobox` directly.
- `id` collisions across the tree silently break selection. If your data has duplicate keys at different levels, prefix them on construction (e.g. `${parentId}-${leafId}`).

## Related

- `Dialog` — used internally for the modal chrome.
- `LineItems` — `addLines` is the canonical sink for picker output.
- `Combobox` — for single-select-from-flat-list.
