---
kind: code-backed
group: line-items
title: LineItems
description: Document-owned editable lines with typed columns, validation, explicit save snapshots, and manual ordering
sources:
  - packages/core/src/components/line-items/**
  - packages/core/src/components/internals/table-core/selection-bar.tsx
---

# LineItems

`LineItems.Root` provides its own bordered, rounded table frame, like DataTable; it does not need a wrapping Card. `LineItems.Footer` is the built-in document-action footer, separate from column totals inside Table.

`LineItems` edits the lines of one document. `useLineItems` owns the adopted rows, unconfirmed cell drafts, validation, and the saved baseline; `LineItems.Root` and `LineItems.Table` render that controller. The application owns transport, save status, and backend concurrency.

## Current scope

This API supports all declared editor kinds: text, number, boolean, date, fixed/async comboboxes, and custom editors, including structured object values. It also provides read-only and computed columns, add/update/remove commands, explicit save and Discard, manual document ordering with standard drag handles, column footers, and auto/px/flex widths with pinning. Every document row is rendered.

It does **not** yet provide controlled `lines`, independent metadata persistence, virtualization, clipboard/range/fill operations, fullscreen, or grouped collections. `useLineItems` rejects controlled `lines` / `onLinesChange` and `commit: "metadata"` rather than silently ignoring them.

The example application’s Line items preview (`examples/vite-app/src/pages/showcase/line-items-next/page.tsx`) demonstrates every editor across 18 data columns, including decimal USD prices, fixed numeric choices, a mock async supplier catalogue, and an immutable object editor. It starts with five products, shows the document's item count in the Product name footer, uses standard row drag handles and column sorting, and demonstrates example-owned readonly/edit/amend modes, checkbox selection, and bulk deletion. It consumes only the public package entrypoint. Standard display types remain independent of the chosen editor.

## Import

```tsx
import {
  LineItems,
  useLineItems,
  createLineItemHelper,
  type LineItemsColumn,
  type LineItemsChangeSet,
  type LineItemsValidationIssue,
  type LineItemsRootProps,
  type LineItemsTableProps,
  type LineItemsFooterProps,
  type UseLineItemsOptions,
  type UseLineItemsReturn,
} from "@tailor-platform/app-shell";
```

Use the package entrypoint. Consumer applications do not import `components/internals`, document engines, sizing hooks, or repository source paths.

## Basic usage

The editing model must permit the values its editor can emit. Text, number, date, and combobox editors can clear to `null`; make those properties nullable and reject disallowed cell outputs in `edit.onValueCommitted`. Reserve hook `validate` for whole-document rules. Boolean editors emit booleans. A custom editor’s value and `onCommit` output retain the exact property type.

```tsx
import {
  Button,
  CellEditError,
  LineItems,
  Toolbar,
  createLineItemHelper,
  useLineItems,
  type LineItemsChangeSet,
  type UseLineItemsReturn,
  type UseLineItemsOptions,
} from "@tailor-platform/app-shell";

type Line = {
  id?: string;
  sku: string;
  quantity: number | null;
  unitPrice: number;
};

const { column } = createLineItemHelper<Line>();
const amount = (line: Line) => (line.quantity ?? 0) * line.unitPrice;
const money = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });
const columns = [
  column({ accessorKey: "sku", label: "SKU", type: "text", pin: "left", footer: "Total" }),
  column({
    accessorKey: "quantity",
    label: "Quantity",
    type: "number",
    width: 112,
    edit: {
      editorType: "number",
      onValueCommitted: (_row, value) => {
        if (value === null || value <= 0) throw new CellEditError("Enter a positive quantity");
      },
    },
  }),
  column({
    accessorKey: "unitPrice",
    label: "Unit price",
    type: "money",
    typeOptions: { currency: "USD" },
    width: 144,
  }),
  column({
    id: "amount",
    accessor: amount,
    label: "Amount",
    type: "money",
    typeOptions: { currency: "USD" },
    width: 144,
    pin: "right",
    footer: ({ rows }) => money.format(rows.reduce((sum, line) => sum + amount(line), 0)),
  }),
];

const validateLines: NonNullable<UseLineItemsOptions<Line>["validate"]> = (rows) =>
  rows.length === 0 ? [{ scope: "document", message: "Add at least one line before saving." }] : [];

type SaveResult = { lines: Line[]; idMap: Record<string, string> };

function DocumentLines({
  lines,
  saveLines,
}: {
  lines: Line[];
  saveLines: (sent: LineItemsChangeSet<Line>) => Promise<SaveResult>;
}) {
  const editor: UseLineItemsReturn<Line> = useLineItems<Line>({
    columns,
    validate: validateLines,
    defaultLines: lines,
    tableId: "document-lines",
    rowActions: {
      width: 100,
      render: (_line, { lineKey }) => {
        return <Button onClick={() => editor.removeLine(lineKey)}>Remove</Button>;
      },
    },
  });

  const save = async () => {
    const sent = await editor.commitEdits();
    if (sent === null || sent.isEmpty) return;
    const saved = await saveLines(sent);
    editor.reset(saved.lines, { sent, idMap: saved.idMap });
  };

  return (
    <LineItems.Root value={editor}>
      <Toolbar.Root>
        <Toolbar.Row justify="between" aria-label="Line item tools">
          <Toolbar.Group>
            <LineItems.Search />
          </Toolbar.Group>
          <Toolbar.Group>
            <LineItems.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <LineItems.Table aria-label="Document lines" />
      <LineItems.Footer>
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => editor.addLine({ sku: "NEW", quantity: 1, unitPrice: 10 })}
          >
            Add line
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={!editor.hasUnsavedChanges()}
              onClick={() => editor.revert()}
            >
              Discard
            </Button>
            <Button type="button" size="xs" disabled={!editor.hasUnsavedChanges()} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </LineItems.Footer>
    </LineItems.Root>
  );
}
```

Provide save pending/failure feedback in the application and disable or serialize document submissions while a request is in flight. The example's `saveLines` receives the immutable transport-neutral snapshot and must map it to the backend's API; LineItems does not send requests or make several backend writes transactional.

## Ownership and initialization

`defaultLines` is read once. Changing that prop does not replace the current document or move its baseline. Mount the editor with a different React `key` to edit another document.

`idKey` defaults to `"id"` and requires a remount to change. `orderer` defaults to `"manual"` and can change without remounting or discarding edits. Changing the set of properties owned by columns also requires a remount. Rebuilding an equivalent columns array does not reset rows, repeat initialization normalization, or mark the document clean. Newly committed rule callbacks replace the rules used for validation and subsequent adoption without renormalizing existing rows merely because a render occurred.

Keep column definitions and rule callbacks stable during asynchronous preparation. A changed rule binding, edit permission, or `orderer` invalidates an in-progress preparation. Commit or discard changed/failed drafts before removing their column identities.

Treat input rows, returned rows, and nested values as immutable. Row and snapshot containers are shallow frozen; object-valued leaves retain their references so default `Object.is` equality remains meaningful. Replace an object value instead of mutating it in place.

### Hook options

| Option         | Default    | Description                                                                                                                                             |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`      | required   | Typed document/display columns.                                                                                                                         |
| `defaultLines` | `[]`       | Initial editing rows, read once. Saved rows carry their server ID.                                                                                      |
| `idKey`        | `"id"`     | Property holding the server ID; remount to change it.                                                                                                   |
| `orderer`      | `"manual"` | `"manual"` enables drag/keyboard/command reordering; `"readonly"` disables manual movement, not column sorting or cell editing. Can change dynamically. |
| `rowActions`   | —          | `{ render(row, { lineKey, isNew, index }), width? }`; configures the trailing pinned action column. Width defaults to 128px.                            |
| `rowSelection` | —          | DataTable-compatible `{ actions?, selectedIds, onChange }` or `{ actions?, defaultSelectedIds?, onChange? }`; omitted disables selection.               |

`tableId` optionally persists column order/pin preferences in browser storage. It does not change row ownership or document save behavior.

### Consumer-owned editing modes

LineItems does not define business modes. Omitting `edit` makes a column read-only; providing `edit` makes it editable unless `edit.canEdit(row, { selected })` returns false. This has the same row/selection contract as DataTable. Selection is false when row selection is disabled. A custom editor reads application modes from its consumer closure rather than an editor-context `mode`.

The showcase owns three modes. Edit permits all configured editors, Add/Delete, and manual movement. It is the only mode that provides `rowSelection`; readonly and amend omit selection controls entirely. Readonly uses `orderer: "readonly"` and false cell predicates. Amend also uses `orderer: "readonly"`, but enables only Promised date, Received qty, and Notes. Readonly omits the footer's document buttons entirely. A pending save receipt remains in consumer state and can be acknowledged after returning to an editable mode. The application owns the visibility/eligibility of Add/Delete/Save and other actions.

`orderer: "readonly"` does not discard pending manual order or prevent direct add/update/remove commands. Likewise, `canEdit` only controls the cell UI, not direct commands or server authorization. When a cell becomes non-editable, its existing draft is confirmed using the latest rules; malformed or rejected drafts remain recoverable and continue blocking preparation.

## Column sorting and manual row reordering

Set `column.sort.comparator(left, right)` to enable local single-column sorting. Default headers cycle ascending → descending → reset; custom headers receive `sortable`, `sortDirection`, and `activateSort`. The header menu offers the same ascending/descending/reset actions. Equal comparisons retain the existing order. There is no hook-level comparator or comparator precedence/combination.

Column sorting is available with either `orderer` and does not by itself dirty the document or change its save snapshot. `lines` and `allLines` expose the current sorted order, with search still filtering only `lines`. The first manual move starts from that complete sorted order, including hidden lines, adopts the resulting order into the document, and clears column sorting. Subsequent edits do not automatically sort it again; choosing a column sort explicitly arranges the rows again. Resetting column sorting shows the current adopted document order.

`LineItems.Table` adds a fixed-left drag-handle column by default (`orderer: "manual"`). No custom `rowActions`, movement buttons, or drag callbacks are required. `orderer: "readonly"` hides handles and rejects `reorderLine`; changing back to manual keeps edits and the current sorted order. A single row has a disabled handle.

Drag a handle and drop in the upper or lower half of another row to insert before or after it. Only the handle is draggable, so text selection and cell editing are not turned into row drags. Focus a handle and use ArrowUp/ArrowDown to move past the previous/next visible row; focus follows the moved handle and the new document position is announced. Native dragging is desktop-only; touch dragging is not provided in this slice.

Search remains a presentation projection: a visible drop target is resolved against the full document, not a filtered numeric index. Hidden rows retain their relative order. Logical drafts stay attached to their line, and a save acknowledgment assigning a server ID does not invalidate that line's drag identity. Reordering changes document dirty state and the final `order` snapshot, so Save and Discard work exactly as for command-based reordering. `reorderLine(key, afterKey)` remains available for application-owned actions.

## Row selection and bulk actions

Configure `rowSelection` on `useLineItems`, not Root, Table, or Footer. It uses the same `RowSelectionOptions` and selection mechanics as DataTable. Omit it to disable selection, pass `{}` for uncontrolled selection, or provide `selectedIds` and `onChange` for controlled selection. `defaultSelectedIds` initializes uncontrolled selection once. The hook exposes `selectedIds`, `isRowSelected`, `toggleRowSelection`, `selectAllRows`, `deselectAllRows`, `clearSelection`, `isAllSelected`, and `isIndeterminate`; selecting rows does not make the document dirty.

IDs are public `getLineKey(row)` references: server IDs or temporary creation keys. Commands and callbacks preserve DataTable's ownership rules, including composable uncontrolled commands and controlled commands deriving from the latest committed owner. Unknown/deleted document IDs are dropped. Document removal and replacement reconcile selection; `reset(..., { sent, idMap })` maps selected creations to their acknowledged IDs without guessing from row positions. Controlled owners receive reconciled keys through `onChange` and must commit them.

Configure `rowSelection.actions` as an array of `{ id, label, icon?, variant?, onClick(ids, helpers) }`, exactly as DataTable. Actions receive a click-time copy of selected public IDs. The first three appear inline and the rest in More actions. Returning a promise, or handing a later request to `helpers.run`, disables actions and Clear while pending; `pendingActionId` survives footer unmounts. Neither success nor failure clears selection automatically. Consumers own confirmation and requests; deleting document rows prunes their selection, and `helpers.clearSelection()` can explicitly clear any survivors.

The selection checkbox is **always the first, fixed-left utility column**, before the drag handle and every data column. It is not a document column, is not searched, and is excluded from Columns order/pin preferences. This position cannot be changed by a stored preference or a user pin action.

The showcase's top Toolbar places Search on the left and Columns on the right. Footer composition uses plain divs, not Toolbar. Place consumer-owned Button elements inside `LineItems.Footer`, using a full-width flex div and a trailing `ml-auto` group for Add on the left and Discard/Save on the right. Footer reads bulk actions and selection from context and renders either the `N of M selected` action bar **or** its children, never both. This also hides pending save acknowledgment controls while bulk actions are shown, without discarding the consumer's pending receipt. Tint, stickiness, announcements, overflow, and pending-action tracking are shared with DataTable. Clear returns focus to the selection header, or an enabled footer control if the header is disabled.

Start save is disabled when `hasUnsavedChanges()` is false, including before any confirmed edits or unfinished drafts exist. Applying an outstanding save receipt remains enabled even after Discard clears local edits, once the document buttons are visible again (editable mode, no bulk action bar). The showcase does not show Unsaved changes or Awaiting save response badges; the save label and application-owned status message communicate the mocked save lifecycle.

The header checkbox selects or deselects only visible rows. **Delete selected** includes selected rows hidden by search, and its count reflects the full document's current selection. Deletions remain local document changes until Save and can be undone with Discard; deleting an unsaved creation cancels its addition. The example explicitly clears selection on Discard and save acknowledgment. The hook itself retains valid selections through edits and ordering changes and reconciles IDs on acknowledgment.

## Columns

`createLineItemHelper<T>().column()` binds the row type while retaining each concrete definition. A property column's `normalize`, `equals`, and editor output are connected to that property's type rather than a union of every row value.

| Source        | Identity                                     | Built-in document editing                             |
| ------------- | -------------------------------------------- | ----------------------------------------------------- |
| `accessorKey` | Optional `id`; defaults to the property name | Supported for a real top-level property.              |
| `accessor`    | Explicit `id` required                       | Read-only computed display; no inferred write target. |
| Neither       | Explicit `id` required                       | Value-less display or footer-only column.             |

`accessor` and `accessorKey` are mutually exclusive. Column IDs must be non-empty and unique. Repeated read-only views of one property are allowed, but that property may have only one explicit edit/rule owner; rules from several columns are not composed. A property-backed column can own document rules without exposing an editor. Mutation commands reject properties with no document owner rather than adopting unsaveable changes.

### Display, editing, and rules

- `type` / `typeOptions` describe display. Standard renderers cover text, number, money, date, badge, and link values. `render(row)` overrides the display without changing the source property or write target.
- `edit.editorType` selects the input. `edit.canEdit(row, { selected })` defaults to true; omit `edit` for a permanently read-only column. Business readonly/edit/amend policies belong to the consumer, not a library mode.
- `normalize` and `equals` belong directly on the property-owning column, not under `edit`. Business validation belongs in `edit.onValueCommitted` or the hook's `validate`, not a column-level `validate`. Display precision does not round stored values or change equality.
- `normalize(value, row)` runs at adoption boundaries: initialization, additions, updates/editor confirmation, and accepted save results. It does not run during display or diff. Initial normalized saved data is also the baseline, so normalization alone does not make it dirty. A batch normalizer sees the same merged pre-normalization row context, not another column's partially normalized result.
- Default normalization is identity. Add trimming, rounding, or other pure, idempotent business corrections explicitly.
- Optional `edit.onValueCommitted(row, value)` checks a changed, parsed editor output before LineItems adopts it. The row is read-only and the value follows the editor's output type. A normal return or fulfilled Promise permits adoption; throw/rejection retains the draft and failure for explicit correction/retry. It does not update rows or save to the backend for you. Direct mutation commands and initial values do not invoke this callback; document-wide requirements belong in hook validation.
- Throw `CellEditError` from the package entrypoint for a translated message safe to display. Other failures use generic feedback; `edit.error.render` receives the original error for application-owned rendering. Like DataTable, `edit.error: false` opts out of interception and waiting: the value is adopted eagerly and callback failures are consumer-owned. This does not disable document validation.
- Default equality is `Object.is`, without implicit trimming, null/undefined equivalence, or a numeric epsilon. Supply `equals` for a property's intentional alternative equality.

Text and number edits confirm on Enter, Tab, leaving the cell, or `commitEdits()`. Escape cancels the draft. IME composition is not an Enter confirmation. A malformed number blocks preparation; correct or cancel it instead of saving the previously adopted value as though the draft had succeeded. Numeric input uses `.` as its decimal separator independently of display locale; full-width digits and valid comma grouping are normalized by the parser.

### Editor types

Text/number inputs, choice searching/highlighting, and calendar UI use the same controls as DataTable. Their owners retain distinct adoption contracts: DataTable keeps its draft callbacks, Tab confirmation/navigation, and datetime conversion; LineItems keeps document-owned drafts, validation, and explicit save preparation. Sharing controls does not make a cell selection a backend save.

| `edit.editorType` | Confirmed value                 | Behavior                                                                                              |
| ----------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `"text"`          | `string \| null`                | Text input with document-owned drafts. Empty input confirms `null`.                                   |
| `"number"`        | `number \| null`                | Numeric parsing is independent of display locale and precision. Malformed input stays a draft.        |
| `"boolean"`       | `boolean`                       | Keyboard-accessible checkbox; no null or indeterminate value is introduced.                           |
| `"date"`          | `string \| null`                | Popover + Calendar; confirms date-only `"YYYY-MM-DD"` values, with optional inclusive `min` / `max`.  |
| `"combobox"`      | `string \| number \| null`      | Fixed `options` or an async `fetcher`, never both. Retains the property’s numeric/literal value type. |
| `"custom"`        | The property’s exact value type | `renderEditor(ctx)` receives `value`, `onCommit`, `onCancel`, readonly `row`, and `ariaLabel`.        |

Boolean cells retain their editable tint while the checkbox is focused; confirming a toggle does not switch the cell to an untinted background. The checkbox keeps its keyboard focus indicator. Other editors retain their existing focus styling.

Display and editor types do not form a whitelist. For example, a nullable numeric property can use money display with a number input, or number display with numeric combobox choices. The renderer must accept the property value, and the editor’s possible output must fit that property; the library does not widen a nonnullable model to accommodate Clear.

### Choice editors: values, labels, and async search

Fixed and async choices use the same `editorType: "combobox"`. `options` and `fetcher` are mutually exclusive. Numeric values remain numbers, including literal unions; the string `"1"` is not silently converted to numeric `1`.

Input candidates do **not** automatically change non-editing display. Use `render` or display options explicitly when a stored ID/code should show a label. Async `getOptionLabel(value, row)` supplies the **editor’s current-value label** when the current value is absent from loaded results; it is not a cell display renderer.

```tsx
import { createLineItemHelper } from "@tailor-platform/app-shell";

type ChoiceLine = {
  unit: "pcs" | "box" | null;
  priority: 1 | 2 | null;
  supplier: string | null;
};

const units = [
  { value: "pcs", label: "Pieces" },
  { value: "box", label: "Box" },
] as const;
const priorities = [
  { value: 1, label: "Normal" },
  { value: 2, label: "High" },
] as const;
const suppliers = [
  { value: "SUP-001", label: "Supplier 001" },
  { value: "SUP-002", label: "Supplier 002" },
];
const supplierLabel = (value: string | null) =>
  suppliers.find((option) => option.value === value)?.label ?? value ?? "—";
const { column: choiceColumn } = createLineItemHelper<ChoiceLine>();
const choiceColumns = [
  choiceColumn({
    accessorKey: "unit",
    label: "Unit",
    render: (row) => units.find((option) => option.value === row.unit)?.label ?? "—",
    edit: { editorType: "combobox", options: units },
  }),
  choiceColumn({
    accessorKey: "priority",
    label: "Priority",
    type: "number",
    render: (row) => priorities.find((option) => option.value === row.priority)?.label ?? "—",
    edit: { editorType: "combobox", options: priorities },
  }),
  choiceColumn({
    accessorKey: "supplier",
    label: "Supplier",
    render: (row) => supplierLabel(row.supplier),
    edit: {
      editorType: "combobox",
      // Mock backend search; pass signal through to fetch() in a real implementation.
      fetcher: async (query, { signal }) => {
        signal.throwIfAborted();
        const search = (query ?? "").toLowerCase();
        return suppliers.filter((option) => option.label.toLowerCase().includes(search));
      },
      getOptionLabel: supplierLabel,
    },
  }),
];
```

A fetcher receives `query: string | null` and `{ signal: AbortSignal }`; `null` requests the initial result window. It can be a plain function or `{ fn, debounceMs }`, using the existing async-items contract. Fixed choices use case/width-insensitive filtering; async results retain backend order and are not filtered or ranked again in the browser. Label synchronization does not issue a search query.

Typing a query or moving the highlight does not confirm a value. Clearing the query only resets search; **Clear value** explicitly confirms `null`. Escape cancels rather than confirming or clearing. A current value outside the candidates remains intact and is not injected as a selectable option. Its absence alone is not a validation error; use `edit.onValueCommitted` for cell-local rules about allowed values. Reserve hook `validate` for relationships across lines or document-wide constraints.

Loading, failure, and explicit retry are search states, separate from document confirmation/validation. They remain visible even when the editor has a current fallback label. A failed search does not by itself invalidate the existing document value or make option loading a document-save request.

Keep the fetcher reference stable for one lookup source. Replacing it invalidates previous results and closes the search popup without clearing the current value; reopening searches the new source. Results from an older source cannot become selectable afterward.

### Date-only editing

A date editor uses a `string | null` editing property (optionally also `undefined`) and a portaled Calendar, not a datetime or segmented-input conversion. Read-only date renderers can also display Date/epoch values; map those explicitly to a date-only editing model before enabling the date editor. Selecting a day confirms its `"YYYY-MM-DD"` string without converting it through an instant/timezone. **Clear date** confirms `null`; closing the popup or pressing Escape leaves the adopted value unchanged. If confirmation fails, the attempted date remains visible beside its error rather than showing the older adopted date as though it succeeded.

Set `min` and `max` under `edit` as date-only strings. Bounds are inclusive and apply both to calendar selection/input confirmation and full-document validation of dates written through commands or received as data. Malformed or out-of-range adopted dates block preparation, including on unchanged rows. Null is an empty value, not an automatically generated requiredness error; reject `null` in `edit.onValueCommitted` when a date is mandatory. Invalid bound configuration is an error rather than a silently ignored setting.

### Custom structured values

`renderEditor` receives the property’s value without JSON conversion. Commit a new immutable value through `onCommit`; do not mutate the existing object or consumer row. Give the control or native group an accessible name using `ariaLabel`.

```tsx
import { Button, createLineItemHelper } from "@tailor-platform/app-shell";

type PackLine = { packSize: { units: number } | null };
const { column: packColumn } = createLineItemHelper<PackLine>();
const packSizeColumn = packColumn({
  accessorKey: "packSize",
  label: "Pack size",
  render: (row) => (row.packSize ? `${row.packSize.units} units / pack` : "—"),
  edit: {
    editorType: "custom",
    renderEditor: ({ value, onCommit, onCancel, ariaLabel }) => (
      <fieldset
        aria-label={ariaLabel}
        className="m-0 flex min-w-0 items-center gap-1 border-0 p-0"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <Button
          size="xs"
          aria-label={`Increase ${ariaLabel}`}
          onClick={() => onCommit({ units: (value?.units ?? 0) + 1 })}
        >
          +
        </Button>
        <span>{value?.units ?? "—"}</span>
        <Button size="xs" onClick={() => onCommit(null)}>
          Clear
        </Button>
      </fieldset>
    ),
  },
});
```

**`onCommit` is the custom editor’s confirmation boundary.** The library can normalize, validate, and track the value after that call; it cannot discover or flush arbitrary private input state inside custom content. Emit only a value ready for adoption, or manage an explicit confirmation interaction in the custom control. The immediate buttons above have no hidden text draft for `commitEdits()` to miss. `onCancel` cancels a logical edit; it is not an undo operation for values already adopted by `onCommit`.

Column `label` is meaningful text. `header(ctx)` replaces the default header content; this slice supplies `sortable: false`. `headerProps`, `cellProps`, and `footerProps` customize `className`, `style`, and `title`, not events, refs, or cell spanning. The table retains its structure and pin positioning.

### Widths, pinning, and footers

| `width`  | Behavior                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| number   | Explicit pixels, including fractional widths.                                |
| omitted  | Intrinsic auto width observed from header, mounted body content, and footer. |
| `"flex"` | Equal share of remaining space, with an internal control-safe minimum.       |

Observed auto widths can grow as longer content appears and do not shrink on ordinary renders. The observation cache resets for the document/schema sizing lifecycle; it is not a promise to measure arbitrary content before it is rendered. All matching rows render in this slice; there is no virtualization. Without flex columns, a trailing internal spacer absorbs unused space instead of stretching declared widths. Insufficient width produces horizontal scrolling, not automatic shrinking or unpinning.

`pin: "left" | "right"` retains the column at that edge. Left/right pinned columns are grouped at their respective edges. The controlled selection checkbox is always first and fixed left, followed by the standard reorder handle when present. A configured row-action column is pinned right.

Rows use the same content-driven sizing as `Table` and `DataTable`. The action cell uses compact vertical padding so `xs` buttons do not increase an otherwise single-line row's height. Multiline content and larger controls can still make a row taller; no fixed row height is imposed.

A visible column's `footer` can be a string, including an empty string, or `({ rows }) => ReactNode`. `rows` contains the adopted logical document rows, not editor drafts. Footer formatting belongs to that renderer; the body column's display type is not automatically applied. `footerProps` decorates the footer cell.

`truncate: true` and `{}` use primitive formatted display for the default tooltip; raw values are not an implicit fallback for JSX. `{ tooltip: false }` requests ellipsis without a tooltip, and a tooltip callback receives `{ row, display }`. Editing/error inspection takes priority over a truncation tooltip.

## Incremental row search

Place `LineItems.Search` in a generic Toolbar inside the same Root as Table. It reads `searchQuery` and `setSearchQuery` from the hook's value, without a second value prop. Typing immediately filters the in-memory rows: no submit, debounce, network request, URL state, or persisted search preference is involved. Clearing the query shows every row again.

`lines` contains matches in document order; `allLines` remains the complete adopted document. Search matches the whole query as a case-insensitive, NFKC/width-insensitive substring across any defined column's source value. Text, numbers, booleans, bigint, valid Date ISO values, and flat primitive arrays are supported. Nulls and arbitrary objects do not match by default. Unconfigured row properties, rendered JSX, and temporary editor drafts are not searched.

Use `column.search(row, query)` to replace that column's default matcher for display labels or structured values. The callback receives the trimmed, NFKC/lowercase query and must be pure; empty queries bypass matchers.

```tsx
column({
  accessorKey: "supplier",
  label: "Supplier",
  render: (line) => supplierLabel(line.supplier),
  search: (line, query) => supplierLabel(line.supplier).toLowerCase().includes(query),
});
```

Searching does not mutate, normalize, reorder, or discard document rows. Dirty state, validation, footer totals, and save snapshots still cover `allLines`, including hidden rows. Hidden logical drafts/failures remain tracked, and `commitEdits()` prepares them too. Search stays in place through Save/Discard and resets when the hook is remounted. Row action `index` and editor row labels retain their full-document positions while filtered. Additions or adopted edits update the matches automatically.

## Column settings

Place `LineItems.ColumnSettings` inside the same Root as Table, usually in a generic `Toolbar.Row`. It reads the Root's value, so there is no second `value` prop and no `LineItems.Toolbar` wrapper. Ordinary AppShell buttons join the toolbar's keyboard navigation automatically. No data-filter control is added.

The Columns popup groups data columns into **Fixed left**, **Scrollable**, and **Fixed right**. Drag within a group to reorder, or between groups to change pinning. The popup retains DataTable's existing row layout, without added arrow buttons or an ellipsis menu. Focus the drag handle and use Up/Down to reorder or Left/Right to change pin sections. Selection, reorder handles, and Actions are fixed utility columns and are not listed. This slice does not provide column visibility controls.

Right-click a data-column header (or focus it and press Shift+F10) to open the same header context menu as DataTable: **Copy label** and **Pin column → Pin to left / Pin to right / Unpin**. The active pin is disabled in the submenu. Columns with `sort.comparator` also offer **Sort column → Ascending / Descending / Reset**. No collection filters are added, and the selection/reorder/Actions utility columns do not have header menus.

`columns` remains the full document schema. Layout uses column IDs, independent of property accessors. Column preference changes do not normalize rows, mark the document dirty, or enter the document change-set. `revert()` and save acknowledgment retain the column preferences and any logical cell drafts remain associated with the same row/column IDs.

Pass a stable `tableId` for browser-local persistence under `as:line-items:v1:<tableId>`; omit it for memory-only preferences. Use one ID per logical table, not per document. DataTable uses its separate, existing namespace. Saved order drops removed IDs and appends newly defined columns; blocked/corrupt storage falls back safely.

| Member                          | Meaning                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `columnOrder`                   | All data column IDs in preference order. Rendering groups them by resolved pin side. |
| `pinnedColumns`                 | User overrides, not the definition defaults.                                         |
| `moveColumn(id, index)`         | Move one ID in the preference order.                                                 |
| `setColumnOrder(ids)`           | Set preference order; unknown/duplicate IDs are reconciled.                          |
| `setPin(id, "left" \| "right")` | Pin with a user override.                                                            |
| `setPin(id, "none")`            | Explicitly unpin, even if the definition is pinned.                                  |
| `setPin(id, null)`              | Clear the override and use the definition's `pin`.                                   |

`pin: "right"` on Amount makes it fixed by default, directly before the rightmost Actions utility column. Users can override that preference; pinning is not a lock. Multiple right-fixed columns retain the UI's order in header, body, and footer.

## Document validation

Pass `validate(lines, { getLineKey })` to `useLineItems` for whole-document rules, such as a minimum line count, duplicate products, or a total exceeding the document budget. Keep cell-local input checks in `edit.onValueCommitted`, rather than repeating them here. A whole-document violation may still identify particular cells for correction.

It runs only during `commitEdits()`, after every required cell confirmation completes, and receives all adopted document lines, including unchanged, read-only, and search-hidden rows. It is not called during rendering, typing, or ordinary commands. There is no initial or live business-validation display.

Return an array of `LineItemsValidationIssue`, directly or through a Promise. Return `[]` for success. Business failures are results, not exceptions; an unexpected throw/rejection rejects `commitEdits()` rather than becoming a validation issue. Keep validators pure with respect to the document and keep their references stable during preparation.

```tsx
const editor = useLineItems({
  columns,
  defaultLines,
  validate: validateDocument,
});

// A validator may return both shapes together:
const issues: LineItemsValidationIssue[] = [
  { scope: "document", message: "The document total exceeds the budget." },
  { scope: "cell", lineKey, columnId: "quantity", message: "Check this line's quantity." },
];
```

Use the callback's `getLineKey(line)` for cell targets: new lines have client keys rather than server IDs, and the callback's key lookup belongs to its validation snapshot. Return both `lineKey` and `columnId` for a cell issue. There is no separate row-only issue kind.

Current issues are exposed through `errors`; `getCellError(key, columnId)` and Table use the same stored results. Table routes cell issues to its existing cell UI. Render document issues in application-owned content, for example beside the document heading or inside Footer; no document-error component is inserted automatically. Issues do not dirty the document or enter save snapshots.

Changing adopted data, resetting, or Discard clears prior results. Editing, replacing validation rules, disposal, or document commands during an async attempt retire that attempt with `null`; late success and failure cannot replace current results or emit an unvalidated snapshot. New preparation can start without waiting for the retired request. Requests are not automatically aborted. Search and column layout alone do not invalidate validation.

Intrinsic date parsing/bounds checks remain in force for initial data and command writes, even without a business validator and with `error: false`.

## Saving and Discard

Use `commitEdits()` before submitting from an application-owned button. It confirms drafts, waits for required confirmation work, validates the whole document, then returns one immutable `LineItemsChangeSet<T>` or `null`.

- `null` means preparation could not complete: an invalid/failed draft, validation error, disposal, or unrelated editing/configuration change invalidated the attempt. Existing valid adoptions are not rolled back; the user can correct or retry.
- `isEmpty: true` means preparation succeeded but there are no document changes to send.
- `getChangeSet()` is synchronous and read-only. It snapshots adopted values without confirming editors.
- Concurrent preparation calls share the in-progress attempt. Preparation does not automatically retry a previously failed confirmation.

A change-set contains `lineChanges` with these transport-neutral forms:

```ts
type LineChange<T> =
  | { action: "add"; tempId: string; data: Readonly<Partial<T>> }
  | { action: "update"; lineId: string; patch: Readonly<Partial<T>> }
  | { action: "remove"; lineId: string };
```

Create `data` contains the raw creation row except its server-ID property and internal identity, so read-only business identifiers are not lost. Updates contain changed document-owned properties only. A line added and removed before saving cancels out; restoring the original value removes its update.

Changed adopted order or membership also emits an authoritative `order` array containing `{ lineId }` and `{ tempId }` references. This represents the final order including new middle insertions; it is not a list of positions among saved survivors. Use `reorderLine(lineKey, afterLineKey)` to move a line after another, or pass `null` to move it to the beginning.

### Acknowledge the exact submitted snapshot

After a successful request, pass the **same snapshot object** to `reset(..., { sent })`. Do not replace it with a spread, JSON copy, or reconstructed change-set; the controller associates it with the exact submitted document and baseline.

```tsx
const sent = await lineItems.commitEdits();
if (sent === null || sent.isEmpty) return;

const saved = await submitLines(sent);
lineItems.reset(saved.lines, { sent, idMap: saved.idMap });
```

For a backend that returns only newly assigned IDs:

```tsx
lineItems.reset({ idMap }, { sent });
```

Every submitted new line needs an explicit `tempId` → server-ID mapping, even if it was removed locally while the request was in flight. No ID is guessed from response order or equal row content. Canonical saved rows must represent the submitted document membership. Invalid/incomplete mappings or mismatched canonical rows reject acknowledgment without partially advancing the baseline.

Acknowledgment compares the submitted snapshot, current document, and accepted server values. Later local edits/additions/removals/order changes remain pending, while unchanged values can adopt canonical server results. A created line removed during its request becomes a pending removal of its assigned server ID. Duplicate acknowledgment of the same receipt is idempotent; another receipt from an obsolete baseline is rejected. Serialize backend document saves in the application.

`reset(savedRows)` without `sent` deliberately replaces the document/baseline rather than rebasing a save. Replacement rows must have server IDs. `reset()` cannot silently mark unidentified new rows saved; use a receipt and mapping. `revert()` discards uncommitted document changes back to the baseline and cancels obsolete drafts.

### Dirty, errors, and navigation

`isDirty` describes document change-set differences. `hasUnsavedChanges()` additionally considers changed drafts and unresolved session failures, and reads current state immediately after a command. Mere focus is not unsaved; an initial validation error with no local change does not by itself trigger unsaved state.

`errors` and `getCellError(lineKey, columnId)` expose document validation. Draft/confirmation failure also participates in preparation and unsaved protection, but is not a fabricated document patch. Applications implementing a navigation warning should use `hasUnsavedChanges()`, and applications implementing Save must still call `commitEdits()`.

## Commands and parts

| Member                                                                                   | Description                                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lines` / `allLines`                                                                     | Search matches versus all adopted rows, both in document order.                                                                                              |
| `selectedIds` / `isRowSelected(row)`                                                     | Valid selected public line keys and a row predicate.                                                                                                         |
| `toggleRowSelection(row)` / `selectAllRows()` / `deselectAllRows()` / `clearSelection()` | DataTable-compatible selection commands; select/deselect-all covers current matches while retaining hidden selections. Undefined when selection is disabled. |
| `pendingActionId` / `runSelectionAction(action, request)`                                | Shared bulk-request tracking; pending state survives Footer remounts.                                                                                        |
| `searchQuery` / `setSearchQuery(query)`                                                  | In-memory incremental row search, independent of document saves.                                                                                             |
| `addLine(line, options?)` / `addLines(lines, options?)`                                  | Add complete editing models and return line keys. Passed IDs are dropped. `afterLineKey` omitted appends, `null` prepends, otherwise inserts after that key. |
| `removeLine(key)` / `removeLines(keys)`                                                  | Remove document lines.                                                                                                                                       |
| `updateField(key, property, value)`                                                      | Property-typed single-field update.                                                                                                                          |
| `updateLines(patches)`                                                                   | Batched `{ lineKey, patch }` updates; rejects unowned properties and direct server-ID changes.                                                               |
| `reorderLine(key, afterKey)`                                                             | Manual document movement; rejects when `orderer` is `"readonly"`.                                                                                            |
| `getLineKey(line)` / `isNewLine(line)`                                                   | Public saved-ID/temp-key reference and whether a server ID is still absent.                                                                                  |
| `getChangeSet()` / `commitEdits()`                                                       | Adopted snapshot read versus awaitable save preparation.                                                                                                     |
| `reset(...)` / `revert()`                                                                | Successful-save acknowledgment or explicit replacement versus Discard.                                                                                       |

Saved line keys are server IDs as strings; new line keys are client-only references until acknowledgment. Do not assign temporary values to the business ID property. Row-action renderers receive the current `lineKey`, `isNew`, and zero-based `index`, so they need no repository-only identity helper.

### `LineItems.Root`

| Prop        | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| `value`     | The return value of `useLineItems`; required.               |
| `children`  | Application-owned composition containing `LineItems.Table`. |
| `className` | Root wrapper classes.                                       |

Root renders the shared DataTable-style border, rounded corners, and `overflow-clip` frame. A direct generic `Toolbar.Root` retains its top corners but drops its bottom radius and outer borders, leaving only the divider beneath it. Table's scroll container can shrink when height is constrained; Toolbar and Footer remain outside that scroll region. The example's heading and status message live outside the frame, not in a wrapping Card.

Root distributes the controller; it does not own another copy of the rows. Ordinary buttons calling the hook's methods can live outside Root. Table and ColumnSettings read its context and must share the Root, so placing the generic toolbar inside Root avoids passing the value twice. A fabricated value is not a replacement for calling the hook.

### `LineItems.Table`

| Prop           | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `aria-label`   | Accessible table caption; localized generic line-items title when omitted. |
| `className`    | Classes applied to the table.                                              |
| `emptyMessage` | Empty-document content; localized default when omitted.                    |

Table requires Root. It renders matching lines, standard/computed display, all declared editor kinds, optional controlled selection, column sorting, default manual-order drag handles unless `orderer` is `"readonly"`, optional row actions, and document-wide column footers. Add/save/Discard controls remain application-owned.

### `LineItems.Footer`

Requires Root and accepts only `children` and `className`. It is a plain div-based presentation surface; compose ordinary children directly with divs and Button, without Toolbar. Configure `rowSelection` and its `actions` on `useLineItems`, not any component.

When valid selections and configured actions exist, Footer renders only the shared bulk-action group and unmounts its children. When the bar closes, children render again. Count, actions, Clear, and pending state come from context; counts include search-hidden rows. Clear calls `clearSelection`, not Discard. Keep transport and pending receipts in the consumer outside the conditionally mounted footer content.

The live region remains mounted so the first selection is announced. When a focused bulk control disappears, focus returns to the selection header; an empty/filtered table falls back to an enabled footer control, then the footer itself. Bulk controls use native Tab navigation rather than Toolbar's directional-key navigation.

The application owns button visibility, labels/icons, disabled conditions, and handlers. The showcase uses `size="xs"`, non-submit buttons, and disables Discard until adopted changes or unfinished drafts exist. Readonly hides the whole document-action area; amend hides Add while retaining Discard/Save. Save calls `commitEdits()` and owns transport and acknowledgment. Footer itself has no operation-specific props or automatic save behavior.

### `LineItems.ColumnSettings`

Accepts optional `className`. Requires `LineItems.Root`, reads its layout state, and renders the shared Columns popup. Compose it with the generic `Toolbar`; no LineItems-specific toolbar or filter component is needed.

### `LineItems.Search`

Accepts optional `className`, `placeholder`, and `aria-label`. Requires Root. It renders a compact search input suitable for Toolbar and announces the shown/full row count. The input retains its caret/navigation keys inside Toolbar.

## Related

- [DataTable](./data-table.md) — collection-owned data display, filtering, and pagination.
- [Table](./table.md) — underlying semantic table primitives.
- [Card](./card.md) — composition around a document's table and application-owned controls.
