---
title: LineItems
description: Spreadsheet-grade table for editing rows of a document — purchase orders, invoices, journals, work orders. One hook owns state; a compound family renders the UI.
---

# LineItems

`LineItems` is a document-line editing surface designed for ERP-shaped data: purchase orders, sales orders, invoices, journal entries, work orders, stock transfers. State lives in a single `useLineItems` hook; UI is rendered by a compound family (`LineItems.Root`, `LineItems.Table`, etc.) that consumes the hook through context.

The component is intentionally **transport-agnostic** — it does not couple to GraphQL, REST, or any specific server contract. The hook produces a normalised `ChangeSet` that the consumer translates into their own document mutation.

## Import

```tsx
import {
  LineItems,
  useLineItems,
  useLineItemsGroup,
  createLineItemHelper,
  lineItemsFloatingBarStyles,
  type LineItemsField,
  type LineItemsRowData,
  type LineItemsMode,
  type UseLineItemsReturn,
  type LineItemsChangeSet,
} from "@tailor-platform/app-shell";
```

## Basic usage

Two pieces: declare a row shape + field schema, then mount a `Root` + `Table`.

```tsx
type POLine = LineItemsRowData & {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

const f = createLineItemHelper<POLine>();

const fields: LineItemsField<POLine>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    width: 160,
  }),
  f.field({
    key: "productName",
    label: "Product",
    render: (l) => l.productName,
    editable: ["edit"],
    type: { kind: "text" },
    width: 240,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 100,
  }),
  f.field({
    key: "unitPrice",
    label: "Unit price",
    render: (l) => l.unitPrice.toFixed(2),
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
    width: 120,
  }),
];

function PoLines() {
  const lineItems = useLineItems<POLine>({
    fields,
    data: initialLines,
    mode: "edit",
    selection: true,
  });

  const onSave = () => {
    const cs = lineItems.getChangeSet();
    if (cs.isEmpty) return;
    // dispatch cs.lineChanges to your mutation, then:
    lineItems.reset();
  };

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.Table />
      <LineItems.FloatingDock>
        <LineItems.DirtyBar warnOnNav onSave={onSave} />
        <LineItems.SelectionBar<POLine>>
          {({ bulkRemove, clear }) => (
            <>
              <button onClick={bulkRemove}>Delete selected</button>
              <button onClick={clear}>Clear</button>
            </>
          )}
        </LineItems.SelectionBar>
      </LineItems.FloatingDock>
    </LineItems.Root>
  );
}
```

## `useLineItems(options)`

| Option             | Type                             | Default      | Description                                                                                                                     |
| ------------------ | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `fields`           | `LineItemsField<T>[]`            | **Required** | Schema — declares columns, types, editors, validators.                                                                          |
| `data`             | `T[]`                            | `[]`         | Initial row data. Becomes the dirty-tracking baseline.                                                                          |
| `mode`             | `"edit" \| "display" \| "amend"` | `"edit"`     | Controls editability per field. `"amend"` paints a read-only tint on rows already saved.                                        |
| `selection`        | `boolean`                        | `false`      | When true, a checkbox column renders and `selectedIds` / `bulkUpdate` / `bulkRemove` become available.                          |
| `ordering`         | `"sort" \| "manual"`             | `"sort"`     | `"manual"` enables drag-to-reorder and emits `reorder` ops in the change set.                                                   |
| `lines`            | `T[]`                            | —            | Optional controlled mode: provide both `lines` and `onLinesChange` to drive state externally.                                   |
| `onLinesChange`    | `(lines: T[]) => void`           | —            | Required when `lines` is set.                                                                                                   |
| `onMetadataCommit` | `(event) => void`                | —            | Fires when a `commit: "metadata"` field changes; lets the consumer fire a side-effect mutation outside the document change-set. |

### Return shape (selected fields)

| Field                                                                                           | Description                                                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `lines`                                                                                         | Filtered + sorted rows (the rendered set).                                |
| `allLines`                                                                                      | Unfiltered rows in current order.                                         |
| `isDirty`                                                                                       | `true` when current state differs from baseline.                          |
| `getChangeSet()`                                                                                | Returns `{ isEmpty, lineChanges: [...] }` — the platform-spec change set. |
| `revert()`                                                                                      | Restores all rows to baseline (use for "Discard").                        |
| `reset()`                                                                                       | Snaps baseline forward (use after a successful save).                     |
| `addLine(partial, opts?)`                                                                       | Insert a single row; returns the new `lineRef`.                           |
| `addLines(items, opts?)`                                                                        | Batch insert N rows in one render. Returns `lineRef[]`.                   |
| `removeLine(lineRef)`                                                                           | Mark a row removed (or drop it if it was inserted client-side).           |
| `updateField(lineRef, key, value)`                                                              | Single-cell typed update.                                                 |
| `updateLines(patches)`                                                                          | Batched updates (one render).                                             |
| `reorderLine(lineRef, after)`                                                                   | Manual ordering only.                                                     |
| `selectedIds`, `toggleSelect`, `selectAllVisible`, `clearSelection`, `bulkUpdate`, `bulkRemove` | Selection API — only meaningful with `selection: true`.                   |
| `setFilter(query)`, `filter`                                                                    | In-component search — fields with a `search` callback contribute.         |

### `LineItemsField<T>`

| Prop               | Type                                                                               | Description                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `key`              | `keyof T`                                                                          | The data field this column renders / commits.                                                                 |
| `label`            | `ReactNode`                                                                        | Header text.                                                                                                  |
| `render`           | `(line: T) => ReactNode`                                                           | Read-only display in non-edit modes. Also used for the live cell view in `display` mode.                      |
| `editable`         | `("edit" \| "amend")[]`                                                            | Modes where the cell is editable. Omit for a read-only column.                                                |
| `type`             | `{ kind: "text" \| "number" \| "select" \| "boolean" \| "date" \| "custom"; ... }` | Editor flavour + per-kind options.                                                                            |
| `width`            | `number`                                                                           | Pixel width. Pinned and right-aligned columns require an explicit width.                                      |
| `flex`             | `boolean`                                                                          | Column absorbs leftover horizontal space. At most one `flex` per schema.                                      |
| `pinned`           | `"left" \| "right"`                                                                | Sticky position during horizontal scroll.                                                                     |
| `hoverExpandWidth` | `number`                                                                           | When the column is hovered, it grows to this width and the table expands rather than shrinking other columns. |
| `align`            | `"left" \| "right" \| "center"`                                                    | Cell alignment. Numerics default to right.                                                                    |
| `className`        | `string \| (line: T) => string`                                                    | Per-cell class — useful for invalid-state highlighting.                                                       |
| `commit`           | `"document" \| "metadata"`                                                         | `"metadata"` skips the change-set (use for fields like a per-row note that submits via a separate mutation).  |
| `equals`           | `(a: T[K], b: T[K]) => boolean`                                                    | Override equality for dirty-tracking (useful for arrays / id-keyed objects).                                  |
| `normalize`        | `(value: T[K]) => T[K]`                                                            | Coerces stored value before equality (trim, round, etc.).                                                     |
| `sort`             | `{ comparator: (a: T, b: T) => number }`                                           | Enable header-click sorting.                                                                                  |
| `search`           | `(line: T, query: string) => boolean`                                              | Contribute to the in-table search filter.                                                                     |

### Field types

| `type.kind` | Editor                         | Notes                                                                                                      |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `"text"`    | `<input type="text">`          | Default. `select()` on focus. Commits on blur.                                                             |
| `"number"`  | `<input type="number">`        | `decimals?` rounds + drives tolerance equality. Default `align: "right"`. Native spinner buttons hidden.   |
| `"select"`  | `Combobox`                     | `options: { value, label, description? }[]` and optional `placeholder`. Two-line render via `description`. |
| `"boolean"` | `<input type="checkbox">`      | `trueLabel?` / `falseLabel?` for the read-only span. Default `align: "center"`.                            |
| `"date"`    | `<input type="date">`          | ISO `yyyy-mm-dd`. Empty value commits as `null`. `min?` / `max?`.                                          |
| `"custom"`  | `field.type.renderEditor(ctx)` | Escape hatch. Pair with `normalize` / `equals` to keep dirty-tracking honest.                              |

## Compound parts

### `<LineItems.Root value>`

Required wrapper. Pass the hook return value as `value`. Provides context for every other compound part.

| Prop        | Type                    | Description           |
| ----------- | ----------------------- | --------------------- |
| `value`     | `UseLineItemsReturn<T>` | The hook's return.    |
| `className` | `string`                | Optional outer class. |

### `<LineItems.Table>`

The data grid. Renders header, virtualised rows, sticky-pinned columns, the cell selection rectangle, fill-drag handle, copy/paste, and the trailing actions column.

| Prop                      | Type                     | Default              | Description                                                 |
| ------------------------- | ------------------------ | -------------------- | ----------------------------------------------------------- |
| `maxBodyHeight`           | `CSSValue`               | `"min(60vh, 480px)"` | Vertical scroll threshold.                                  |
| `renderFullscreenToggle`  | `boolean`                | `true`               | Shows the built-in expand button at the table's top-right.  |
| `enableDragReorder`       | `boolean`                | `false`              | Drag-to-reorder rows (only when hook `ordering: "manual"`). |
| `emptyMessage`            | `ReactNode`              | `"No lines yet."`    | Empty-state copy.                                           |
| `rowActions`              | `(line: T) => ReactNode` | —                    | Trailing per-row actions. Auto-pinned right.                |
| `rowActionsWidth`         | `number`                 | `64`                 | Pixel width of the actions column.                          |
| `loading`                 | `boolean`                | `false`              | When true, tbody renders skeleton rows in place of data.    |
| `skeletonRowCount`        | `number`                 | `12`                 | Number of skeleton rows while `loading` is true.            |
| `tableContainerClassName` | `string`                 | —                    | Applied to the outer scroll container.                      |
| `className`               | `string`                 | —                    | Applied to the inner table root.                            |

### `<LineItems.SearchToggle>` / `<LineItems.Search>`

Type-to-filter input. `SearchToggle` is the collapsible variant for card headers; `Search` is the always-open variant.

| Prop                                                | Type     | Description                      |
| --------------------------------------------------- | -------- | -------------------------------- |
| `placeholder`                                       | `string` | Input placeholder.               |
| `variant`, `triggerSizeClassName`, `collapsedWidth` | —        | Visual props for `SearchToggle`. |

### `<LineItems.FullscreenToggle>`

Standalone trigger for the same fullscreen mode that the built-in toggle on `Table` exposes. Useful when you want it placed elsewhere.

### `<LineItems.AddRow>`

Convenience row at the bottom of the table that wraps `<Combobox>`. For richer add-flows (variant pickers, custom catalog), build the row inline using your own `<Combobox>` plus `lineItems.addLine(...)`.

### `<LineItems.SaveActions>`

Discard + Save buttons reading from `isDirty`. Discard defaults to `revert()`; Save calls the consumer's `onSave`. Use this when the page-level header doesn't already host the actions.

### `<LineItems.TotalsRow>`

Sticky footer row; render-prop receives the live `allLines` array and returns one value per column key.

```tsx
<LineItems.TotalsRow<InvoiceLine>>
  {(lines) => ({
    quantity: lines.reduce((s, l) => s + l.quantity, 0),
    amount: <strong>${lines.reduce((s, l) => s + l.amount, 0).toFixed(2)}</strong>,
  })}
</LineItems.TotalsRow>
```

### Floating dock parts

Bottom-center fixed dock for dirty + selection states. Auto-mounts when the relevant hook state is non-empty.

```tsx
<LineItems.FloatingDock>
  <LineItems.DirtyBar warnOnNav onSave={onSave} />
  <LineItems.SelectionBar<POLine>>
    {({ selectedIds, bulkRemove, clear }) => (
      <>
        <button onClick={bulkRemove}>Delete</button>
        <button onClick={clear}>Clear</button>
      </>
    )}
  </LineItems.SelectionBar>
</LineItems.FloatingDock>
```

| Part              | Behaviour                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FloatingDock`    | Fixed bottom-center container. `pointer-events: none` outer, `auto` inner so click-through works around the bars.                                                                      |
| `DirtyBar`        | Shows when `isDirty` is true. Discard defaults to `revert()`; Save calls `onSave`. `warnOnNav` intercepts in-app anchor clicks + `beforeunload` and jiggles the bar to draw attention. |
| `SelectionBar<T>` | Render-prop. Shows when `selectedIds.length > 0`. Library renders the count pill + divider; consumer plugs in domain actions.                                                          |

`lineItemsFloatingBarStyles` exports `{ primaryButton, secondaryButton, divider, label }` — use these so consumer-built buttons inside `SelectionBar` visually match the `DirtyBar` defaults.

## Modes

| Mode        | Behaviour                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"edit"`    | Default. All editable fields render their editors.                                                                                                   |
| `"display"` | Read-only. Cells render `field.render(line)`. No editors mount.                                                                                      |
| `"amend"`   | Editable rows that exist in the baseline are tinted; only fields with `editable: ["amend"]` are mutable. Use for post-confirmation correction flows. |

## Pinned columns

```tsx
f.field({ key: "sku", pinned: "left", width: 160, ... }),
f.field({ key: "productName", pinned: "left", width: 240, ... }),
```

- Pinned columns require an explicit `width`.
- Order in the schema is preserved; pinning only affects positioning.
- The `__select` checkbox column auto-pins left when present.
- The `__actions` column (from `rowActions`) auto-pins right.

## Multi-collection documents — `useLineItemsGroup`

Composes multiple `useLineItems` hooks under one document-level submit boundary. Used for Journal Entry (debits + credits) and Work Order (components + operations).

```tsx
const debits = useLineItems<JournalLine>({ fields, data: seedDebits });
const credits = useLineItems<JournalLine>({ fields, data: seedCredits });

const group = useLineItemsGroup({ debits, credits });

const onSave = () => {
  const cs = group.getChangeSet();
  if (cs.isEmpty) return;
  // cs = { isEmpty, debits: ChangeSet, credits: ChangeSet }
  // fan out to your mutations, then:
  group.reset();
};
```

`group.isDirty` = OR across members. `group.revert()` / `group.reset()` fan out to every member.

## Change-set shape

`getChangeSet()` returns the platform PRD-aligned shape:

```ts
type LineItemsChangeSet = {
  isEmpty: boolean;
  lineChanges: Array<
    | { action: "add"; tempId: string; data: Partial<T> }
    | { action: "update"; lineId: string; patch: Partial<T> }
    | { action: "remove"; lineId: string }
    | { action: "reorder"; lineId: string; position: number }
  >;
};
```

The consumer translates this into their own mutation shape — the component does not assume GraphQL, REST, or any specific server contract.

## Skeleton loader

Two scenarios:

**Initial fetch** — opt-in via the `loading` prop:

```tsx
<LineItems.Table loading={query.isLoading} skeletonRowCount={14} />
```

When `loading` is true, the tbody renders shimmering placeholder rows. Header, search, fullscreen toggle, and the floating dock keep rendering normally so the layout doesn't flash.

**Fast-scroll** (automatic) — during a scroll-flick (>600 px/sec), cells visually swap to a pulse bar via a CSS attribute on the scroll container. Once scroll settles (~120ms idle), real cells reappear. The React tree doesn't change between transitions, so input focus survives a flick that returns to the editing cell.

## Spreadsheet behaviours

- **Range selection** — click + drag, shift-click to extend, Ctrl/Cmd-A to select all visible.
- **Fill-drag** — drag the small handle on the focused cell down/up to fill the column.
- **TSV copy/paste** — copy selected cells with `Cmd/Ctrl+C`, paste tab-separated values with `Cmd/Ctrl+V`. A 1-cell paste broadcasts to every cell in the active selection (Excel parity).
- **Keyboard nav** — arrow keys, Enter (commit + move down), Tab (commit + move right with row-wrap), Esc (revert local edit).

## Tips

- Cells **commit on blur**, not on every keystroke. Don't expect `getChangeSet()` to reflect a partially-typed value mid-edit.
- For a derived column (like `total = qty × unitPrice`), compute it inside the field's `render` rather than syncing it back into the row data via a `useEffect`. The latter regresses typing performance with large datasets.
- For "Discard" buttons, call `revert()`. `reset()` is for after a successful save.
- Pinned columns and `flex` columns are mutually exclusive concepts but can coexist in one schema — pin the leftmost identity columns, let one wide column flex, leave the rest at fixed widths.
- The `kind: "custom"` editor is the right tool for async pickers (server-backed combobox), composite editors (qty + uom), and inline sub-tables. Pair with `normalize` and `equals` so dirty-tracking stays honest.

## Related

- `BulkItemPicker` — generic tree-select dialog often paired with `addLines` for bulk-add flows.
- `Combobox` — used inside the default `select`-kind cell editor.
- `Card` — the recommended frame for hosting a `LineItems` table on a detail page.
