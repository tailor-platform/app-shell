---
kind: code-backed
group: bulk-item-picker
title: BulkItemPicker
description: Tree-select dialog for picking many items from a hierarchical catalog and committing them in one batch
sources:
  - packages/core/src/components/bulk-item-picker/**
---

# BulkItemPicker

`BulkItemPicker` is a dialog for picking many items out of a hierarchical catalog — products with variants, nested categories — and handing them back in one batch. Ticking a parent selects every leaf beneath it, and searching auto-expands to the matches.

It is generic and standalone: it knows nothing about line items, or about what your nodes contain. `data` is opaque, handed back only to your render and search callbacks.

## Import

```tsx
import { BulkItemPicker } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
type CatalogItem = { sku: string; name: string; price: number };

const CATALOG: BulkItemPickerNode<CatalogItem>[] = [
  {
    id: "tees",
    data: { sku: "TEES", name: "T-Shirts", price: 0 },
    children: [
      { id: "TEE-WHT-S", data: { sku: "TEE-WHT-S", name: "Tee, White, Small", price: 18.5 } },
      { id: "TEE-WHT-M", data: { sku: "TEE-WHT-M", name: "Tee, White, Medium", price: 18.5 } },
    ],
  },
];

<BulkItemPicker<CatalogItem>
  open={open}
  onOpenChange={setOpen}
  title="Add items from catalog"
  items={CATALOG}
  renderRow={(node) => node.data.name}
  renderMetric={(node) => (node.children ? null : `$${node.data.price.toFixed(2)}`)}
  rowLabel="Product"
  metricLabel="Unit price"
  matchesSearch={(node, q) =>
    `${node.data.sku} ${node.data.name}`.toLowerCase().includes(q.toLowerCase())
  }
  onCommit={(picked) => addToOrder(picked.map((n) => n.data))}
/>;
```

## Props

| Prop                | Type                                          | Default                | Description                                                                    |
| ------------------- | --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `open`              | `boolean`                                     | required               | Controls dialog visibility.                                                    |
| `onOpenChange`      | `(open: boolean) => void`                     | required               | Fires on every user-driven open or close, including after a commit.            |
| `items`             | `ReadonlyArray<BulkItemPickerNode<T>>`        | required               | The catalog tree. Selection is leaf-only.                                      |
| `renderRow`         | `(node, depth) => ReactNode`                  | required               | The row's own content. The library draws the checkbox, caret, and indentation. |
| `onCommit`          | `(selected: BulkItemPickerNode<T>[]) => void` | required               | Receives the selected leaf nodes in tree order.                                |
| `title`             | `ReactNode`                                   | `"Select items"`       | Dialog title. Also labels the tree for assistive tech.                         |
| `renderMetric`      | `(node, depth) => ReactNode`                  | –                      | Optional right-aligned metric column.                                          |
| `rowLabel`          | `ReactNode`                                   | `"Item"`               | Header above the `renderRow` column.                                           |
| `metricLabel`       | `ReactNode`                                   | –                      | Header above the metric column.                                                |
| `matchesSearch`     | `(node, query) => boolean`                    | substring on `data`    | Search predicate. **Override whenever `data` is an object.**                   |
| `filterSlot`        | `ReactNode`                                   | –                      | Slot beside the search input, e.g. a category filter.                          |
| `ctaLabel`          | `(count: number) => string`                   | `"Add N items"`        | Primary button label.                                                          |
| `emptyText`         | `ReactNode`                                   | `"No matching items."` | Shown when the filtered tree is empty.                                         |
| `searchPlaceholder` | `string`                                      | `"Search"`             | Search input placeholder.                                                      |

### BulkItemPickerNode

```tsx
type BulkItemPickerNode<T> = {
  id: string;
  data: T;
  children?: BulkItemPickerNode<T>[];
};
```

`id` must be unique across the whole tree — it doubles as the selection key. A node with no `children` is a leaf.

The default `matchesSearch` stringifies `node.data`, which only works for primitives. With object payloads every node becomes `"[object Object]"` and nothing matches, so pass your own predicate.

## Behavior

**Selection is leaf-only.** Only leaves are ever selected, and only leaves reach `onCommit`. A parent's checkbox is derived from its descendants: checked when all of them are selected, indeterminate when some are. Ticking a parent adds or removes all its leaves at once, and the CTA counts leaves, not rows.

**Search auto-expands.** A node survives the filter if it matches or if any descendant does. Every ancestor of a match is expanded for the duration of the query, so matches are visible without clicking; manually expanded rows stay expanded once the query clears.

**State resets on close.** Query, selection, and expansion are cleared when the dialog closes, so reopening starts fresh.

**Keyboard.** The tree is a `role="tree"` with roving focus: Arrow Up/Down move between visible rows, Arrow Right expands a collapsed parent or steps into it, Arrow Left collapses or steps out to the parent, Space toggles the focused row, and Enter commits — except while typing in the search box.

## Loading an async catalog

There is deliberately no async variant: auto-expanding to matches needs the whole tree up front. Fetch once before or on open, and drive `emptyText` from your own loading flag.

```tsx
const { data, isLoading } = useCatalogQuery();

<BulkItemPicker
  open={open}
  onOpenChange={setOpen}
  items={data ?? []}
  emptyText={isLoading ? "Loading catalog…" : "No matching items."}
  renderRow={(node) => node.data.name}
  onCommit={handleCommit}
/>;
```

## Pairing with LineItems

`onCommit` hands back leaf nodes; map them into rows and pass them to `addLines`, which inserts them in a single render and produces one `add` op per line.

```tsx
const lineItems = useLineItems<POLine>({ fields, data: lines });

<BulkItemPicker
  open={open}
  onOpenChange={setOpen}
  items={CATALOG}
  renderRow={(node) => node.data.name}
  onCommit={(picked) =>
    lineItems.addLines(
      picked.map((node) => ({
        sku: node.data.sku,
        quantity: 1,
        unitPrice: node.data.price,
      })),
    )
  }
/>;
```

## Related

- [LineItems](./line-items.md) — the editable document grid this commonly feeds
- [Combobox](./combobox.md) — inline single or multi select for flat option lists
- [Dialog](./dialog.md) — the modal shell this composes
