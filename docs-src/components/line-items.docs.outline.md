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
  id?: string; // the server's id; unset on lines added since the last save
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

## Lines and ids

LineItems reads each line's id from `id`, the same convention as DataTable, or from the field you name with `idKey`. A line with an id is saved; a line without one is new and goes out as an `add`.

- **New lines never get a made-up id.** `addLine` leaves the id unset (and drops one passed in, e.g. from a duplicated line). LineItems tracks the line by a temporary key, kept on a hidden symbol, so it never reaches your id field or JSON.
- **Methods take a line key**: the id as a string for a saved line, the temporary key for a new one. Get it with `getLineKey(line)`; `renderRowActions` and selection actions are handed keys directly.
- **After a save, re-key.** Pass what the server returned to `reset`, so new lines pick up their ids — see [Saving](#saving).
- `isNewLine(line)` is `true` until then, for disabling controls that need an id, such as an "Open" link.

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

| Option             | Type                                          | Default  | Description                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`           | `LineItemsField<T>[]`                         | required | Column schema. Build with `createLineItemHelper<T>().field({…})`.                                                                                                                                                            |
| `idKey`            | `keyof T`                                     | `"id"`   | The field holding a saved line's id.                                                                                                                                                                                         |
| `defaultLines`     | `readonly T[]`                                | `[]`     | Uncontrolled seed rows, also the dirty-tracking baseline. Read once on mount; to load a different document, remount (e.g. with a `key`).                                                                                     |
| `lines`            | `readonly T[]`                                | –        | Controlled rows. Requires `onLinesChange`; can't be combined with `defaultLines`.                                                                                                                                            |
| `onLinesChange`    | `(next: T[]) => void`                         | –        | Called once per mutation with the new rows. Required with `lines`; optional with `defaultLines`, to observe edits.                                                                                                           |
| `mode`             | `"view" \| "edit" \| "amend"`                 | `"edit"` | `"view"` renders every cell read-only. `"amend"` is a partial lock for a confirmed document: every column stays visible, but only fields whose `editable` lists `"amend"` keep an editor; the rest render read-only, tinted. |
| `ordering`         | `"sort" \| "manual"`                          | `"sort"` | `"manual"` enables drag reordering and emits `reorder` ops.                                                                                                                                                                  |
| `rowSelection`     | `LineItemsRowSelectionOptions`                | –        | Adds the row-selection checkbox column; with `actions`, the bulk-action bar. Same option as DataTable — see [Selection actions](#selection-actions).                                                                         |
| `onMetadataCommit` | `(event: LineItemsMetadataCommit<T>) => void` | –        | Receives edits to `commit: "metadata"` fields on saved lines, which bypass the change-set. See [Metadata fields](#metadata-fields).                                                                                          |

### Return value

| Member                                          | Description                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `lines` / `allLines`                            | Rows with the search filter applied, and the full document order.                          |
| `isDirty`                                       | Whether current state diverges from the baseline.                                          |
| `errors` / `getCellError(lineKey, fieldKey)`    | Validation messages for new and changed lines — see [Validation](#validation).             |
| `hasUnsavedChanges()`                           | `isDirty`, read live: already `false` right after `reset` or `revert`, before a re-render. |
| `getLineKey(line)` / `isNewLine(line)`          | The key the methods below take, and whether the line is unsaved (no id).                   |
| `selectedIds` / `selectedRows`                  | The selected lines, as line keys and as rows, in document order.                           |
| `sortState`                                     | Active sort, or `null` in document order. Always `null` under manual ordering.             |
| `toggleSort(columnId)`                          | Cycles a column ascending, descending, then unsorted.                                      |
| `addLine(data, opts?)`                          | Inserts one new line (no id), returning its key.                                           |
| `addLines(items, opts?)`                        | Inserts many in one render. Use this for bulk pickers.                                     |
| `removeLine(lineKey)` / `removeLines(lineKeys)` | Deletes one line, or several in one update — for a bulk action's rows.                     |
| `updateField(lineKey, key, value)`              | Typed single-cell update.                                                                  |
| `updateLines(patches)`                          | Batched updates — one render for a whole paste or fill.                                    |
| `reorderLine(lineKey, afterLineKey)`            | Moves a line. Manual ordering only; pass `null` to move to the head.                       |
| `bulkUpdate(patch)` / `bulkRemove()`            | Apply to every selected row.                                                               |
| `reset(saved?)`                                 | Snaps the baseline forward after a save; pass the saved lines or `{ idMap }`.              |
| `revert()`                                      | Discards every uncommitted change back to the baseline.                                    |
| `getChangeSet()`                                | What changed, ready to submit.                                                             |

`addLine` and `addLines` take `{ afterLineKey }`: omit it to append, pass `null` to prepend, or pass a `lineKey` to insert directly after that line.

## Selection actions

Pass `rowSelection` to `useLineItems` to add the checkbox column. It is the same option as DataTable's [`rowSelection`](./data-table.md#selection-actions): `{}` for uncontrolled selection, `{ defaultSelectedIds }` to seed it, or `{ selectedIds, onChange }` to control it. Selected ids are line keys.

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
              .filter((l) => picked.has(lineItems.getLineKey(l)) && l.receivedQty < l.quantity)
              .map((l) => ({
                lineKey: lineItems.getLineKey(l),
                patch: { receivedQty: l.quantity },
              })),
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

- **Actions get keys, not rows.** `onClick` receives a copy of the selected line keys; look lines up from `allLines` with `getLineKey` and decide eligibility in the handler, as with DataTable.
- **Actions show in edit mode only by default.** Amend is for a confirmed document, where bulk changes should be deliberate: add `modes: ["edit", "amend"]` to an action that belongs there too.
- **Give handlers a block body** when they call the hook's own return value, as above. An expression body makes TypeScript infer `lineItems` from itself and fail with "implicitly has type any".
- **Edits stay local.** Actions that change lines with `updateLines`, `addLines` or `removeLines` land in the change-set like any other edit, so Save and Discard cover them. Return a promise to disable the bar and show a spinner while it runs, or pass a later request (from a confirm dialog) to `helpers.run`. Selection never clears on its own — call `helpers.clearSelection()` when the action should end it.
- Up to three actions show inline; the rest collapse into a **More actions** menu. The bar is a `role="toolbar"` named "Bulk actions", its count is announced politely, and when it closes with focus inside, focus returns to the header checkbox.

## Field schema

| Property    | Type                                           | Description                                                                                   |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `key`       | `string`                                       | Column id, and the property name on `T` for editable fields.                                  |
| `label`     | `ReactNode`                                    | Header content.                                                                               |
| `render`    | `(line: T) => ReactNode`                       | Cell content when no editor is shown.                                                         |
| `editable`  | `LineItemsMode[]`                              | Modes that show an editor. Omit for a read-only or computed column.                           |
| `type`      | `LineItemsFieldType`                           | Required when editable — the types enforce it. Drives the editor, paste parsing and equality. |
| `commit`    | `"document" \| "metadata"`                     | Where edits go — see [Metadata fields](#metadata-fields). Defaults to `"document"`.           |
| `sort`      | `{ comparator }`                               | Makes the header sortable (asc, desc, unsorted). Ignored under manual ordering.               |
| `search`    | `(line: T, query: string) => boolean`          | Opts the column into `LineItems.Search`.                                                      |
| `align`     | `"left" \| "center" \| "right"`                | Defaults to right for numbers, center for booleans.                                           |
| `className` | `string \| ((line: T) => string \| undefined)` | Per-cell classes — useful for flagging discrepancies.                                         |
| `normalize` | `(value, row) => unknown`                      | Coerce before comparison and before entering the change-set.                                  |
| `equals`    | `(a, b, row) => boolean`                       | Custom dirty-equality.                                                                        |
| `validate`  | `(value, line) => string \| null \| undefined` | Returns a message for an invalid value — see [Validation](#validation).                       |
| `width`     | `number`                                       | Resting width in pixels.                                                                      |
| `pin`       | `"left" \| "right"`                            | Freezes the column during horizontal scroll.                                                  |
| `flex`      | `boolean`                                      | Absorbs leftover horizontal space.                                                            |

### Field types

```tsx
{ kind: "text" }
{ kind: "number", decimals?: number }
{ kind: "select", options: { value, label, description? }[], placeholder?: string }
{ kind: "select", fetcher, getOptionLabel: (value, line) => string, placeholder?: string }
{ kind: "boolean" }
{ kind: "date", min?: string, max?: string }
{ kind: "custom", renderEditor: (ctx) => ReactNode, normalize?, equals? }
```

A `custom` editor receives `ariaLabel` (the column and line, e.g. "Qty, line 2") in its context — put it on your input so screen readers can name the cell, as the built-in editors do.

Numeric fields normalize strings to numbers, round by `decimals`, and compare with a small epsilon, so `"1"` and `"1.00"` are not a change. Strings are trimmed. A field's own `normalize` and `equals` win over both.

Typed and pasted text is read the way spreadsheets write it: numbers accept thousands separators, a decimal comma and full-width digits (number cells are text inputs with a decimal keypad, so `1,5` is never lost); booleans accept TRUE/FALSE, yes/no, 1/0 and check marks; a select matches an option's value or label. Text that can't be read keeps the cell's current value.

### Loading select options from the backend

A fixed `options` list suits short lists such as units of measure. For a product or SKU lookup over a real catalogue, pass a `fetcher` instead — the same type `Combobox.Async` takes. The cell queries as the user types, with loading and retry states. Because the stored value usually isn't in the loaded results, `getOptionLabel` supplies its label, typically from a name stored on the line:

```tsx
f.field({
  key: "productId",
  label: "Product",
  render: (l) => l.productName,
  editable: ["edit"],
  type: {
    kind: "select",
    fetcher: async (query, { signal }) => searchProducts(query ?? "", { signal }),
    getOptionLabel: (_value, line) => line.productName,
  },
});
```

Pasting into a fetcher-backed select takes the pasted text as the value, since its options aren't known up front.

## LineItems.Table Props

| Prop                                    | Type                                              | Default              | Description                                                                                                                  |
| --------------------------------------- | ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `rowHeight`                             | `number`                                          | `36`                 | Uniform row height, which the virtualizer's math depends on.                                                                 |
| `maxBodyHeight`                         | `number \| string`                                | `"min(70vh, 600px)"` | Height the grid scrolls within. Ignored in fullscreen, where it fills the overlay.                                           |
| `virtualized`                           | `boolean`                                         | `true`               | Set `false` to mount every row.                                                                                              |
| `renderRowActions`                      | `(row: T, line: { lineKey, isNew }) => ReactNode` | –                    | Trailing pinned column of per-row controls. `lineKey` is what `removeLine` takes; `isNew` is `true` until the line is saved. |
| `rowActionsWidth`                       | `number`                                          | `56`                 | Width of the trailing row-actions column.                                                                                    |
| `emptyMessage`                          | `ReactNode`                                       | `"No lines yet."`    | Shown when the document has no lines.                                                                                        |
| `loading`                               | `boolean`                                         | `false`              | Swaps the body for skeleton rows while an initial fetch is in flight.                                                        |
| `skeletonRowCount`                      | `number`                                          | `12`                 | How many skeleton rows `loading` shows.                                                                                      |
| `className` / `tableContainerClassName` | `string`                                          | –                    | Merged onto the bordered wrapper / the scroll container.                                                                     |

`LineItems.Table` cannot infer `T` from `Root`, so annotate the callback parameters (`renderRowActions={(row: POLine, { lineKey }) => …}`) or pass the type argument explicitly (`<LineItems.Table<POLine> … />`).

## Change-set

`getChangeSet()` returns `{ isEmpty, lineChanges }`, where each change is one of:

```tsx
{ action: "add", tempId: string, data: Record<string, unknown>, line: Record<string, unknown> }
{ action: "update", lineId: string, patch: Record<string, unknown> }
{ action: "remove", lineId: string }
{ action: "reorder", lineId: string, position: number }
```

`lineId` is the line's id as a string. On an `add`, `data` holds the editable fields and `line` the whole line, for read-only fields the server still needs to create it — a product id picked from a catalogue, say. `tempId` is client-only: don't send it as the line's id; use it to match the created ids back (see below). `patch` carries only the fields that actually changed. `reorder` is emitted for manual ordering only, and only for persisted lines whose index moved, so adding or removing a line does not read as a move of everything below it. Read-only and computed columns never appear.

### Saving

After a successful save, call `reset` so the baseline moves forward and new lines pick up the ids the server assigned. Otherwise a new line would keep its temporary key, and its next edit would go out as an `update` the server can't match.

```tsx
<LineItems.SaveActions
  onSave={async (changeSet) => {
    if (changeSet.isEmpty) return;
    const saved = await submitLines(changeSet.lineChanges);
    // Preferred: the lines as saved. Works for any backend, and picks up
    // values the server computed.
    lineItems.reset(saved.lines);
  }}
/>
```

If the backend only returns the ids it created, map each `add`'s `tempId` to its id instead: `lineItems.reset({ idMap: { [tempId]: serverId } })`. `reset()` with no argument is for saves that added no lines; with new lines pending it warns in the console.

`hasUnsavedChanges()` is clear as soon as `reset` runs, so `await save(); reset(saved); navigate("/orders")` passes `DirtyBar`'s `warnOnNav` guard in one go.

### Validation

Give a field a `validate(value, line)` that returns a message when the value isn't acceptable:

```tsx
f.field({
  key: "quantity",
  label: "Qty",
  render: (l) => l.quantity,
  editable: ["edit"],
  type: { kind: "number", decimals: 0 },
  validate: (value) => (Number(value) < 0 ? "Quantity can't be negative" : null),
});
```

An invalid cell gets a red outline and shows its message on hover or focus, the same as DataTable's inline editing, and the message is part of the cell's accessible description. `SaveActions` and `DirtyBar` keep Save disabled and say how many errors are left. The value is still stored, so a paste or fill that breaks a rule shows exactly where. Only new and changed lines are checked, so saved data nobody touched never blocks an unrelated edit. `errors` and `getCellError(lineKey, fieldKey)` expose the same state for your own controls.

### Metadata fields

A field with `commit: "metadata"` saves out-of-band — a memo that stays editable after the document is locked. Its edits stay out of the change-set and go to `onMetadataCommit` as `{ lineId, patch, previous, row }`. On a new line there's no id to save against yet, so its metadata fields travel in the line's `add` data instead. Discard leaves metadata fields alone, since they're already saved. LineItems warns when a metadata field has no `onMetadataCommit`.

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
  const saved = await saveJournalEntry(entry.id, changeSets.debits, changeSets.credits);
  group.reset({ debits: saved.debits, credits: saved.credits });
};
```

| Return              | Description                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `members`           | The hooks passed in, for forwarding into each `LineItems.Root`                                                           |
| `isDirty`           | True when any member has uncommitted changes                                                                             |
| `hasUnsavedChanges` | `isDirty`, read live                                                                                                     |
| `getChangeSet`      | Returns `{ isEmpty, changeSets }`; `changeSets` is keyed by the names you passed in                                      |
| `reset`             | Snaps every member's baseline forward after a save; takes each member's saved lines or `{ idMap }`, keyed by member name |
| `revert`            | Discards every member's changes — call on Discard                                                                        |

Each member keeps its own selection, search and dirty tracking. The group only adds the shared `isDirty` and the single Save / Discard.

## Spreadsheet behavior

Only editable columns take part in the grid's selection.

| Interaction                    | Result                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click a cell                   | Selects it and opens its editor with the value selected                                                                                           |
| Shift-click, or click and drag | Selects the rectangle between the anchor and that cell                                                                                            |
| Arrow keys                     | Moves the active cell; hold Shift to extend the selection                                                                                         |
| Enter / Tab                    | Commits and moves down / right across editable cells (Shift reverses). Tab past the last editable cell leaves the grid                            |
| Cmd/Ctrl+D                     | Fills down: copies the top selected cell of each column into the selected cells below, including text still being typed                           |
| Escape                         | Abandons the edit, keeping the previous value                                                                                                     |
| Copy                           | Writes the selected rectangle as TSV, quoting cells with line breaks, tabs or quotes as spreadsheets do                                           |
| Paste                          | Writes a TSV block from the active cell; a single value broadcasts across the selection. Quoted cells from Excel or Sheets keep their line breaks |

Edits commit on blur or Enter, never per keystroke.

## Sorting

Under the default `ordering: "sort"`, a field with a `sort.comparator` gets a clickable header that cycles ascending, descending, then back to document order, and carries `aria-sort` throughout. Sorting only reorders what you see: `allLines` stays in document order, sorting never marks the document dirty, and it emits no `reorder` ops. Under `ordering: "manual"` the document owns row order outright, so sort affordances are not rendered.

## Drag reordering

Set `ordering: "manual"` to get a grip handle on each row. Reordering uses native HTML5 drag-and-drop, which works with virtualized rows. Because native drag has no keyboard equivalent, the grip also responds to the keyboard: Enter or Space lifts the row, Arrow Up/Down moves it, and Enter or Escape drops it. Touch drag is not supported.

While the search filter hides lines, a line moves among the visible ones: dropped above the first visible line, it lands directly above it, not at the top of the document. Dropping a line back on itself changes nothing.

## Related

- [DataTable](./data-table.md) — read-oriented collection table with sorting, filtering, and pagination
- [TreePicker](./tree-picker.md) — tree-select dialog that pairs with `addLines`
