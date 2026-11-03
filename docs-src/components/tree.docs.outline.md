---
kind: code-backed
group: tree
title: Tree
description: Browse, pick one, or tick many items in a hierarchy — inline with Tree, or in a search dialog with TreePicker
sources:
  - packages/core/src/components/tree/**
---

# Tree

`Tree` shows your own hierarchical items (accounts with sub-accounts, warehouses with bins, categories with products) as an ARIA tree. It can be a plain browser, a single-select for master–detail views, or a multi-select checkbox form control.

The tree is the primitive, so it has no search box of its own. For the common "search, pick, then add" flow, **`TreePicker`** is a checkbox tree in a dialog with search, Cancel, and an "Add N items" button, the same split as `DateField` and `DatePicker`.

Trees are single-column. If you need a hierarchy with real columns (sorting, pinning, wide data), that's a tree grid, which belongs with the data table rather than here.

## Import

```tsx
import { Tree, TreePicker } from "@tailor-platform/app-shell";
```

## Basic Usage

Pass your own items and say how to read them with `mapItem`, as with `Select` and `Combobox`. `children` points at your own child array, and an item with no children is a leaf.

```tsx
type Account = { code: string; name: string; children?: Account[] };

<Tree<Account>
  aria-label="Chart of accounts"
  className="h-96"
  items={accounts}
  mapItem={(account) => ({
    key: account.code,
    label: `${account.code} ${account.name}`,
    children: account.children,
  })}
  onAction={(account) => navigate(`/accounts/${account.code}`)}
/>;
```

### Keys

A `key` is the item's identity across the whole tree. The same key in two places is one item, so a product listed in two collections ticks in both places at once.

When codes repeat with different meanings, like bin `A1` in two warehouses, compose a unique key. `mapItem` receives the item's `parents` for exactly this.

```tsx
mapItem={(item, { parents }) =>
  "bins" in item
    ? { key: item.id, label: item.name, children: item.bins }
    : { key: `${(parents[0] as Warehouse).id}/${item.code}`, label: item.code }
}
```

## Selection modes

`selectionMode` sets what clicking and Space do to a row.

| Mode               | What a row does                                                           | State                    |
| ------------------ | ------------------------------------------------------------------------- | ------------------------ |
| `"none"` (default) | Clicking a leaf runs `onAction`, and clicking a parent opens or closes it | –                        |
| `"single"`         | One row is selected at a time, parents included                           | `selectedKey`            |
| `"checkbox"`       | Rows have checkboxes, and the tree is a multi-select form control         | `value` (a list of keys) |

Enter runs `onAction(item, key)` on any row, in every mode. The props are a union on `selectionMode`, so `value` or `name` without `selectionMode="checkbox"` is a type error rather than silently ignored.

### Single

```tsx
const [selected, setSelected] = useState<string | null>(null);

<Tree<Account>
  {...props}
  selectionMode="single"
  selectedKey={selected}
  onSelectedKeyChange={(key) => setSelected(key)}
/>;
```

Selecting a closed parent opens it. Its caret closes it again, so selecting an open parent never hides what you were looking at.

### Checkbox

```tsx
const [skus, setSkus] = useState<string[]>([]);

<Tree<Category | Product>
  {...props}
  selectionMode="checkbox"
  value={skus}
  onValueChange={setSkus}
/>;
```

`onValueChange(value, { selected })` gives the new value plus the items it lists, as `{ key, item, parents }[]` in tree order. Keys in the value that aren't in `items` (not loaded yet, say) are kept as they were.

## How ticking works

Two props decide how ticking spreads and what ends up in the value. Both default to the most common case: parents are just containers, and the value lists leaves.

`selectionPropagation` answers "is a parent data, or just a folder?"

| Value              | Parents are              | Ticking a parent                                                            |
| ------------------ | ------------------------ | --------------------------------------------------------------------------- |
| `"full"` (default) | containers               | Ticks every enabled leaf beneath it. Its checkbox is derived from them.     |
| `"down"`           | items in their own right | Ticks itself and everything beneath it. Unticking a child leaves it ticked. |
| `"none"`           | items in their own right | Ticks only itself.                                                          |

`valueStrategy` answers "what do I get back?"

| Value                | The value lists                                                      |
| -------------------- | -------------------------------------------------------------------- |
| `"leaves"` (default) | The ticked leaves.                                                   |
| `"topmost"`          | A fully ticked parent in place of its leaves, plus any loose leaves. |
| `"all"`              | Every ticked item, parents included.                                 |

When parents are items in their own right (`"down"` or `"none"`), only `"all"` keeps their state, so it's the only strategy those modes allow, and it's their default. The types rule out the other combinations.

```tsx
// Everything in a warehouse comes back as the warehouse key, not every bin.
<Tree {...props} selectionMode="checkbox" valueStrategy="topmost" />

// A parent purchase order can be approved without its child orders.
<Tree {...props} selectionMode="checkbox" selectionPropagation="none" />
```

Every combination round-trips: passing a value back in shows the same ticks. With `"full"`, a parent key in the value stands for every leaf beneath it, so `defaultValue={["wh-x"]}` ticks all of Warehouse X.

## Rows

The row shows the item's `label` by default. `renderItem` replaces it, and receives the row's state.

```tsx
renderItem={({ item, isLeaf }) =>
  isLeaf ? (
    <span className="flex w-full justify-between gap-3">
      <span>{item.name}</span>
      <span className="text-muted-foreground tabular-nums">{money(item.price)}</span>
    </span>
  ) : (
    <strong>{item.name}</strong>
  )
}
```

| Row state       | Type      | Description                                                                        |
| --------------- | --------- | ---------------------------------------------------------------------------------- |
| `item`          | `T`       | Your original item.                                                                |
| `key`           | `string`  | The item's key.                                                                    |
| `parents`       | `T[]`     | Ancestors, top level first.                                                        |
| `depth`         | `number`  | 0 for top-level rows.                                                              |
| `isLeaf`        | `boolean` | The item has no children.                                                          |
| `checked`       | `boolean` | Checkbox mode: the row is ticked. With `"full"`, every enabled leaf beneath it is. |
| `indeterminate` | `boolean` | Checkbox mode with `"full"`: some, but not all, enabled leaves beneath it are.     |
| `selected`      | `boolean` | Single mode: the row is the selected one.                                          |
| `expanded`      | `boolean` | The parent is open.                                                                |
| `disabled`      | `boolean` | The item, an ancestor, or the whole tree is disabled.                              |

## Filtering

`filter` narrows the tree to matching items plus their ancestors, and opens the groups they're in. It receives the item with its `label` and `parents`. A parent that matches with no matching children keeps all of them, so it can still be opened.

```tsx
const [query, setQuery] = useState("");
const filter = useMemo(
  () => (query ? (_: Account, { label }: { label: string }) => label.includes(query) : undefined),
  [query],
);

<Input value={query} onChange={(event) => setQuery(event.target.value)} />
<Tree<Account> {...props} filter={filter} />
```

Groups a filter opened can still be closed. They stay closed until the matches change, so an inline `filter` recreated on every render won't reopen them.

## Forms

In checkbox mode, `Tree` works like `Select` and the other form controls: as a plain form field, inside `Field.Root`, and with React Hook Form.

```tsx
<form action={saveCount}>
  <Field.Root name="bins">
    <Field.Label>Bins to count</Field.Label>
    <Tree<Warehouse | Bin> {...props} selectionMode="checkbox" required />
    <Field.Description>Pick at least one bin.</Field.Description>
  </Field.Root>
  <Button type="submit">Start count</Button>
</form>
```

- **Submitting:** `name` (or the `Field.Root`'s name) renders one hidden input per value key, so the server reads `formData.getAll("bins")`. `itemToStringValue(item, { parents })` changes the submitted string.
- **`required`** blocks submission until at least one item is ticked.
- **Inside `Field.Root`**, `Field.Label` names the tree, `Field.Description` and `Field.Error` are announced with it, and an invalid field sets `data-invalid` on the root.
- **`disabled`** (or a disabled `Field.Root`) locks the whole tree and leaves it out of submission.
- **`onBlur`** fires once focus leaves the tree, not between rows. React Hook Form uses it to mark the field touched.
- **Enter** runs `onAction`, or submits the owning form when there's no `onAction`, like Enter in a text input.

Only checkbox mode is a form control. In `"none"` and `"single"` modes the tree doesn't register with `Field`.

## Disabled items

Return `disabled: true` from `mapItem` to lock an item. A disabled parent locks everything beneath it. Ticking a parent skips its disabled leaves, and with `"full"` a parent counts as ticked once every _enabled_ leaf beneath it is. A disabled item that's already ticked stays ticked, and a disabled row can't be selected.

```tsx
mapItem={(bin) => ({ key: bin.code, label: bin.code, disabled: bin.status === "counting" })}
```

## TreePicker

A checkbox tree in a dialog, with search. It takes the same item, row and ticking props as `Tree`, plus the search and commit props. Each open starts empty, and `onCommit` receives the value's items in tree order.

```tsx
<TreePicker<Category | Product>
  open={open}
  onOpenChange={setOpen}
  title="Add items from catalogue"
  items={categories}
  mapItem={mapCatalogItem}
  renderItem={renderCatalogItem}
  matchesSearch={(item, query) => item.name.toLowerCase().includes(query.toLowerCase())}
  onCommit={(picked) => addToOrder(picked.map((entry) => entry.item as Product))}
/>
```

## Props

### Shared (Tree and TreePicker)

| Prop         | Type                                                             | Default            | Description                                                                |
| ------------ | ---------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `items`      | `ReadonlyArray<T>`                                               | required           | Your top-level items.                                                      |
| `mapItem`    | `(item: T, { parents }) => { key, label, children?, disabled? }` | required           | Reads an item's key, label, children and disabled state.                   |
| `renderItem` | `(row) => ReactNode`                                             | the item's `label` | The row's content.                                                         |
| `emptyText`  | `ReactNode`                                                      | "No items."        | Shown when there's nothing to show ("No matching items." while filtering). |

### Tree

| Prop                             | Type                                       | Default  | Description                                              |
| -------------------------------- | ------------------------------------------ | -------- | -------------------------------------------------------- |
| `selectionMode`                  | `"none" \| "single" \| "checkbox"`         | `"none"` | What clicking and Space do to a row.                     |
| `onAction`                       | `(item: T, key: string) => void`           | –        | Enter on a row. In `"none"` mode, a click on a leaf too. |
| `filter`                         | `(item: T, { label, parents }) => boolean` | –        | Shows only matches and their ancestors.                  |
| `disabled`                       | `boolean`                                  | `false`  | Locks the whole tree.                                    |
| `aria-label` / `aria-labelledby` | `string`                                   | –        | Names the tree, when there's no `Field.Label`.           |
| `className`                      | `string`                                   | –        | Merged onto the root. Give it a height for long trees.   |

With `selectionMode="single"`:

| Prop                                 | Type                             | Default | Description                        |
| ------------------------------------ | -------------------------------- | ------- | ---------------------------------- |
| `selectedKey` / `defaultSelectedKey` | `string \| null`                 | `null`  | Controlled / initial selected row. |
| `onSelectedKeyChange`                | `(key: string, item: T) => void` | –       | Fires when the user selects a row. |

With `selectionMode="checkbox"`:

| Prop                         | Type                             | Default                        | Description                                                            |
| ---------------------------- | -------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `value` / `defaultValue`     | `string[]`                       | –                              | Controlled / initial value: the ticked keys.                           |
| `onValueChange`              | `(value, { selected }) => void`  | –                              | Every change, plus the items the value lists.                          |
| `selectionPropagation`       | `"full" \| "down" \| "none"`     | `"full"`                       | How ticking spreads through the tree.                                  |
| `valueStrategy`              | `"leaves" \| "topmost" \| "all"` | `"leaves"` (`"all"` for items) | What the value lists.                                                  |
| `name` / `form`              | `string`                         | –                              | Hidden inputs for native form submission. `Field.Root`'s name wins.    |
| `itemToStringValue`          | `(item, { parents }) => string`  | the key                        | The string each hidden input carries.                                  |
| `required`                   | `boolean`                        | `false`                        | At least one item must be ticked.                                      |
| `id` / `inputRef` / `onBlur` | –                                | –                              | Form control id, the hidden proxy input, and blur from the whole tree. |

### TreePicker

| Prop                                     | Type                                        | Default          | Description                                                         |
| ---------------------------------------- | ------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `open`                                   | `boolean`                                   | required         | Controls dialog visibility.                                         |
| `onOpenChange`                           | `(open: boolean) => void`                   | required         | Fires on every user-driven open or close, including after a commit. |
| `onCommit`                               | `(selected: TreeSelectedItem<T>[]) => void` | required         | Receives the value's items in tree order.                           |
| `selectionPropagation` / `valueStrategy` | as on `Tree`                                | as on `Tree`     | How ticking works while picking.                                    |
| `matchesSearch`                          | `(item: T, query: string) => boolean`       | match on `label` | Search predicate. An item is kept when it or a descendant matches.  |
| `filterSlot`                             | `ReactNode`                                 | –                | Beside the search input, e.g. a category filter.                    |
| `searchPlaceholder`                      | `string`                                    | `"Search"`       | Search input placeholder.                                           |
| `title`                                  | `ReactNode`                                 | `"Select items"` | Dialog title. Also labels the tree for assistive tech.              |
| `ctaLabel`                               | `(count: number) => ReactNode`              | `"Add N items"`  | Primary button label.                                               |
| `className`                              | `string`                                    | –                | Merged onto the dialog panel.                                       |

The default labels are localised (English and Japanese) through the app's locale, like DataTable's. Passing a label prop overrides it.

## Behaviour

**Keyboard.** The tree is a `role="tree"` with roving focus. Arrow Up / Down move between visible rows, Arrow Right opens a closed parent or steps into it, Arrow Left closes or steps out to the parent, and Home / End jump to the ends. Space selects or ticks the focused row, and Enter runs `onAction` (in the picker, it commits).

**Mouse.** In checkbox mode, clicking a group row opens or closes it and its checkbox ticks everything inside, while clicking an item row ticks it. In single mode, clicking selects. In `"none"` mode, clicking a leaf runs `onAction`.

**Picker search.** Matches stay visible with their ancestors opened. Escape clears the search first, and a second Escape closes the dialog. Enter in the search box or in a `filterSlot` control (a menu or select) is left to that control.

**Picker height.** The picker keeps one height and the list scrolls inside it, so opening or closing a group never resizes the dialog or moves what's on screen.

## Loading an async catalogue

There's deliberately no async variant yet: filtering and auto-expanding need the whole tree up front. Fetch once before or on open, and drive `emptyText` from your own loading flag. Keys in `value` for items that haven't loaded yet are kept, so a controlled selection survives the load.

```tsx
const { data, isLoading } = useCatalogQuery();

<TreePicker
  open={open}
  onOpenChange={setOpen}
  items={data ?? []}
  mapItem={mapCatalogItem}
  emptyText={isLoading ? "Loading catalogue…" : undefined}
  onCommit={handleCommit}
/>;
```

## Related

- [Combobox](./combobox.md) — inline single or multi select for flat option lists
- [Select](./select.md) — dropdown select, with the same `items` + `mapItem` pattern
- [Dialog](./dialog.md) — the modal shell `TreePicker` composes
