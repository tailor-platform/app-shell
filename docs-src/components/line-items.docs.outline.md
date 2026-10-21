---
kind: code-backed
group: line-items
title: LineItems
description: Spreadsheet-grade editable table for the lines of a document, with a change-set for submitting only what changed
sources:
  - packages/core/src/components/line-items/**
---

# LineItems

`LineItems` edits the rows of a document — purchase orders, invoices, journals, work orders, stock transfers — with spreadsheet ergonomics: inline cell editors, range selection, TSV copy/paste, keyboard navigation, drag reordering, and row virtualization for long documents.

State lives in the `useLineItems` hook; `LineItems.*` renders it. The component is UI-only — it takes no opinion on transport. `getChangeSet()` returns a transport-agnostic description of what changed, which you map onto your own mutations.

## Import

```tsx
import { LineItems, useLineItems, createLineItemHelper } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
type POLine = {
  lineKey: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

const f = createLineItemHelper<POLine>();

const fields = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    width: 160,
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity ?? 0,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 90,
  }),
  f.field({
    key: "total",
    label: "Total",
    render: (l) => `$${((l.quantity ?? 0) * (l.unitPrice ?? 0)).toFixed(2)}`,
    width: 120,
  }),
];

function PurchaseOrderLines({ lines }: { lines: POLine[] }) {
  const lineItems = useLineItems<POLine>({ fields, defaultLines: lines, rowSelection: {} });

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.Search />
      <LineItems.Table />
      <LineItems.SaveActions onSave={(changeSet) => submit(changeSet)} />
    </LineItems.Root>
  );
}
```

Every row needs a stable `lineKey` — the server id for a persisted line. Rows that arrive without one are assigned a generated id.

## Parts

| Part                     | Description                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LineItems.Root`         | Provides the document to the parts beneath it. Holds no row data of its own.                                                                                                                                                                                                                                                                                                                                              |
| `LineItems.Table`        | The editable grid: virtualized rows, pinned columns, cell editors, drag reorder.                                                                                                                                                                                                                                                                                                                                          |
| `LineItems.Search`       | Search box bound to the filter. Only fields with a `search` function participate.                                                                                                                                                                                                                                                                                                                                         |
| `LineItems.AddRow`       | Appends a line. Renders nothing in view mode.                                                                                                                                                                                                                                                                                                                                                                             |
| `LineItems.SaveActions`  | Save and discard buttons, both disabled while the document is clean. **The default save surface** — place it in the card, next to the table.                                                                                                                                                                                                                                                                              |
| `LineItems.FloatingDock` | Sticky container for `DirtyBar`.                                                                                                                                                                                                                                                                                                                                                                                          |
| `LineItems.DirtyBar`     | Floating alternative to `SaveActions` for very long pages where the card's buttons scroll out of view. Appears only while there are uncommitted changes; `warnOnNav` keeps the user on the page while dirty — any in-app navigation to another route (links, `navigate()`, back/forward) is held via React Router's `useBlocker`, so it needs AppShell's router; closing or reloading the tab shows the browser's prompt. |

## useLineItems(options)

| Option             | Type                                          | Default  | Description                                                                                                                                                       |
| ------------------ | --------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`           | `LineItemsField<T>[]`                         | required | Column schema. Build with `createLineItemHelper<T>().field({…})`.                                                                                                 |
| `defaultLines`     | `readonly T[]`                                | `[]`     | Uncontrolled seed rows, also the dirty-tracking baseline. Read once on mount; to load a different document, remount (e.g. with a `key`).                          |
| `lines`            | `readonly T[]`                                | –        | Controlled rows. Requires `onLinesChange`; can't be combined with `defaultLines`.                                                                                 |
| `onLinesChange`    | `(next: T[]) => void`                         | –        | Called once per mutation with the new rows. Required with `lines`; optional with `defaultLines`, to observe edits.                                                |
| `mode`             | `"view" \| "edit" \| "amend"`                 | `"edit"` | `"view"` renders every cell read-only. `"amend"` keeps only fields whose `editable` lists it open — for a confirmed document where a few fields may still change. |
| `ordering`         | `"sort" \| "manual"`                          | `"sort"` | `"manual"` enables drag reordering and emits `reorder` ops.                                                                                                       |
| `rowSelection`     | `RowSelectionOptions`                         | —        | Adds the row-selection checkbox column; with `actions`, the bulk-action bar. Same option as DataTable — see [Selection actions](#selection-actions).              |
| `onMetadataCommit` | `(event: LineItemsMetadataCommit<T>) => void` | –        | Receives edits to `commit: "metadata"` fields, which bypass the change-set.                                                                                       |

### Return value

| Member                                          | Description                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `lines` / `allLines`                            | Rows with the search filter applied, and the full document order.              |
| `isDirty`                                       | Whether current state diverges from the baseline.                              |
| `selectedIds` / `selectedRows`                  | The selected lines, as `lineKey`s and as rows, in document order.              |
| `sortState`                                     | Active sort, or `null` in document order. Always `null` under manual ordering. |
| `toggleSort(columnId)`                          | Cycles a column ascending, descending, then unsorted.                          |
| `addLine(data, opts?)`                          | Inserts one line, returning its new `lineKey`.                                 |
| `addLines(items, opts?)`                        | Inserts many in one render. Use this for bulk pickers.                         |
| `removeLine(lineKey)` / `removeLines(lineKeys)` | Deletes one line, or several in one update — for a bulk action's rows.         |
| `updateField(lineKey, key, value)`              | Typed single-cell update.                                                      |
| `updateLines(patches)`                          | Batched updates — one render for a whole paste or fill.                        |
| `reorderLine(lineKey, afterLineKey)`            | Moves a line. Manual ordering only; pass `null` to move to the head.           |
| `bulkUpdate(patch)` / `bulkRemove()`            | Apply to every selected row.                                                   |
| `reset()`                                       | Snaps the baseline forward. Call after a successful save.                      |
| `revert()`                                      | Discards every uncommitted change back to the baseline.                        |
| `getChangeSet()`                                | What changed, ready to submit.                                                 |

`addLine` and `addLines` take `{ afterLineKey }`: omit it to append, pass `null` to prepend, or pass a `lineKey` to insert directly after that line.

## Selection actions

Pass `rowSelection` to `useLineItems` to add the checkbox column. It is the same option as DataTable's [`rowSelection`](./data-table.md#selection-actions): `{}` for uncontrolled selection, `{ defaultSelectedIds }` to seed it, or `{ selectedIds, onChange }` to control it. Selected ids are `lineKey`s.

With `actions`, `LineItems.Table` shows a bulk-action bar at its foot while at least one line is selected: the selection count, your actions, and **Clear**. Actions use DataTable's [`SelectionAction`](./data-table.md#selectionaction) shape, so selection reads the same across both.

```tsx
const lineItems = useLineItems<POLine>({
  fields,
  defaultLines: lines,
  rowSelection: {
    actions: [
      {
        id: "receive",
        label: "Mark received",
        onClick: (ids) => {
          const picked = new Set(ids);
          lineItems.updateLines(
            lineItems.allLines
              .filter((l) => picked.has(l.lineKey) && l.receivedQty < l.quantity)
              .map((l) => ({ lineKey: l.lineKey, patch: { receivedQty: l.quantity } })),
          );
        },
      },
      {
        id: "remove",
        label: "Remove",
        variant: "destructive",
        onClick: (ids) => {
          lineItems.removeLines(ids);
        },
      },
    ],
  },
});
```

- **Actions get ids, not rows.** `onClick` receives a copy of the selected `lineKey`s; look lines up from `allLines` and decide eligibility in the handler, as with DataTable.
- **Give handlers a block body** when they call the hook's own return value, as above. An expression body makes TypeScript infer `lineItems` from itself and fail with "implicitly has type any".
- **Edits stay local.** Actions that change lines with `updateLines`, `addLines` or `removeLines` land in the change-set like any other edit, so Save and Discard cover them. Return a promise to disable the bar and show a spinner while it runs, or pass a later request (from a confirm dialog) to `helpers.run`. Selection never clears on its own — call `helpers.clearSelection()` when the action should end it.
- Up to three actions show inline; the rest collapse into a **More actions** menu. The bar is a `role="toolbar"` named "Bulk actions", its count is announced politely, and when it closes with focus inside, focus returns to the header checkbox.

## Field schema

| Property    | Type                                           | Description                                                                     |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `key`       | `string`                                       | Column id, and the property name on `T` for editable fields.                    |
| `label`     | `ReactNode`                                    | Header content.                                                                 |
| `render`    | `(line: T) => ReactNode`                       | Cell content when no editor is shown.                                           |
| `editable`  | `LineItemsMode[]`                              | Modes that show an editor. Omit for a read-only or computed column.             |
| `type`      | `LineItemsFieldType`                           | Required when editable. Drives the editor and equality semantics.               |
| `sort`      | `{ comparator }`                               | Makes the header sortable (asc, desc, unsorted). Ignored under manual ordering. |
| `search`    | `(line: T, query: string) => boolean`          | Opts the column into `LineItems.Search`.                                        |
| `align`     | `"left" \| "center" \| "right"`                | Defaults to right for numbers, center for booleans.                             |
| `className` | `string \| ((line: T) => string \| undefined)` | Per-cell classes — useful for flagging discrepancies.                           |
| `normalize` | `(value, row) => unknown`                      | Coerce before comparison and before entering the change-set.                    |
| `equals`    | `(a, b, row) => boolean`                       | Custom dirty-equality.                                                          |
| `width`     | `number`                                       | Resting width in pixels.                                                        |
| `pin`       | `"left" \| "right"`                            | Freezes the column during horizontal scroll.                                    |
| `flex`      | `boolean`                                      | Absorbs leftover horizontal space.                                              |

### Field types

```tsx
{ kind: "text" }
{ kind: "number", decimals?: number }
{ kind: "select", options: { value, label, description? }[], placeholder?: string }
{ kind: "boolean" }
{ kind: "date", min?: string, max?: string }
{ kind: "custom", renderEditor: (ctx) => ReactNode, normalize?, equals? }
```

A `custom` editor receives `ariaLabel` (the column and line, e.g. "Qty, line 2") in its context — put it on your input so screen readers can name the cell, as the built-in editors do.

Numeric fields normalize strings to numbers, round by `decimals`, and compare with a small epsilon, so `"1"` and `"1.00"` are not a change. Strings are trimmed. A field's own `normalize` and `equals` win over both.

## LineItems.Table Props

| Prop                                    | Type                    | Default              | Description                                                                        |
| --------------------------------------- | ----------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `rowHeight`                             | `number`                | `36`                 | Uniform row height, which the virtualizer's math depends on.                       |
| `maxBodyHeight`                         | `number \| string`      | `"min(70vh, 600px)"` | Height the grid scrolls within. Ignored in fullscreen, where it fills the overlay. |
| `virtualized`                           | `boolean`               | `true`               | Set `false` to mount every row.                                                    |
| `renderRowActions`                      | `(row: T) => ReactNode` | –                    | Trailing pinned column of per-row controls.                                        |
| `rowActionsWidth`                       | `number`                | `56`                 | Width of the trailing row-actions column.                                          |
| `emptyMessage`                          | `ReactNode`             | `"No lines yet."`    | Shown when the document has no lines.                                              |
| `loading`                               | `boolean`               | `false`              | Swaps the body for skeleton rows while an initial fetch is in flight.              |
| `skeletonRowCount`                      | `number`                | `12`                 | How many skeleton rows `loading` shows.                                            |
| `className` / `tableContainerClassName` | `string`                | –                    | Merged onto the bordered wrapper / the scroll container.                           |

`LineItems.Table` cannot infer `T` from `Root`, so annotate the callback parameters (`renderRowActions={(row: POLine) => …}`) or pass the type argument explicitly (`<LineItems.Table<POLine> … />`).

## Change-set

`getChangeSet()` returns `{ isEmpty, lineChanges }`, where each change is one of:

```tsx
{ action: "add", tempId: string, data: Record<string, unknown> }
{ action: "update", lineId: string, patch: Record<string, unknown> }
{ action: "remove", lineId: string }
{ action: "reorder", lineId: string, position: number }
```

`tempId` is client-only — the server mints the real id on insert. `patch` carries only the fields that actually changed. `reorder` is emitted for manual ordering only, and only for persisted lines whose index moved, so adding or removing a line does not read as a move of everything below it. Read-only and computed columns never appear.

```tsx
<LineItems.SaveActions
  onSave={async (changeSet) => {
    if (changeSet.isEmpty) return;
    await submitLines(changeSet.lineChanges);
    lineItems.reset(); // baseline moves forward; the document is clean again
  }}
/>
```

## Multiple collections: useLineItemsGroup

Some documents own more than one list of lines — a Journal Entry with debits and credits, a Work Order with components and operations. Give each list its own `useLineItems` and `LineItems.Root`, then put them under one save boundary with `useLineItemsGroup`. Members can have different row types.

```tsx
import { useLineItems, useLineItemsGroup } from "@tailor-platform/app-shell";

const debits = useLineItems<JournalLine>({ fields, defaultLines: entry.debits });
const credits = useLineItems<JournalLine>({ fields, defaultLines: entry.credits });
const group = useLineItemsGroup({ debits, credits });

const onSave = async () => {
  const { isEmpty, changeSets } = group.getChangeSet();
  if (isEmpty) return;
  await saveJournalEntry(entry.id, changeSets.debits.lineChanges, changeSets.credits.lineChanges);
  group.reset();
};
```

| Return         | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| `members`      | The hooks passed in, for forwarding into each `LineItems.Root`                      |
| `isDirty`      | True when any member has uncommitted changes                                        |
| `getChangeSet` | Returns `{ isEmpty, changeSets }`; `changeSets` is keyed by the names you passed in |
| `reset`        | Snaps every member's baseline forward — call after a successful save                |
| `revert`       | Discards every member's changes — call on Discard                                   |

Each member keeps its own selection, search and dirty tracking. The group only adds the shared `isDirty` and the single Save / Discard.

## Spreadsheet behavior

Only editable columns take part in the grid's selection.

| Interaction                    | Result                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Click a cell                   | Selects it and opens its editor with the value selected                                                                |
| Shift-click, or click and drag | Selects the rectangle between the anchor and that cell                                                                 |
| Arrow keys                     | Moves the active cell; hold Shift to extend the selection                                                              |
| Enter / Tab                    | Commits and moves down / right across editable cells (Shift reverses). Tab past the last editable cell leaves the grid |
| Cmd/Ctrl+D                     | Fills down: copies the top selected cell of each column into the selected cells below                                  |
| Escape                         | Abandons the edit, keeping the previous value                                                                          |
| Copy                           | Writes the selected rectangle as TSV                                                                                   |
| Paste                          | Writes a TSV block from the active cell; a single value broadcasts across the selection                                |

Edits commit on blur or Enter, never per keystroke.

## Sorting

Under the default `ordering: "sort"`, a field with a `sort.comparator` gets a clickable header that cycles ascending, descending, then back to document order, and carries `aria-sort` throughout. Sorting only reorders what you see: `allLines` stays in document order, sorting never marks the document dirty, and it emits no `reorder` ops. Under `ordering: "manual"` the document owns row order outright, so sort affordances are not rendered.

## Drag reordering

Set `ordering: "manual"` to get a grip handle on each row. Reordering uses native HTML5 drag-and-drop, which works with virtualized rows. Because native drag has no keyboard equivalent, the grip also responds to the keyboard: Enter or Space lifts the row, Arrow Up/Down moves it, and Enter or Escape drops it. Touch drag is not supported.

## Related

- [DataTable](./data-table.md) — read-oriented collection table with sorting, filtering, and pagination
- [TreePicker](./tree-picker.md) — tree-select dialog that pairs with `addLines`
