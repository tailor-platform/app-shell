---
kind: code-backed
group: checkbox-tree
title: CheckboxTree
description: Pick many items from a hierarchical catalog — inline with CheckboxTree, or in a dialog with CheckboxTreePicker
sources:
  - packages/core/src/components/checkbox-tree/**
---

# CheckboxTree

`CheckboxTree` is a searchable, multi-select tree for picking many items out of a hierarchical catalog — products with variants, warehouses with bins, accounts with sub-accounts. Ticking a parent selects every leaf beneath it, and searching auto-expands to the matches.

It renders inline and works as a form control. For the common "pick, then add" flow, **`CheckboxTreePicker`** is the same tree in a dialog with a title, Cancel, and an "Add N items" button — the same split as `DateField` and `DatePicker`.

## Import

```tsx
import { CheckboxTree, CheckboxTreePicker } from "@tailor-platform/app-shell";
```

## Basic Usage

Pass your own items and say how to read them with `mapItem`, as with `Select` and `Combobox`. `children` points at your own child array; an item with no children is a leaf.

```tsx
type Category = { id: string; name: string; products: Product[] };
type Product = { sku: string; name: string; price: number };

const [selected, setSelected] = useState<string[]>([]);

<CheckboxTree<Category | Product>
  aria-label="Products"
  className="h-96"
  items={categories}
  mapItem={(item) =>
    "products" in item
      ? { key: item.id, label: item.name, children: item.products }
      : { key: item.sku, label: item.name }
  }
  value={selected}
  onValueChange={setSelected}
/>;
```

A `key` only has to be unique **among its siblings**: the tree identifies each item by its path, so the same key under two parents is never confused.

## Rows and columns

The row shows the item's `label` by default. `renderItem` replaces it, and `leadingColumn` / `trailingColumn` add aligned columns with their own header cells — the tree lines them up across rows, so you don't rebuild that alignment inside `renderItem`. Each `render` receives the row's state.

```tsx
<CheckboxTree<Category | Product>
  {...props}
  itemHeader="Product"
  renderItem={({ item, isLeaf }) =>
    isLeaf ? <ProductRow product={item as Product} /> : <strong>{item.name}</strong>
  }
  leadingColumn={{
    width: 40,
    render: ({ item, isLeaf }) => (isLeaf ? <Thumbnail sku={(item as Product).sku} /> : null),
  }}
  trailingColumn={{
    header: "Unit price",
    render: ({ item, isLeaf }) => (isLeaf ? money((item as Product).price) : null),
  }}
/>
```

| Row state       | Type                  | Description                                                      |
| --------------- | --------------------- | ---------------------------------------------------------------- |
| `item`          | `T`                   | Your original item.                                              |
| `key` / `path`  | `string` / `string[]` | The item's key, and the keys from the top level down to it.      |
| `parents`       | `T[]`                 | Ancestors, top level first.                                      |
| `depth`         | `number`              | 0 for top-level rows.                                            |
| `isLeaf`        | `boolean`             | Only leaves are selectable values.                               |
| `checked`       | `boolean`             | For a parent: every enabled leaf beneath it is selected.         |
| `indeterminate` | `boolean`             | For a parent: some, but not all, leaves beneath it are selected. |
| `expanded`      | `boolean`             | The parent is open.                                              |
| `disabled`      | `boolean`             | The item, an ancestor, or the whole tree is disabled.            |

## Selection: keys or exact

Selection is **leaf-only**: only leaves are ever values. How a value identifies a leaf depends on `valueShape`.

**`"keys"` (default)** — the value is a list of leaf keys, and a key is selected wherever it appears. Use it when leaf keys are unique (database ids, SKUs), or when a repeated key really is the same item, like one product listed in two collections — ticking it in one place ticks it in both.

```tsx
<CheckboxTree
  {...props}
  defaultValue={["TEE-1", "CAP-1"]}
  onValueChange={(keys) => setKeys(keys)}
/>
```

**`"exact"`** — the value is a nested selection by key, from the top level down. Use it when the same key means different things under different parents, like bin `A1` in two warehouses. `true` selects that leaf, or every leaf beneath that parent.

```tsx
<CheckboxTree
  {...props}
  valueShape="exact"
  // Bin A1 in Warehouse X, plus every bin in Warehouse Y
  defaultValue={{ "wh-x": { A1: true }, "wh-y": true }}
  onValueChange={(selection) => setSelection(selection)}
/>
```

`onValueChange` reports the value in the same shape you pass in, so `value={value} onValueChange={setValue}` round-trips without conversion. Its second argument lists the selected leaves with their context: `details.selected` is `{ key, path, item, parents }[]` in tree order (one entry per key in the keys shape). Values that aren't in `items` — keys or branches for items not loaded yet — are kept as they were.

## Forms

`CheckboxTree` works like `Select` and the other form controls: as a plain form field, inside `Field.Root`, and with React Hook Form.

```tsx
<form action={saveCount}>
  <Field.Root name="bins">
    <Field.Label>Bins to count</Field.Label>
    <CheckboxTree<Warehouse | Bin> {...props} valueShape="exact" required />
    <Field.Description>Pick at least one bin.</Field.Description>
  </Field.Root>
  <Button type="submit">Start count</Button>
</form>
```

- **Submitting:** `name` (or the `Field.Root`'s name) renders one hidden input per selected leaf, so the server reads `formData.getAll("bins")`. The submitted string is the key in `"keys"` mode and `path.join("/")` in `"exact"` mode (`"wh-x/A1"`); `itemToStringValue(item, { path, parents })` overrides it.
- **`required`** blocks submission until at least one leaf is selected.
- **Inside `Field.Root`**, `Field.Label` names the tree, `Field.Description` and `Field.Error` are announced with it, and an invalid field sets `data-invalid` on the root.
- **`disabled`** (or a disabled `Field.Root`) locks the whole tree and leaves it out of submission.
- **`onBlur`** fires once focus leaves the tree, not between rows — React Hook Form uses it to mark the field touched.

## Disabled items

Return `disabled: true` from `mapItem` to lock an item. A disabled parent locks everything beneath it. Ticking a parent skips its disabled leaves, and a parent counts as checked once every _enabled_ leaf beneath it is selected. A disabled leaf that is already selected stays selected.

```tsx
mapItem={(bin) => ({ key: bin.code, label: bin.code, disabled: bin.status === "counting" })}
```

## CheckboxTreePicker

The same tree in a dialog. It takes the same item, row, and search props, plus a commit step. Each open starts empty, and `onCommit` receives the selected leaves with their paths and parents.

```tsx
<CheckboxTreePicker<Category | Product>
  open={open}
  onOpenChange={setOpen}
  title="Add items from catalog"
  items={categories}
  mapItem={mapCatalogItem}
  itemHeader="Product"
  trailingColumn={{
    header: "Unit price",
    render: ({ item, isLeaf }) => (isLeaf ? money((item as Product).price) : null),
  }}
  onCommit={(picked) => addToOrder(picked.map((entry) => entry.item as Product))}
/>
```

## Props

### Shared (CheckboxTree and CheckboxTreePicker)

| Prop                | Type                                                | Default                | Description                                                         |
| ------------------- | --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `items`             | `ReadonlyArray<T>`                                  | required               | Your top-level items.                                               |
| `mapItem`           | `(item: T) => { key, label, children?, disabled? }` | required               | Reads an item's key, label, children and disabled state.            |
| `renderItem`        | `(row) => ReactNode`                                | the item's `label`     | The main column's content.                                          |
| `itemHeader`        | `ReactNode`                                         | `"Item"`               | Header above the main column.                                       |
| `leadingColumn`     | `{ header?, render(row), align?, width? }`          | –                      | A column between the expand caret and the main column.              |
| `trailingColumn`    | `{ header?, render(row), align?, width? }`          | –                      | A right-aligned column after the main one.                          |
| `matchesSearch`     | `(item: T, query: string) => boolean`               | match on `label`       | Search predicate. A node is kept when it or any descendant matches. |
| `filterSlot`        | `ReactNode`                                         | –                      | Slot beside the search input, e.g. a category filter.               |
| `emptyText`         | `ReactNode`                                         | `"No matching items."` | Shown when the filtered tree is empty.                              |
| `searchPlaceholder` | `string`                                            | `"Search"`             | Search input placeholder.                                           |

### CheckboxTree

| Prop                             | Type                                  | Default     | Description                                                            |
| -------------------------------- | ------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `valueShape`                     | `"keys" \| "exact"`                   | `"keys"`    | How a value identifies a leaf.                                         |
| `value` / `defaultValue`         | `string[]` or `CheckboxTreeSelection` | –           | Controlled / initial selection, in the shape `valueShape` names.       |
| `onValueChange`                  | `(value, { selected }) => void`       | –           | Every change, in the same shape, plus the selected leaves.             |
| `onAction`                       | `() => void`                          | submit form | Enter on a row. Without it, Enter submits the owning form.             |
| `name` / `form`                  | `string`                              | –           | Hidden inputs for native form submission. `Field.Root`'s name wins.    |
| `itemToStringValue`              | `(item, { path, parents }) => string` | key / path  | The string each hidden input carries.                                  |
| `required` / `disabled`          | `boolean`                             | `false`     | At least one leaf required / lock the whole tree.                      |
| `id` / `inputRef` / `onBlur`     | –                                     | –           | Form control id, the hidden proxy input, and blur from the whole tree. |
| `aria-label` / `aria-labelledby` | `string`                              | –           | Names the tree, when there's no `Field.Label`.                         |
| `className`                      | `string`                              | –           | Merged onto the root; give it a height for long trees.                 |

### CheckboxTreePicker

| Prop           | Type                                                | Default          | Description                                                         |
| -------------- | --------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `open`         | `boolean`                                           | required         | Controls dialog visibility.                                         |
| `onOpenChange` | `(open: boolean) => void`                           | required         | Fires on every user-driven open or close, including after a commit. |
| `onCommit`     | `(selected: CheckboxTreeSelectedItem<T>[]) => void` | required         | Receives the selected leaves in tree order.                         |
| `title`        | `ReactNode`                                         | `"Select items"` | Dialog title. Also labels the tree for assistive tech.              |
| `valueShape`   | `"keys" \| "exact"`                                 | `"keys"`         | How selection works while picking.                                  |
| `ctaLabel`     | `(count: number) => ReactNode`                      | `"Add N items"`  | Primary button label.                                               |
| `className`    | `string`                                            | –                | Merged onto the dialog panel.                                       |

The default labels are localized (English and Japanese) through the app's locale, like DataTable's; passing a label prop overrides it.

## Behavior

**Search auto-expands.** A node survives the filter if it matches or if any descendant does. Every ancestor of a match is expanded for the duration of the query, so matches are visible without clicking. Groups a search opened can still be closed and reopened, showing only their matches; manually expanded rows stay expanded once the query clears. Escape clears the search first; in the picker, a second Escape closes the dialog.

**Mouse.** Clicking a group row opens or closes it; its checkbox selects everything inside. Clicking an item row ticks or unticks it.

**Keyboard.** The tree is a `role="tree"` with roving focus: Arrow Up/Down move between visible rows, Arrow Right expands a collapsed parent or steps into it, Arrow Left collapses or steps out to the parent, Home/End jump to the ends, Space toggles the focused row, and Enter runs `onAction` (in the picker, it commits). Enter in the search box or in a `filterSlot` control (a menu or select) is left to that control.

**Picker height.** The picker keeps one height; the list scrolls inside it, so opening or closing a group never resizes the dialog or moves what is on screen.

## Loading an async catalog

There is deliberately no async variant: auto-expanding to matches needs the whole tree up front. Fetch once before or on open, and drive `emptyText` from your own loading flag. Keys in `value` for items that haven't loaded yet are kept, so a controlled selection survives the load.

```tsx
const { data, isLoading } = useCatalogQuery();

<CheckboxTreePicker
  open={open}
  onOpenChange={setOpen}
  items={data ?? []}
  mapItem={mapCatalogItem}
  emptyText={isLoading ? "Loading catalog…" : "No matching items."}
  onCommit={handleCommit}
/>;
```

## Related

- [Combobox](./combobox.md) — inline single or multi select for flat option lists
- [Select](./select.md) — dropdown select, with the same `items` + `mapItem` pattern
- [Dialog](./dialog.md) — the modal shell `CheckboxTreePicker` composes
