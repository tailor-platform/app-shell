---
kind: code-backed
group: data-table
title: DataTable
description: Compound data table component with sortable columns, filter chips, cursor-based pagination, row actions, and multi-row selection
sources:
  - packages/core/src/components/data-table/**
  - packages/core/src/hooks/use-collection-variables.ts
  - packages/core/src/lib/collection-url-state.ts
  - packages/core/src/contexts/collection-control-context.tsx
  - packages/core/src/types/collection.ts
---

# DataTable

`DataTable` is a compound component for displaying collections of records. It integrates with the collection variable hooks (`useCollectionVariables`) to drive sorting, filtering, and cursor-based pagination through a GraphQL API.

## Import

```tsx
import {
  CellEditError,
  DataTable,
  useDataTable,
  useDataTableContext,
  useCollectionVariables,
  createColumnHelper,
  type Column,
  type DataTableData,
  type DataTableRootProps,
  type DataTablePaginationProps,
  type DataTableAction,
  type RowAction,
  type RowSelectionOptions,
  type SelectionAction,
  type UseDataTableOptions,
  type UseDataTableReturn,
  type MetadataFieldOptions,
  type DataTableContextValue,
  type TextCellEditOptions,
  type NumberCellEditOptions,
  type BadgeCellEditOptions,
  type DateCellEditOptions,
  type CellEditState,
  type DateTimeDraft,
} from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
import { gql, useQuery } from "urql";
import {
  DataTable,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
} from "@tailor-platform/app-shell";

const LIST_JOURNALS = gql`
  query ListJournals(
    $after: String
    $before: String
    $first: Int
    $last: Int
    $order: [JournalOrderInput]
    $query: JournalQueryInput
  ) {
    journals(
      after: $after
      before: $before
      first: $first
      last: $last
      order: $order
      query: $query
    ) {
      edges {
        node {
          id
          contents
          authorID
        }
      }
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
      total
    }
  }
`;

type Journal = { id: string; contents: string; authorID: string };

const { column } = createColumnHelper<Journal>();

const columns = [
  column({
    label: "ID",
    render: (row) => row.id,
    filter: { field: "id", type: "uuid" },
  }),
  column({
    label: "Author",
    render: (row) => row.authorID,
    sort: { field: "authorID", type: "string" },
    filter: { field: "authorID", type: "string" },
  }),
  column({
    label: "Contents",
    render: (row) => row.contents,
    filter: { field: "contents", type: "string" },
  }),
];

function JournalsPage() {
  const { variables, control } = useCollectionVariables({
    params: { pageSize: 20 },
  });

  const [result] = useQuery({
    query: LIST_JOURNALS,
    variables: {
      ...variables.pagination,
      query: variables.query,
      order: variables.order,
    },
  });

  const table = useDataTable({
    columns,
    data: result.data
      ? {
          rows: result.data.journals.edges.map((e) => e.node),
          pageInfo: result.data.journals.pageInfo,
          total: result.data.journals.total,
        }
      : undefined,
    loading: result.fetching,
    control,
  });

  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar>
        <DataTable.Filters />
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
      </DataTable.Footer>
    </DataTable.Root>
  );
}
```

## Sub-components

`DataTable` is a namespace object. All sub-components read state from `DataTable.Root` via context.

| Sub-component              | Description                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataTable.Root`           | Context provider. Wraps all other sub-components. Required.                                                                                                                                           |
| `DataTable.Table`          | Renders the `<table>` with headers, body, and an optional [column footer](#column-footers). Required.                                                                                                 |
| `DataTable.Toolbar`        | DataTable-specific toolbar container. Optional; pass `columnSettings` for the built-in Columns control.                                                                                               |
| `DataTable.ColumnSettings` | The placeable Columns control (show/hide + reorder + pin). Use it in a generic [`Toolbar`](./toolbar.md) for custom layouts.                                                                          |
| `DataTable.Filters`        | Add-filter panel + active filter chips, auto-generated from column filter configs. Requires `control` from `useCollectionVariables`.                                                                  |
| `DataTable.Footer`         | Container outside the `<table>` for pagination and other content, not the column footer. Optional. Becomes the bulk-action bar while rows are selected — see [Selection actions](#selection-actions). |
| `DataTable.Pagination`     | Pre-built pagination controls with optional row count and selection info. Requires `control` from `useCollectionVariables`. Place inside `DataTable.Footer`.                                          |

### `DataTable.Root` Props

| Prop        | Type                       | Description                                  |
| ----------- | -------------------------- | -------------------------------------------- |
| `value`     | `UseDataTableReturn<TRow>` | Return value of `useDataTable()`. Required.  |
| `children`  | `ReactNode`                | Sub-components to render inside the root.    |
| `className` | `string`                   | Additional CSS class for the root container. |

### `DataTable.Toolbar` Props

| Prop             | Type        | Default | Description                                                                                                                                 |
| ---------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`       | `ReactNode` | —       | Toolbar content, stacked on the left.                                                                                                       |
| `columnSettings` | `boolean`   | `false` | Render the built-in Columns control at the top-right. Use [`Toolbar`](./toolbar.md) with `DataTable.ColumnSettings` for new custom layouts. |
| `className`      | `string`    | —       | Additional CSS class for the toolbar container.                                                                                             |

For new layouts, use the generic [`Toolbar`](./toolbar.md).

### `DataTable.Filters` Props

| Prop          | Type                        | Default | Description                                                                                    |
| ------------- | --------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `slot`        | `"all" \| "chips" \| "add"` | `"all"` | Which part to render (see below).                                                              |
| `addIconOnly` | `boolean`                   | `true`  | Render the **Add filter** trigger as an icon-only button (the label becomes its `aria-label`). |
| `className`   | `string`                    | —       | Additional CSS class for the filters container.                                                |

By default `DataTable.Filters` renders the active filter chips plus the **Add filter** trigger together. The `slot` prop lets you split them across a custom toolbar layout:

- `"all"` — chips + the **Add filter** trigger (default).
- `"chips"` — only the active chips (renders nothing when there are none).
- `"add"` — only the **Add filter** trigger.

```tsx
// Add filter in a header row (with tabs, etc.); chips on the row below.
<Toolbar.Root>
  <Toolbar.Row justify="between" aria-label="List controls">
    <Toolbar.Group>
      <MyViewTabs />
    </Toolbar.Group>
    <Toolbar.Group>
      <DataTable.Filters slot="add" />
    </Toolbar.Group>
  </Toolbar.Row>
  <Toolbar.Row aria-label="Active filters">
    <Toolbar.Group>
      <DataTable.Filters slot="chips" />
    </Toolbar.Group>
  </Toolbar.Row>
</Toolbar.Root>
```

### `DataTable.Pagination` Props

| Prop              | Type       | Default | Description                                                                                                                                                                                                                  |
| ----------------- | ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSizeOptions` | `number[]` | —       | Available page-size options. When provided, a page-size switcher is rendered. The First button is always shown, even when the backend omits `total`; the Last button is shown only when the backend returns a `total` count. |

`DataTable.Pagination` automatically displays a row count and selection info text on the left side of the pagination bar based on context state:

| Condition                                 | Displayed text           |
| ----------------------------------------- | ------------------------ |
| `total` is provided                       | `X row(s)`               |
| Rows selected and `total` is provided     | `Y of X row(s) selected` |
| Rows selected and `total` is not provided | `Y row(s) selected`      |
| No selection enabled and no `total`       | _(nothing displayed)_    |

Row selection is enabled by providing `rowSelection` or `onSelectionChange` to `useDataTable`. The `total` value comes from `DataTableData.total`. While the footer shows the bulk-action bar (see [Selection actions](#selection-actions)), the bar owns the selection count and this text is omitted.

When pagination changes page or page size, `DataTable.Table` resets its own scroll container to the top automatically. That applies whether navigation comes from the built-in `DataTable.Pagination` or from custom controls using the same table context.

## Column pinning, visibility & ordering

- **Pin** a column with `pin: "left" | "right"`. Pinned columns stay visible during horizontal scroll; the selection and expand columns auto-pin left and the row-actions column auto-pins right. A subtle shadow appears at the frozen edge once the table is scrolled under it. Sticky offsets are measured from the rendered layout, so a `width` isn't required — but setting `width` on pinned columns is recommended so their size stays stable as content changes.
- **Column settings.** `DataTable.ColumnSettings` renders a popover to show/hide columns, reorder them (drag), and change pinning by dragging a column between the **Fixed left**, **Scrollable**, and **Fixed right** zones. Place it in a generic [`Toolbar`](./toolbar.md), or pass `columnSettings` to `DataTable.Toolbar` for its fixed top-right placement.
- **Persistence.** Pass a stable, **unique** `tableId` to persist each user's column layout (visibility, order, pinning) to `localStorage` (key `as:data-table:v1:<tableId>`). This is a per-user preference — it is deliberately **not** stored in the URL like filters/sort/pagination, so it survives reloads and isn't reset by shared/filtered links. Omit `tableId` for in-memory-only layout (state simply isn't persisted). Two tables mounted with the same `tableId` share one storage key and overwrite each other — use a unique id per table (e.g. `<route>:<entity>`); a dev-mode warning fires on duplicates.

```tsx
const table = useDataTable<Order>({
  columns, // e.g. [{ id: "ref", label: "Ref", width: 140, pin: "left" }, ...]
  data,
  tableId: "orders-list",
});

<DataTable.Root value={table}>
  <Toolbar.Root>
    <Toolbar.Row justify="between" aria-label="Order table controls">
      <Toolbar.Group>
        <DataTable.Filters />
      </Toolbar.Group>
      <Toolbar.Group>
        <DataTable.ColumnSettings />
      </Toolbar.Group>
    </Toolbar.Row>
  </Toolbar.Root>
  <DataTable.Table />
</DataTable.Root>;
```

## Column footers

Set `column.footer` to a static string such as `footer: "Total"`, or a renderer for a total or other content beneath that column without adding synthetic rows to `data.rows`. `DataTable.Table` automatically renders one `<tfoot>` row when at least one visible column defines a footer, including an empty string. Fixed header text still uses `column.label`; `column.header` remains a custom renderer that replaces the built-in header UI.

<!-- example: column-footers | Editable quantities with an automatically recalculated column total; only real records belong in data.rows. -->

- **Current rows, not all records.** `ctx.rows` is the current `data.rows` array exposed as read-only, so a paginated table computes a page total. Selection does not narrow it. For a server-calculated total across all pages, use a closure such as `footer: () => totalQuantity` instead.
- **Current adopted values.** Updating `data.rows`, including adopting a confirmed cell edit, updates the footer. Unconfirmed editor drafts are not included, and footer callbacks must not mutate rows.
- **Consumer-owned content and formatting.** A string is displayed as-is; renderers can return text, numbers, or JSX. `type` and `typeOptions` do not format footer results. A column without `footer`, or a renderer returning `null`, leaves an empty cell.
- **Do not sum mixed currencies.** A `money` column can resolve its currency per row, so check that all amounts being summed use the same currency before displaying a monetary total. If multiple currencies are present, return a placeholder such as `"N/A"` or `"–"` instead of adding the amounts together. Currency checks, aggregation, and formatting belong to the consumer; the table does not convert currencies or validate footer totals.
- **Shared column layout.** Footer cells follow column width, alignment, ordering, visibility, and left/right pinning. Hidden columns' footer callbacks are not called. The row sticks to the bottom of the table's scroll container during vertical scrolling, paired with the sticky header at the top.
- **Not data rows.** The footer has no generated editors, selection checkboxes, expansion triggers, or row-action menus; their utility columns have empty footer cells to preserve alignment. Footer cells do not trigger `onClickRow`.
- **Loading and empty states.** Loading keeps the footer row mounted and replaces defined footer content with skeletons without calling footer renderers, including during page changes. This preserves the footer region without showing stale totals or calculating from incomplete data. Errors hide the footer. Loaded empty data still calls visible footer renderers with `rows: []`; the consumer chooses whether to return zero, a dash, or `null` for a blank cell. The table does not substitute these values. Check `rows.length` to distinguish no records from records whose total is zero. If no visible column defines `footer`, no `<tfoot>` is rendered.

### Column footer vs. table footer

These APIs use “footer” at different scopes:

- **Column footer — `column.footer`.** Content for a column-aligned cell inside the table's `<tfoot>`, such as a label, total, or note. It shares the column's layout, including width, alignment, and pinning.
- **Table footer — `DataTable.Footer`.** A container outside the `<table>` for pagination and other table-level content. It becomes the bulk-action bar while rows are selected.

`DataTable.Table` renders column footers automatically; no additional JSX component is needed. `DataTable.Footer` does not render or configure column footers, and either region can be used without the other.

## Context menus

`DataTable.Table` adds right-click context menus to both headers and cells:

- **Headers** can copy the label, pin/unpin, sort, reset sort, and hide the column.
- **Cells** can copy the value, copy `"[header] [value]"`, and add a filter from that cell's value.

### Behavior contract

`DataTable` treats column configuration as two layers:

- **Presentation** — `column.header`, `column.render`, and `column.footer` control what is rendered.
- **Behavior/data** — `column.label`, `column.id`, `column.accessor`, `column.sort`, `column.filter`, and collection `control` drive built-in behavior such as sorting, truncation tooltips, persistence, and context-menu actions.

This means built-in interactions do **not** infer meaning from rendered DOM content. If a custom-rendered column should still participate in built-in copy/filter/tooltip behavior, give it an `id` or `accessor` that exposes the raw value.

### Custom headers

Header context menus still work when `column.header` is custom, because the menu wraps the rendered header content from the outside.

When a column is sortable (`column.sort` is set and collection `control` is available), the **Sort column** submenu still appears in the context menu. However, left-click sorting remains the custom header's responsibility: call `ctx.activateSort()` from your custom header if you want click-to-sort behavior in the header itself.

### Custom cell renderers

Cell context menus need a raw value for copy and filter actions. They resolve it in this order:

1. `column.accessor(row)`
2. `row[column.id]`
3. the return value of `column.render(row)`, **only when it is a primitive** (`string`, `number`, `boolean`, or `bigint`)

If a custom cell renderer only returns JSX and does not provide `id` or `accessor`, the table cannot recover the underlying value. In that case:

- **Copy value** is disabled
- **Copy header and value** is disabled
- **Add filter** is omitted

For custom-rendered columns that should participate in copy/filter actions, set `id` or `accessor` explicitly.

### Filter behavior

The cell **Add filter** submenu reuses the same collection `control` as `DataTable.Filters`, so new filters flow through the existing chips, query variables, URL sync, and persistence you already have.

The submenu is intentionally narrower than the full filter editor:

- it only appears when the column has `filter` config and `useDataTable` received a `control`
- it only offers **single-value** operators from that column's configured operator list
- multi-value operators such as `between` are excluded
- enum filters use the **raw enum value**, not the rendered label

## Expandable rows

Pass `rowExpansion` to `useDataTable` and each row gets a chevron that reveals a detail panel beneath it. Providing the option is what enables the feature — a dedicated chevron column is added at the left edge (auto-pinned left, after the selection column) and the detail row renders automatically. There is nothing new to compose in JSX.

The parts are grouped rather than flat so the type system rejects incoherent setups: a `getLabel` or `canExpand` with no `render`, or `expandedIds` without `onChange`, are compile errors rather than silently inert configurations.

```tsx
const table = useDataTable<Order>({
  columns,
  data,
  control,
  rowExpansion: {
    render: (row) => <OrderLineItems orderId={row.id} />,
    canExpand: (row) => row.lineItemCount > 0,
    getLabel: (row) => row.orderNumber,
  },
});
```

- **Rows must have an `id`.** Expansion is keyed by `row.id`, the same constraint as row selection. Rows without one render **no chevron** (not a disabled one) — a row must never be un-toggleable.
- **`canExpand`** suppresses the chevron per row (e.g. an order with no line items). The cell is still rendered, empty, so the column count stays consistent. The predicate gates the panel in **both** directions: a row whose result flips to `false` while open closes immediately, and an id sitting in `expandedIds` never opens a panel for a row the predicate rejects. That matters when restoring `expandedIds` from a URL or storage — the excluded row may have no detail data to render at all. Its id stays in `expandedIds` but is inert; `collapseAllRows()` clears it.
- **`getLabel`** returns a **bare identifier** — `"INV-1001"`, not `"Expand row INV-1001"`. The built-in i18n labels compose it into the trigger's accessible name (`"Expand row INV-1001"`) and the panel's (`"INV-1001 details"`), so English and Japanese word order both stay correct. Without it, the generic "Expand row" / "Row details" strings are used — set it on any table with more than a couple of rows.
- **`onClickRow` is unaffected.** The chevron lives in its own column and stops click propagation, so row-level navigation keeps working.
- **Expansion survives page changes.** Ids of rows that are no longer on the page simply don't render. Call `collapseAllRows()` to reset.
- **Multiple rows can be open at once.** There is no accordion / single-open mode.

### Controlled mode

Pass `expandedIds` to own the state yourself; internal state is then never written and you update the array from `onChange`. The two must be passed together — the type rejects either alone.

```tsx
const [expandedIds, setExpandedIds] = useState<string[]>([]);

const table = useDataTable<Order>({
  columns,
  data,
  rowExpansion: {
    render: (row) => <OrderLineItems orderId={row.id} />,
    expandedIds,
    onChange: setExpandedIds,
  },
});
```

`useDataTable` also returns `expandedIds`, `isRowExpanded(row)`, `toggleRowExpansion(row)`, and `collapseAllRows()`. The last two are `undefined` when `rowExpansion` is not provided, and both keep a stable identity across renders, so they are safe to list in an effect's dependency array:

```tsx
// Collapse everything when the page changes.
useEffect(() => {
  collapseAllRows?.();
}, [collapseAllRows, currentPage]);
```

`collapseAllRows()` is a no-op when nothing is open — it neither writes state nor fires `onExpandedChange`.

**Batching caveat.** Each toggle derives the next array from the current value of `expandedIds`, not from a functional update. Two toggles dispatched before your state commits both read the same base, so the first is lost. This matters when `expandedIds` lives behind an async store (Redux/Zustand middleware, a debounced URL sync, a `startTransition`), or when looping `toggleRowExpansion` over many rows to build an "expand all". Compute such updates yourself and set `expandedIds` directly rather than driving them through repeated toggles.

In uncontrolled mode `onChange` is still allowed on its own, as a notification.

### Accessibility

The trigger is a native `<button>`, so Enter/Space activation and the focus ring come for free, and it carries `aria-expanded` — that is what announces the state change on activation. The panel is a `role="region"` with an accessible name, and it sits immediately after its trigger in DOM order, so forward-tabbing reaches it next. Collapsing while focus is inside the panel hands focus back to the trigger rather than dropping it to `<body>`. The chevron's rotation and the panel's reveal both respect `prefers-reduced-motion`. Panel content wider than the viewport scrolls horizontally within the panel, and on a horizontally scrolled table the panel stays pinned to the left edge of the scrollport.

**Expand/collapse is animated** — the panel reveals by transitioning `grid-template-rows` from `0fr` to `1fr`, so it animates to its exact natural height whatever you render, with no height cap to clip tall content. One consequence worth knowing when writing tests against a table: `aria-expanded` flips immediately, but the detail row stays mounted for the ~300ms collapse (marked `data-state="closed"` meanwhile) before it is removed. Assert its removal with `waitFor` rather than synchronously. Under `prefers-reduced-motion` the transition is skipped, but the unmount is still deferred by the same interval.

**Known limitation — row count.** Detail rows are real `<tr>` elements, so a screen reader counts them: ten records with two expanded announces as twelve rows. Fixing this needs `aria-rowcount` plus explicit `aria-rowindex` on every row (with detail rows sharing their parent's index) and correct interaction with pagination; `role="presentation"` on the detail row would fix the count but remove the panel from screen-reader table navigation. Neither is implemented.

## Inline editing

Give a typed column an `edit` config to use its built-in editor. This standardizes the editing UI — draft input, IME, keyboard movement, confirmation, and callback-error presentation. Validation rules and persistence remain consumer-owned; by default, the editor retains a draft until its callbacks complete successfully. Columns without `edit` keep their existing behavior.

| Column type                          | Editor                                    | `onValueChange` draft                                             | `onValueCommitted` output              |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `text` / `link`                      | Direct text input                         | Raw `string`, including `""`                                      | `string \| null`                       |
| `number` / `money`                   | Direct numeric input                      | Raw `string`, including incomplete input such as `"-"`            | JavaScript `number \| null`            |
| `text` / `link` with `edit.options`  | Searchable dropdown                       | Selected string `value`, or `null`; not search text or highlights | Selected string `value`, or `null`     |
| `badge`                              | Searchable dropdown using the same badges | Selected string `value`, or `null`; not search text or highlights | Selected string `value`, or `null`     |
| `date`                               | Calendar                                  | `"YYYY-MM-DD" \| null`                                            | `"YYYY-MM-DD" \| null`                 |
| `date` with `dateFormat: "datetime"` | Calendar and time field                   | Complete `DateTimeDraft` snapshot                                 | UTC ISO timestamp, or `null` for Clear |

Callback types describe the **editor's output**, not the original row field's runtime type. For example, text/link/badge editors confirm strings or `null` even when their display accepts numbers or booleans. The editing option types, `CellEditState`, and `DateTimeDraft` are exported from the package root; parsing and navigation helpers remain internal.

For example, inside a receipt page, accept or reject each proposed quantity yourself. Throw `CellEditError` for invalid quantities to retain the draft and show the message in the cell's error popover. Patch the changed field with a functional state update rather than replacing a whole row captured before another edit:

```tsx
const { column } = createColumnHelper<ReceiptLine>();
const [lines, setLines] = useState<ReceiptLine[]>(initialLines);

const columns = [
  column({ id: "sku", label: "SKU", type: "text" }),
  column({
    id: "received",
    label: "Received",
    type: "number",
    typeOptions: { maxDecimals: 0 }, // Display precision, not an input rule.
    edit: {
      canEdit: (_row, { selected }) => selected,
      onValueCommitted: (row, value) => {
        if (value !== null && (!Number.isInteger(value) || value < 0 || value > row.ordered)) {
          throw new CellEditError(`Enter a whole number from 0 to ${row.ordered}`);
        }
        setLines((current) =>
          current.map((line) => (line.id === row.id ? { ...line, received: value } : line)),
        );
      },
    },
  }),
];

const table = useDataTable({ columns, data: { rows: lines }, rowSelection: {} });
```

`ReceiptLine` and `initialLines` are the page's row type and initial data. `useState` comes from React; `CellEditError`, `createColumnHelper`, and `useDataTable` come from AppShell.

### Editing options

| Option             | Column types            | Contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onValueChange`    | all typed columns       | Optional: `(row, draft) => void`. Observes changed drafts, including restored drafts on cancellation. See the draft types above. Updating `data` here is outside the supported coordination contract. Successful return values are ignored. A failure retains the draft and prevents confirmation; a pending returned Promise must succeed before `onValueCommitted` runs.                                                                                                                                     |
| `onValueCommitted` | all typed columns       | Required: `(row, value) => void`. Attempts confirmation of a changed editor output, compared with current consumer-provided `data`, not an edit-start snapshot. Empty or explicitly cleared cells output `null`; equal values do not notify. Successful completion ends the edit; a returned Promise delays edit completion until it settles. Throwing or rejecting retains the draft and error for correction or retry. Adoption and persistence remain consumer-owned; successful return values are ignored. |
| `error`            | all typed columns       | Optional: `false \| { render: (ctx: { row: TRow; error: unknown }) => ReactNode }`. Omit for the standard callback-error popover, pass `false` to disable interception, or provide `render` to customize the popover's body. See [Callback error popovers](#callback-error-popovers).                                                                                                                                                                                                                          |
| `canEdit`          | all typed columns       | `(row, { selected }) => boolean`. Decides which rows can be edited, like `rowExpansion.canExpand` and an action's `canApply`. Default: rows with an `id`. `selected` is `false` when selection is off; provide `rowSelection: {}` to enable it.                                                                                                                                                                                                                                                                |
| `options`          | `text`, `link`, `badge` | `readonly { value, label }[]`. Text/link columns become searchable dropdowns; values are strings and their labels are displayed, including in read-only cells. Badge choices default to `typeOptions.badgeLabelMap`, then the column's enum filter options. Without choices, a badge column stays read-only. The "None" choice confirms `null`.                                                                                                                                                                |

Rows need a string or number `id`; rows without one remain read-only and produce a one-time warning. Multi-value badge cells also remain read-only. Editable cells carry a subtle tint at rest, layered over the row's hover and selected states, and drop it while being edited. Dropdown and date cells also show their editor icon on hover or focus; typed-into cells show none. The whole cell is the click target. Editing a cell does not fire `onClickRow`.

### Confirmation and keyboard behavior

- **Enter / Shift+Enter:** attempt confirmation in the same logical cell. Success ends editing and restores normal cell display; a pending callback keeps the draft visible, and failure keeps it editable with its error. Enter can retry a failed commit. A failed change check or numeric parse must be corrected before confirmation can proceed. Enter or clicking a focused display cell starts editing again.
- **Tab / Shift+Tab:** attempt confirmation and move to the next / previous editable cell, skipping read-only cells. Callback failures and pending callbacks do not trap focus: their drafts remain in the original cell. At the ends, focus leaves the table normally. Malformed numeric input retains its existing Tab-blocking behavior.
- **Esc:** cancel the edit and atomically discard its draft and error, returning to the latest `data`. Notify `onValueChange` only if the restored draft differs, without `onValueCommitted`; restoration failures cannot recreate an error after cancellation. Pending callback results are invalidated, not cancelled. If the error popover is open, the first Esc only closes those details; a subsequent Esc in the editor or error trigger cancels the edit.
- **Dropdowns:** type to filter choices. Exact labels rank first, then prefix matches, then substring matches, with original order retained within each rank. "None" is excluded while a search query is present and available with an empty query. Tab focuses a closed dropdown without opening it; one Enter opens it without confirming. While open, Enter attempts confirmation of the candidate in the same cell; Tab attempts confirmation of a selected or searched candidate and moves on. Tab without selecting or searching only moves focus. A keyboard-highlighted candidate takes precedence over ranked search matches; hovering does not count as an explicit selection. Clicking a choice also attempts confirmation. Outside click, blur, and Esc discard an ordinary unconfirmed search and restore the latest `data`, even for an exactly typed label or keyboard-highlighted candidate, without either callback. A selected candidate whose confirmation is pending or failed remains displayed even if the dropdown closes; Esc cancels it. Search/highlight changes emit neither callback; a different selection emits `onValueChange`, then invokes `onValueCommitted` only after the change check succeeds.
- **Dates:** selecting a day emits its draft and attempts confirmation immediately. Clear explicitly attempts confirmation of `null`.
- **Date-times:** day and time are independent. Both must be valid to enable Done; an empty time does not become midnight. Done attempts confirmation of the timestamp in the AppShell timezone. Outside closing cancels an ordinary unfinished edit, but retains a pending or failed draft; Esc cancels either. Clear explicitly attempts confirmation of `null`. While a date editor has an active, pending, or failed draft, its trigger shows that raw draft date/time rather than the adopted value's formatter or custom `column.render`.
- **Blur:** attempts confirmation of a changed direct-input value. It does not retry an already failed commit or duplicate an in-flight confirmation; failed and pending drafts survive leaving and re-entering the cell. Enter during IME composition confirms the conversion, not the cell. Composition changes may notify raw drafts; normalization waits until cell confirmation.

A date-time draft preserves missing parts rather than inventing a timestamp:

```ts
type DateTimeDraft = {
  day: string | null; // "YYYY-MM-DD", or an unselected day.
  time: string | null; // "HH:mm", or an empty time field.
};
```

`onValueChange` receives the complete snapshot whenever either part changes, not just the changed part.

Numeric confirmation uses JavaScript `number`, **not arbitrary-precision Decimal**. Values outside the supported safe range are rejected, and high-precision decimal strings can lose precision when converted to numbers. Editing uses `.` as the decimal separator independently of display locale; `typeOptions.locale` does not select a locale-aware input parser. Full-width digits, valid comma thousands grouping, and currency symbols are normalized on confirmation; a decimal comma such as `1,5` is not accepted. The existing numeric renderer's `Number` conversion is unchanged.

Malformed numeric input is allowed while typing and can notify raw drafts. Enter/Tab cannot confirm it: they show basic parsing feedback and hold focus. Blur discards it, restores the latest `data`, and notifies the restored draft without a commit. Cosmetic changes such as `10` to `10.00` can notify draft changes but do not emit `onValueCommitted`. This is basic parsing, not a business-rule API; `typeOptions` controls display only and never limits the entered value.

### Callback error popovers

By default, DataTable catches synchronous throws and rejections of Promises returned by `onValueChange` or `onValueCommitted`. The affected cell receives an error outline and an error icon, and each new failure automatically opens its popover without moving focus — even if an asynchronous failure arrives after you have moved to another cell. The close button dismisses only the details, retaining the draft and error; the same failure does not reopen merely on rerender or refocus. Click the icon, or press **Alt+ArrowDown** while focused in the cell, to reopen the details. Alt+ArrowDown also moves focus into details that are already open. The error state is exposed through `aria-invalid` and an associated description. Opening or using the error popover is not an ordinary editor blur: it does not confirm or discard the draft merely to inspect the error.

No extra configuration is needed for the standard UI. It displays a non-empty message only for `CellEditError`, a native `Error` subclass exported from the package root. Ordinary errors, other thrown values, and empty `CellEditError` messages display the localized message “An error occurred” in both the popover and its accessible description. It never serializes arbitrary thrown values or displays a stack trace. Use `CellEditError` only for messages that are safe to show to users. Translate in consumer code, for example `throw new CellEditError(t("quantityRequired"))`; DataTable displays that message as provided and never treats it as a translation key. The standard popover adds no reset or rollback action. Consumer-owned actions can be included in `error.render` when appropriate.

```tsx
edit: {
  onValueCommitted: async (row, value) => {
    if (value === null) throw new CellEditError("Enter a quantity");
    await saveReceived(row.id, value);
    setLines((current) =>
      current.map((line) => (line.id === row.id ? { ...line, received: value } : line)),
    );
  },
}
```

`saveReceived` is the screen's persistence function. DataTable keeps the raw draft while the returned Promise is pending. Successful completion clears that draft and displays the latest consumer-provided `data`; rejection retains the same draft with its error for correction, an explicit Enter retry, or cancellation. Only successful confirmation ends the edit. Repeated Enter or a subsequent blur does not invoke an in-flight confirmation again. This delays **edit completion**, not focus navigation, and does not add a save mode, automatic retry, optimistic row state, or automatic persistence.

To customize the body, provide `error.render`. Its `error` is the original thrown value, unchanged and typed as `unknown`, because JavaScript can throw any value; `row` is the cell's current row. Custom content owns its message-safety policy; narrow to `CellEditError` before displaying its message to follow the standard UI's policy. Popover placement, open/close behavior, and the error indicator remain owned by DataTable. The body may include consumer-owned links or buttons; DataTable adds only the close button alongside it.

```tsx
error: {
  render: ({ row, error }) => (
    <div>
      <p>Could not update row {row.id}</p>
      <p>{error instanceof CellEditError ? error.message : "Please try again later"}</p>
    </div>
  ),
}
```

The renderer is called only when a callback failure exists. Returning `null` hides its content, not the captured error state. This API has no presentation `type`, inline rendering, or `cellContent` context.

Pass `error: false` when the screen owns error handling entirely:

```tsx
edit: {
  onValueCommitted: handleCommitWithOwnFeedback,
  error: false,
}
```

With `false`, DataTable preserves eager edit completion: it clears the draft before invoking the confirmation callback, does not intercept synchronous exceptions, and does not observe returned Promises. Handle failures in the callback rather than relying on a hidden error state. Neither `error: true` nor `error: {}` is needed or accepted. Switching between `error: false` and handled mode remounts the editor, discarding its local session and invalidating old results.

The cell's editing session is either idle, editing a draft, confirming that draft, or retaining a failed draft with its error. **An error never exists without its target draft.** New input clears the previous failure and invalidates older asynchronous results. A failed `onValueChange` prevents `onValueCommitted` from running; a pending change check must succeed first. A failed commit can be retried without losing its draft. Esc atomically discards the draft and error, restores the latest data, and invalidates pending results. Unmount discards the whole session; it is not persisted across page changes. Existing malformed-number feedback keeps its existing Enter/Tab and blur behavior.

Only the returned Promise is observable. A detached operation such as `void saveReceived(...)` is outside this lifecycle; return or await the operation from the callback. The callback types remain `=> void` for compatibility with existing handlers, including async functions; successful return values are ignored. A stale completion cannot clear a newer draft, replace its error, or finish its editor. This protection does not cancel requests, undo callback side effects, roll back optimistic writes, or prevent the consumer from writing stale data, so keep the screen's own request revision or conflict handling when needed.

**Callback completion and adoption are distinct.** `onValueCommitted` is the confirmation attempt, not a notification that persistence has already succeeded. A normal return or fulfilled Promise completes that attempt; DataTable never adopts the returned value. Returning without adopting a value remains a valid consumer-owned rejection strategy: it completes the edit and returns to current data without a callback error. Throw or reject if the draft should remain available with an error.

### Data ownership and limits

The consumer's `data` is the source of truth for adopted values. Observe drafts in `onValueChange` and adopt values in `onValueCommitted`, optionally after your own validation or normalization. A normal callback completion clears the draft and returns to current data, even when you deliberately leave `data` unchanged. Throwing or returning a rejected Promise instead retains the original draft and its error until correction, successful retry, or cancellation. Tab navigation remains available in either case.

External data updates do not overwrite an active draft or emit draft callbacks themselves. Confirmation and cancellation use the latest data. With no active draft, the display follows data normally. Unmount silently discards internal drafts and callback errors without either callback; if an ordinary blur occurs before unmount, its normal behavior still applies.

There are no `edit.min`, `max`, `maxDecimals`, `required`, `validate`, or `schema` options. Required-field handling, validation rules, saving, optimistic updates, rollback, and save indicators belong to the screen. DataTable coordinates the local editing lifecycle around callback success or failure; it does not implement business rules or coordinate persistence. There is no built-in unsaved-changes or leave-page guard.

Editing does not re-run sorting or filtering: rows stay in place until the consumer supplies changed query data. Update only the changed field when persisting, and keep local rows current so later edits, row actions, and bulk actions see the intended data. Conflict resolution, consumer-state rollback, draft persistence across unmounts, and navigation guards remain outside DataTable's responsibility.

For a different editor or validation experience, leave `edit` unset and use the existing cell `render` escape hatch. A `render` supplied alongside `edit` customizes the adopted value's display, not the active draft or built-in editor. Multi-value badge editing, a custom-editor option within `edit`, multi-cell paste, fill-down, and undo history are not provided.

### Consumer-owned saving patterns

DataTable has no save modes, shared saving hook, built-in Save controls, or validation framework. The following are page-level patterns. Both examples use `onValueCommitted`; neither treats observing `onValueChange` as adopting or saving a value.

Both examples use these imports:

```tsx
import { useRef, useState } from "react";
import { Button, DataTable, createColumnHelper, useDataTable } from "@tailor-platform/app-shell";
```

Their simulated persistence rejects quantity `13` so error handling can be tried without a backend. Replace it with your application's API.

#### Immediate saving

Validate the confirmed value, adopt it with a functional field update, then persist only that field. This example permits later edits while saves are pending. A per-row request revision prevents a stale failure from rolling back a newer edit; rollback also patches only this field, preserving changes to other fields. This pattern handles its own feedback rather than throwing to the cell popover. Saved-value tracking and in-flight status remain consumer-owned.

Revision checks protect local UI updates, not server write ordering or external conflicts. For a real API, serialize writes to the same field or use server-side version checks, and reconcile/refetch after uncertain outcomes. The [goods-receipt showcase](../../examples/vite-app/src/pages/showcase/data-table-lab/inline-editing-demo.tsx) demonstrates the same ownership boundary across editor types.

<!-- example: immediate-saving | A minimal consumer-owned field save with validation, optimistic adoption, feedback, and stale-failure-safe rollback. -->

#### Collect then submit

Confirmed values update local draft rows. Save validates those rows and persists the batch; Cancel restores the last saved rows. The page disables editing while its batch is saving to avoid replacing a later local edit with an older save result.

This batch collects **confirmed/adopted row values**, not unfinished, pending, or failed input inside editors. Save does not automatically gather drafts, wait for pending cell callbacks, or validate the table. An ordinary blur may confirm a valid direct input before a button click; malformed numeric blur discards that input. Clicking outside a dropdown or date-time picker cancels an ordinary unfinished search/edit, but a pending or failed candidate remains in its cell and is not part of the batch. Tell users to resolve and successfully confirm edits first; if your workflow needs to submit all unfinished inputs as one coordinated form, use the `render` escape hatch or a dedicated form instead.

<!-- example: collect-then-submit | Local confirmed rows with consumer-owned Save validation, batch persistence, error feedback, and Cancel restoring saved rows. -->

## Row selection

Pass `rowSelection` to `useDataTable` to enable the checkbox column. Rows must have a string or number `id`; selected ids are their string-normalized values, and rows without an id are excluded. An empty configuration (`rowSelection: {}`) enables uncontrolled selection without a notification callback. Bulk actions belong in `rowSelection.actions`; `rowSelection: { actions: [] }` still enables checkboxes, but does not show the bulk-action bar.

### `RowSelectionOptions`

| Property             | Type                      | Description                                                                                                    |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `selectedIds`        | `string[]`                | Controlled selected ids. Requires `onChange` and cannot be combined with `defaultSelectedIds`.                 |
| `defaultSelectedIds` | `string[]`                | Initial selected ids in uncontrolled mode. Later changes are ignored.                                          |
| `onChange`           | `(ids: string[]) => void` | Notifies user-driven selection changes; required in controlled mode and optional in uncontrolled mode.         |
| `actions`            | `SelectionAction[]`       | Optional bulk actions shown in `DataTable.Footer` while ids are selected. Omitted or empty arrays show no bar. |

### Controlled selection

Provide `selectedIds` and `onChange` together to own the selection. The `RowSelectionOptions` type requires `onChange` in controlled mode and rejects combining `selectedIds` with `defaultSelectedIds`.

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);

const table = useDataTable<Order>({
  columns,
  data,
  rowSelection: { selectedIds, onChange: setSelectedIds },
});
```

Commands such as `toggleRowSelection(row)` request a new array through `onChange`; the rendered selection changes only when the owner updates `selectedIds`. Each command derives from the current committed value, so multiple commands before the owner commits share the same base. Compute batched changes yourself and set `selectedIds` directly instead of issuing repeated commands.

### Uncontrolled selection

Omit `selectedIds` to let the table own selection state. `defaultSelectedIds` initializes it only when the hook mounts; later changes to that default do not reset selection. `onChange` is optional.

```tsx
const table = useDataTable<Order>({
  columns,
  data,
  rowSelection: { defaultSelectedIds: ["INV-1001"] },
});
```

Keep the controlled/uncontrolled mode stable while mounted. Callbacks notify user-driven selection changes, not mounting or external `selectedIds` updates. `onSelectionChange` is deprecated but remains supported for compatibility. Replace `onSelectionChange: handleSelectionChange` with `rowSelection: { onChange: handleSelectionChange }` to keep uncontrolled notification behavior. `rowSelection.onChange` takes precedence when both callbacks are supplied, and `onSelectionChange` is used when the new configuration has no callback.

Selection spans pages. The header checkbox adds or removes only the current page's rows, preserving ids selected on other pages; `clearSelection()` clears every page. Selection stores IDs only, not row objects. Both `selectedIds` and bulk-action payloads include all selected ids, including ids whose rows have not been loaded. Fetch any records required for eligibility checks or execution in the consumer's ID-based workflow.

## Selection actions

Pass `rowSelection.actions` to `useDataTable` and, while at least one id is selected, `DataTable.Footer` becomes a bulk-action bar: the selection count, your actions, and a **Clear** button, with the footer's own children (usually `DataTable.Pagination`) kept alongside. `rowSelection: { actions }` enables uncontrolled selection without an `onChange` callback. Omitted or empty `actions` show no bar, while the `rowSelection` object still enables checkboxes. There is nothing new to compose in JSX — just keep `DataTable.Footer` in the tree.

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);

const table = useDataTable<Vendor>({
  columns,
  data,
  control,
  rowSelection: {
    selectedIds,
    onChange: setSelectedIds,
    actions: [
      {
        id: "delete",
        label: "Delete",
        variant: "destructive",
        onClick: (ids) => setDeleteTargetIds([...ids]),
      },
    ],
  },
});

return (
  <>
    <DataTable.Root value={table}>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination />
      </DataTable.Footer>
    </DataTable.Root>

    {deleteTargetIds !== null && (
      <DeleteVendorsDialog
        ids={deleteTargetIds}
        onCancel={() => setDeleteTargetIds(null)}
        onDeleted={(deletedIds: string[]) => {
          const deleted = new Set(deletedIds);
          setSelectedIds((current) => current.filter((id) => !deleted.has(id)));
          setDeleteTargetIds(null);
        }}
      />
    )}
  </>
);
```

`DeleteVendorsDialog` is a consumer-owned component, not an AppShell component. It can fetch the target records, explain eligibility (for example, “Three of five selected vendors can be deleted; two are in use”), confirm, and execute. Backend validation remains authoritative; `onDeleted` reports only ids actually deleted. Removing those ids from the **current** selection preserves ineligible records and records selected after the dialog opened. Cancellation or failure leaves selection unchanged.

- **`onClick` receives a click-time snapshot of all selected ids.** The array is a copy, in selection order, including ids whose rows have not been loaded. Page visits and loaded-row availability do not change the target. Selection actions have no row-based `canApply`, automatic eligible count, or eligibility-based disabled state; the consumer owns eligibility checks, required fetching, confirmation UI, and execution. Row actions can still use `canApply` for their concrete row.
- **Return the promise from `onClick`.** While it is pending, the bar disables every action and shows a spinner on the running one, so a slow request can't be fired twice. Neither success nor rejection changes selection; there is no `keepSelection` option. A rejection is logged as `[DataTable] Selection action "…" failed`; showing it to the user is up to your handler.
- **Confirm dialogs can hand a later request back with `run`.** An `onClick` that only opens a dialog returns nothing. Keep the `run` helper and call it from the dialog's confirm button — `await run(deleteVendors(ids))` — to track that request in the bar. This only tracks pending state; it does not clear selection. Clear is disabled while a request is pending, and pending state survives the bar closing and reopening. Use controlled `rowSelection` to remove only successful ids, or call the explicit `clearSelection` helper if clearing every page is intentional.
- **Selection spans pages.** The header checkbox adds or removes only the current page; **Clear** empties everything.
- **Three actions stay inline.** The fourth onward collapse into a **More actions** menu, in array order. Put the most frequent first; a destructive action placed last sits safely in the menu.
- **Confirm destructive actions.** `variant: "destructive"` only styles the action. Open a confirm dialog from `onClick` before deleting — see the [confirm pattern](../patterns/interaction-confirm.md).
- **The bar stays reachable.** In `<Layout fill>` the footer is already pinned. On a page that scrolls, the bar sticks to the bottom of the viewport while rows are selected and settles back into place at the end of the table. It sticks to the nearest scrolling container: inside a scrolling drawer or panel it rides that container instead, and inside a wrapper that clips its overflow (such as a card with `overflow: hidden`) it simply stays in the footer.
- **Share presentation with `rowActions`.** Both action types extend the non-generic [`DataTableAction`](#datatableaction) (`id`, `label`, `icon`, `variant`). Keep row predicates on `RowAction<TRow>` and bulk business rules in the consumer's ID-based handler.

### Accessibility

The bar is a `role="toolbar"` named "Bulk actions", so Arrow, Home, and End move between its controls (see [`Toolbar`](./toolbar.md)) while Tab still reaches each one. The selection count is announced through a polite live region from the first selection on. When the bar closes while focus is inside it — after **Clear**, or an action that clears — focus returns to the header checkbox instead of dropping to `<body>`.

## `useDataTable`

Creates the table state object to pass to `DataTable.Root`. The hook return value and `useDataTableContext()` both expose the original selection configuration as `rowSelection`, including `rowSelection.actions`. Read the current selection from `selectedIds` and update it through the selection commands.

```tsx
const table = useDataTable({
  columns,
  data,
  loading,
  control,
});
```

### Options

| Option              | Type                               | Description                                                                                                                                                                                              |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`           | `Column<TRow>[]`                   | Column definitions. Required.                                                                                                                                                                            |
| `data`              | `DataTableData<TRow> \| undefined` | Fetched data. Pass `undefined` while loading.                                                                                                                                                            |
| `loading`           | `boolean`                          | When `true`, renders a loading skeleton.                                                                                                                                                                 |
| `error`             | `Error \| null`                    | When set, renders an error message in the table body.                                                                                                                                                    |
| `control`           | `CollectionControl`                | Collection control from `useCollectionVariables()`. Required for `DataTable.Pagination` and `DataTable.Filters`.                                                                                         |
| `onClickRow`        | `(row: TRow) => void`              | Called when the user clicks a row. Adds a pointer cursor to rows.                                                                                                                                        |
| `tableId`           | `string`                           | Stable id used to persist per-user column layout (visibility, order, pinning) to `localStorage`. When omitted, column layout is in-memory only and resets on reload.                                     |
| `rowActions`        | `RowAction<TRow>[]`                | Per-row action items rendered in a kebab-menu column. The column is omitted when empty or not provided.                                                                                                  |
| `rowSelection`      | `RowSelectionOptions`              | Controlled `selectedIds` + `onChange`, or uncontrolled `defaultSelectedIds` + optional `onChange`, with optional `actions`. Providing even `{}` enables checkboxes. See [Row selection](#row-selection). |
| `onSelectionChange` | `(ids: string[]) => void`          | **Deprecated:** use `rowSelection.onChange`. Still supported for compatibility; enables checkboxes and is used when the new callback is absent.                                                          |
| `rowExpansion`      | `RowExpansionOptions<TRow>`        | Expandable detail rows: `render`, plus optional `canExpand` / `getLabel`, and `expandedIds` + `onChange` together for controlled mode. See [Expandable rows](#expandable-rows).                          |
| `sort`              | `false \| { multiple?: boolean }`  | Sort behaviour. `false` disables sorting entirely. `{ multiple: true }` enables multi-column sorting. Omit or pass `{}` for single-column sort (default).                                                |

### `DataTableData`

| Property   | Type             | Description                                                          |
| ---------- | ---------------- | -------------------------------------------------------------------- |
| `rows`     | `TRow[]`         | Row data to display.                                                 |
| `pageInfo` | `PageInfo`       | Cursor pagination info from the API.                                 |
| `total`    | `number \| null` | Total record count. Used for First/Last navigation and page counter. |

## `Column`

A column definition passed to `useDataTable`. `Column<TRow>` is a discriminated union on `type` — the shapes of `typeOptions`, `accessor`, and optional `edit` are narrowed per branch, so mismatches are compile errors rather than silent runtime no-ops. See [Inline editing](#inline-editing) for typed editors and their change-notification contract.

### Shared fields

| Property   | Type                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`                                                    | Column header text. Omit for icon-only columns.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `header`   | `(ctx: HeaderRenderContext) => ReactNode`                   | Custom header renderer. Presentation only. When omitted, the built-in header renders `label` and owns the sort button/indicator. When provided, the return value replaces the built-in header entirely; sortable custom headers receive `sortDirection` and `activateSort()` via `ctx` and must render their own click surface for left-click sorting. The header context menu still uses the column metadata (`label`, `sort`, etc.).                                                                            |
| `footer`   | `string \| ((ctx: FooterRenderContext<TRow>) => ReactNode)` | Optional static string or column footer renderer. Renderers receive current `data.rows` (the current page, not selected rows or all records). Enables the automatic sticky `<tfoot>` row; no default content or typed formatting is applied. See [Column footers](#column-footers).                                                                                                                                                                                                                               |
| `render`   | `(row: TRow) => ReactNode`                                  | Renders the cell content. Presentation only. Optional — overrides the built-in `type` display renderer when set, not an editor configured through `edit`. Leave `edit` unset to draw your own editor with `render`. Built-in behaviors that need the raw value (truncate tooltip, cell copy/filter context-menu actions) still resolve it from `accessor` first, then `row[col.id]`, and only fall back to the return value of `render(row)` when it is a primitive (`string`, `number`, `boolean`, or `bigint`). |
| `id`       | `string`                                                    | Stable identifier for column visibility, persisted layout state, raw-value fallback (`row[col.id]`), and the React key. Falls back to `label` when omitted. Set this explicitly when `label` is absent, not unique, or when a custom-rendered column should still participate in built-in cell behaviors that need a raw value.                                                                                                                                                                                   |
| `width`    | `number`                                                    | Fixed column width in pixels. Optional.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pin`      | `"left" \| "right"`                                         | Freezes the column to that edge so it stays visible during horizontal scroll (the default; the user can override it via the toolbar's column-settings control). Sticky offsets are measured from the rendered layout, so `width` isn't required — but setting `width` on pinned columns is recommended for stable sizing. The selection and expand columns auto-pin left and the row-actions column auto-pin right.                                                                                               |
| `align`    | `"left" \| "right"`                                         | Horizontal alignment. Defaults to `"right"` for `type: "number"` and `type: "money"`; `"left"` otherwise. Pass `"left"` to opt a numeric column out.                                                                                                                                                                                                                                                                                                                                                              |
| `truncate` | `boolean`                                                   | Truncate overflowing text with an ellipsis. Wires up an app-shell `<Tooltip>` automatically when the resolved raw cell value is a string or number (`accessor` first, then `row[col.id]`). With `inferColumns`, no explicit `accessor` is needed because `id` is pinned to the field name. Requires another column to anchor the row width (`width` on a neighbor, or a fixed-size column like selection / row actions).                                                                                          |
| `accessor` | _(narrowed per `type`)_                                     | Extracts the raw value. This is the primary source of truth for built-in behaviors that need a value independent of presentation (typed rendering, truncate tooltip, cell copy/filter context-menu actions). The return type is narrowed per `type` branch — returning an array is a compile error on all typed columns except `badge`, and returning a plain object is a compile error on all typed columns. Untyped columns (`type` omitted) retain `unknown`. `null` and `undefined` are always allowed.       |
| `sort`     | `SortConfig`                                                | Sort configuration. When set, the column participates in the built-in sort behaviors: the default clickable header and the header context-menu sort submenu. Custom headers still need to call `ctx.activateSort()` to opt into left-click sorting.                                                                                                                                                                                                                                                               |
| `filter`   | `FilterConfig`                                              | Filter configuration. When set, the column appears as an option in `DataTable.Filters` and can also drive the cell **Add filter** context-menu submenu when collection `control` is available. The cell menu narrows this to single-value operators only.                                                                                                                                                                                                                                                         |

### `type`-specific fields

| `type`      | `typeOptions`                                                | Optional `edit`               |
| ----------- | ------------------------------------------------------------ | ----------------------------- |
| _(omitted)_ | _(not allowed; provide `render` to draw the cell)_           | _(not allowed)_               |
| `"text"`    | _(not allowed)_                                              | `TextCellEditOptions<TRow>`   |
| `"number"`  | `NumberCellOptions`                                          | `NumberCellEditOptions<TRow>` |
| `"money"`   | `MoneyCellOptions<TRow>`                                     | `NumberCellEditOptions<TRow>` |
| `"date"`    | `DateCellOptions`                                            | `DateCellEditOptions<TRow>`   |
| `"badge"`   | `BadgeCellOptions`                                           | `BadgeCellEditOptions<TRow>`  |
| `"link"`    | **Required** — `LinkCellOptions<TRow>` (must include `href`) | `TextCellEditOptions<TRow>`   |

## Cell types

When `type` is set, the cell is rendered from `accessor(row)` (or `row[id]` when `accessor` is omitted) using a built-in renderer. Pass `render` to override on a per-column basis.

```tsx
column({
  label: "Total",
  accessor: (row) => row.total,
  type: "money",
  typeOptions: { currency: "USD", maxDecimals: 4 },
});
```

| `type`   | Accessor return type                                                                     | Value handling                                                            | Options interface                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `text`   | `string \| number \| boolean \| bigint \| null \| undefined`                             | `String(value)` — falls back to `—` when nullish.                         | _(no options)_                                                                                                                |
| `number` | `number \| null \| undefined`                                                            | `Intl.NumberFormat`. `—` for nullish / NaN.                               | `NumberCellOptions`: `minDecimals`, `maxDecimals`, `locale`                                                                   |
| `money`  | `number \| null \| undefined`                                                            | `Intl.NumberFormat` currency. `—` for nullish.                            | `MoneyCellOptions<TRow>`: `currency` (string or `(row) => string`), `maxDecimals`, `locale`                                   |
| `date`   | `Date \| string \| number \| null \| undefined`                                          | `Intl.DateTimeFormat`. Accepts `Date`/ISO/epoch.                          | `DateCellOptions`: `dateFormat` (`"short"` \| `"long"` \| `"datetime"`), `locale`                                             |
| `badge`  | `string \| number \| boolean \| null \| undefined \| Array<string \| number \| boolean>` | `<Badge>` keyed off the stringified value. Arrays render multiple badges. | `BadgeCellOptions`: `badgeVariantMap`, `badgeLabelMap`, `defaultBadgeVariant` (defaults to `"outline-neutral"`), `maxVisible` |
| `link`   | `string \| number \| boolean \| null \| undefined`                                       | app-shell `<Link>` to `typeOptions.href(row)`.                            | `LinkCellOptions<TRow>`: `href: (row) => string \| null \| undefined` (returning nullish renders plain text; **required**)    |

Empty values (`null`, `undefined`, `""`) render a muted `—` placeholder for every type. Use `render` for custom empty-state handling.

The discriminated-union shape means:

```tsx
// ❌ Compile error — badgeVariantMap is not a money option
column({ type: "money", accessor: (r) => r.total, typeOptions: { badgeVariantMap: {} } });

// ❌ Compile error — link columns must provide typeOptions.href
column({ type: "link", accessor: (r) => r.title });

// ❌ Compile error — text columns reject typeOptions entirely
column({ type: "text", accessor: (r) => r.title, typeOptions: { locale: "en-US" } });

// ❌ Compile error — text/number/money/link accessor cannot return an array or object
column({ type: "text", accessor: (row) => row.tags }); // row.tags is string[]
column({ type: "number", accessor: (row) => row.meta }); // row.meta is an object
```

## Adding a typed column

Each column type follows the same three-step shape: pick a `type`, point `accessor` at the value, and pass `typeOptions` for the type-specific bits. `label`, `sort`, `filter`, `align`, `width`, and `id` work the same regardless of `type`.

### `text` — plain string

```tsx
column({
  label: "Name",
  accessor: (row) => row.name,
  type: "text",
});
```

- `null` / `undefined` / `""` render a muted `—`.
- No `typeOptions` are accepted on `text` columns.
- Omit `type` entirely if you want to keep `render` required for that column.

### `number` — locale-formatted number

```tsx
column({
  label: "Stock",
  accessor: (row) => row.stockOnHand,
  type: "number",
  typeOptions: { minDecimals: 0, maxDecimals: 0, locale: "en-US" },
});
```

- `minDecimals` / `maxDecimals` default to `0`.
- `maxDecimals` defaults to `minDecimals` when only `minDecimals` is set — pass both for ranges (e.g. `min: 2, max: 4`).
- `NaN` and `null` render the `—` placeholder.

### `money` — currency

```tsx
column({
  label: "Total",
  accessor: (row) => row.total,
  type: "money",
  typeOptions: { currency: "USD" },
});
```

For mixed-currency tables, read `currency` from the row:

```tsx
column({
  label: "Total",
  accessor: (row) => row.total,
  type: "money",
  typeOptions: {
    currency: (row) => row.currencyCode, // "USD", "JPY", "EUR", …
    maxDecimals: 4, // raise the cap above the currency default
  },
});
```

- Default `currency` is `"USD"` when omitted or when the accessor returns falsy.
- Invalid ISO codes fall back to USD (rather than throwing).
- The minimum decimals always stays at the currency default (2 for USD, 0 for JPY); `maxDecimals` raises the cap without padding with trailing zeros.

### `date` — formatted date

```tsx
column({
  label: "Placed",
  accessor: (row) => row.placedAt, // Date | ISO string | epoch ms
  type: "date",
  typeOptions: { dateFormat: "short" }, // "short" | "long" | "datetime"
});
```

| `dateFormat`        | Example output         |
| ------------------- | ---------------------- |
| `"short"` (default) | `Apr 9, 2026`          |
| `"long"`            | `April 9, 2026`        |
| `"datetime"`        | `Apr 9, 2026, 3:45 PM` |

- Accepts a `Date`, an ISO 8601 string, or epoch milliseconds.
- Invalid dates render the `—` placeholder.

### `badge` — status pill

```tsx
column({
  label: "Status",
  accessor: (row) => row.status,
  type: "badge",
  typeOptions: {
    badgeVariantMap: {
      shipped: "success",
      processing: "outline-warning",
      cancelled: "subtle-error",
    },
    badgeLabelMap: {
      shipped: "Shipped",
      processing: "Processing",
      cancelled: "Cancelled",
    },
    defaultBadgeVariant: "outline-neutral", // unmapped values fall back here
  },
});
```

- The cell value is stringified before lookup, so `accessor` can return strings, numbers, or booleans.
- `accessor` may also return an **array** of values — each item is rendered as a separate badge.
- Unmapped values render with `defaultBadgeVariant` (or `"outline-neutral"`) and the raw stringified value as the label.

#### Array badges with overflow

Use `maxVisible` to cap the number of badges shown. Extra values are hidden behind a hover popover:

```tsx
column({
  ...infer("tags"),
  type: "badge",
  typeOptions: {
    badgeVariantMap: { Premium: "warning", Office: "outline-info" },
    maxVisible: 2,
  },
});
```

### `link` — clickable text

```tsx
column({
  label: "Order",
  accessor: (row) => row.reference,
  type: "link",
  typeOptions: { href: (row) => `/orders/${row.id}` },
});
```

- `href` is **required** on `link` columns — it's enforced by the type.
- Returning `null` / `undefined` from `href` renders the cell value as plain text (useful for "no detail page yet" rows).
- Uses the app-shell `<Link>` (react-router) so SPA navigation is preserved. For external URLs, fall back to `render` with a plain `<a>`.

### Overriding a built-in renderer

`render` always wins over the built-in renderer, so the escape hatch stays open per column:

```tsx
column({
  label: "Status",
  accessor: (row) => row.status,
  type: "badge",
  typeOptions: { badgeVariantMap: { active: "success" } },
  // Custom render with an icon — type/typeOptions are still required for
  // sort/filter scaffolding but are bypassed for rendering.
  render: (row) => (
    <span className="flex items-center gap-1">
      <CircleCheck className="size-3" />
      {row.status}
    </span>
  ),
});
```

### Combining `type` with `inferColumns`

`inferColumns` (from `@tailor-platform/sdk-plugin-app-shell`) derives `label`, `sort`, `filter`, and `id` from TailorDB metadata. You can layer a `type` on top to get a built-in renderer without losing the inferred sort/filter config:

```tsx
const infer = inferColumns(tableMetadata.order);

const columns = [
  // Inferred column — displays row[id] as plain text
  column(infer("reference")),

  // Inferred datetime column, swapped to a `date` cell with long format
  column({
    ...infer("placedAt"),
    type: "date",
    typeOptions: { dateFormat: "long" },
    accessor: (row) => row.placedAt,
  }),

  // Inferred enum column, rendered as a badge
  column({
    ...infer("status"),
    type: "badge",
    accessor: (row) => row.status,
    typeOptions: {
      badgeVariantMap: { active: "success", draft: "neutral" },
    },
  }),
];
```

When you spread `...infer("field")`, add `accessor` when you want a typed renderer to read a specific value — built-in renderers read from `accessor` (or `row[id]`).

## `FilterConfig`

The `filter` property on a column accepts the same base shape as `FilterConfig`, plus a DataTable-only `operators` allowlist. When set, the column becomes filterable in `DataTable.Filters` — available in the **Add filter** panel, and rendered as a segmented chip once active.

| Property    | Type                                             | Description                                                                                                    |
| ----------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `field`     | `string`                                         | API field name used in the generated query input.                                                              |
| `type`      | `FilterType`                                     | Filter editor type (see table below).                                                                          |
| `options`   | `SelectOption[]`                                 | Required when `type` is `"enum"`. List of selectable values.                                                   |
| `operators` | `readonly [FilterOperator, ...FilterOperator[]]` | Optional non-empty DataTable UI allowlist. Order controls menu order and, when provided, the default operator. |

`operators` only narrows what the built-in DataTable filter UI shows. Programmatic `CollectionControl.addFilter(...)`, URL state, and saved/persisted filters still use the broader backend operator set. When `operators` is omitted, the built-in UI keeps the normal default for that field type (for example, string fields still default to `contains`).

### Adding and editing filters

`DataTable.Filters` renders active filters as segmented chips followed by an **Add filter** button:

- **Add filter panel** — a single popover laid out in up to three columns: **field ▸ condition ▸ value**. The condition column appears for fields with more than one operator (number, date/time, string); single-operator fields (enum, uuid) go straight to the value. Enter a value and click **Apply**; the panel stays open so several filters can be added in a row.
- **Segmented chip** — each active filter shows `field │ operator │ value │ ✕`. The operator segment opens a searchable dropdown to change the condition; the value segment reopens the type-specific editor; `✕` removes the filter. Multi-select enum values are summarized as "N items" (e.g. "2 statuses").

### Filter Types and Operators

| Type       | Input editor                 | Supported operators                                                                                          |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `string`   | Text                         | `eq`, `ne`, `contains`, `notContains`, `hasPrefix`, `hasSuffix`, `notHasPrefix`, `notHasSuffix`, `in`, `nin` |
| `number`   | Number                       | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `decimal`  | Decimal text (string value)  | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `datetime` | Calendar / DatePicker + Time | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `date`     | **Calendar / DatePicker**    | `eq` (_exact date_), `gte` (_after_), `lte` (_before_), **`between`**                                        |
| `time`     | Time                         | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `enum`     | Dropdown                     | `eq`, `ne`, `in`, `nin`                                                                                      |
| `boolean`  | Toggle                       | `eq`, `ne`                                                                                                   |
| `uuid`     | Text                         | `eq`, `ne`, `in`, `nin`                                                                                      |

When the `between` operator is selected on a `number`, `decimal`, `datetime`, `date`, or `time` column, the value editor renders a range input with **min**/**max** (or **From**/**To** for dates) bounds.

### Decimal Filters

TailorDB `db.decimal()` fields are generated as metadata `type: "decimal"`. They support numeric sort and filter operators, but values remain **strings**, matching the GraphQL `Decimal` scalar without JavaScript number rounding. Scalar filters, `in`/`nin` arrays, and `between` bounds all use strings in `variables.query`.

The editor accepts signed decimal and scientific notation (for example, `"9007199254740993.123456789"` or `"1.23e-10"`) and checks range ordering without rounding. Sorting is delegated to the backend. As with `number`, `in`/`nin` are available programmatically, not in the built-in editor.

Regenerate metadata with the updated SDK plugin to replace older decimal fields marked as `"number"`. Decimal metadata does not select a numeric cell renderer; the default text rendering preserves the original value.

### Datetime Filters and Business Timezones

> **Important:** Set [`AppShell.timeZone`](./app-shell.md#timezone) explicitly when datetime filters must follow a shared business timezone. Without it, the filter editors use each user's local timezone. Users in different timezones can enter the same date and time but search against different instants, causing expected records to be missed. Setting `locale` alone does **not** set the timezone.

`locale` and `timeZone` are independent:

| Setting    | Controls                                                                             | Example        |
| ---------- | ------------------------------------------------------------------------------------ | -------------- |
| `locale`   | UI language and locale-specific date/time formatting                                 | `"ja-JP"`      |
| `timeZone` | The timezone used to interpret the date and time selected in datetime filter editors | `"Asia/Tokyo"` |

For example, a Japanese-language application can use a US business timezone. Choose the timezone that defines the business's date boundaries, not one inferred from the UI language or the user's location:

```tsx
import { AppShell } from "@tailor-platform/app-shell";

<AppShell modules={modules} locale="ja-JP" timeZone="America/New_York">
  {/* Existing application content */}
</AppShell>;
```

Use an IANA timezone such as `"Asia/Tokyo"` or `"America/New_York"`, rather than a fixed UTC offset, so daylight-saving changes are accounted for. If per-user local-time filtering is intentional, leave `timeZone` unset; otherwise, configure the shared business timezone even when every user has the same `locale`.

#### Local input, RFC 3339 output

The datetime editor shows the date and time in the configured timezone, but sends an **instant** — a specific point in time — as an RFC 3339 UTC string. For example, the same input `2026-10-09 00:00` produces:

| Timezone used by the editor | Serialized filter value    |
| --------------------------- | -------------------------- |
| `Asia/Tokyo`                | `2026-10-08T15:00:00.000Z` |
| `America/New_York`          | `2026-10-09T04:00:00.000Z` |

Applying or updating a datetime filter through `DataTable.Filters` passes these strings to `CollectionControl.addFilter`, so consumers reading `control.filters` receive UTC instants rather than timezone-less local datetime strings. A `between` filter serializes both `min` and `max` as instants. Existing RFC 3339 values are displayed in the editor's timezone without changing the instant they represent. `date` and `time` filters retain their `YYYY-MM-DD` and `HH:mm` formats.

A datetime `eq` filter matches one instant, not every record on a calendar day. To search a whole business day on a datetime field, use the start of that day as an inclusive lower bound and the start of the next day as an exclusive upper bound in the backend query. Calculate both boundaries in the business timezone; do not assume every day is exactly 24 hours.

When `tableMetadata` is supplied to `useCollectionVariables` or `useURLCollectionVariables`, datetime filters are normalized before the first query and before `addFilter` or `setFilters` updates the state. This also covers filters restored from URLs or saved views. Timezone-less legacy datetime strings are interpreted in the AppShell timezone; values with `Z` or an explicit offset retain their original instant. Single values, `in` / `nin` arrays, and both bounds of `between` filters are normalized. Invalid datetime values throw a `TypeError` rather than silently removing a search constraint; invalid updates leave the previous filter state unchanged. Datetime strings must use the ISO date-and-time form with `T`; date-only strings and browser-specific date formats are not accepted for datetime fields. If migrating legacy values, first establish which timezone they originally represented.

Without `tableMetadata`, the collection hook cannot distinguish datetime fields from ordinary strings and leaves filter values unchanged. Supply RFC 3339 datetime values with an explicit timezone in programmatic or persisted filters on this path. Setting a DataTable column's `filter.type` configures the UI but does not supply metadata to the collection hook.

Built-in `type: "date"` cells display timestamps in the AppShell timezone, and the cell menu uses that same timezone when adding a temporal filter. Date-only `YYYY-MM-DD` cell values retain their calendar date instead of shifting to the previous or next day. The setting does not change the browser's default timezone: when using `Intl.DateTimeFormat` in a custom cell renderer, pass the same timezone explicitly if its output must agree with the filters.

#### Calendar dates are not instants

Use the `date` field/filter type for values whose meaning is a calendar date, such as a purchase-order date or an accounting date. `2026-10-09` should remain that date regardless of where the user is located. Use `datetime` for events that occurred at a particular instant, such as a record's creation time.

If an existing backend stores document dates as datetime instants, a shared business timezone can make filter boundaries consistent, but it does not fix that data model. Changing only the column's filter type to `date` does not migrate the stored values or change the backend's query contract. Align the backend field type, data, and filters when moving to date-only semantics.

### Date Filters

`date` columns render app-shell date components as the value editor: single-value operators (`eq` / `gte` / `lte`) use an inline `Calendar`, and the `between` range uses two [`DatePicker`](./date-picker.md) **From** / **To** fields. (The range fields are a stopgap — they'll be replaced with a single range calendar once date-range support lands in the date-picker component.) `date` columns also present a friendlier, slimmer operator set:

| Operator  | Label        | Meaning                    |
| --------- | ------------ | -------------------------- |
| `eq`      | _exact date_ | matches that calendar date |
| `gte`     | _after_      | on or after (inclusive)    |
| `lte`     | _before_     | on or before (inclusive)   |
| `between` | _between_    | inclusive min–max range    |

`gt` / `lt` / `ne` are intentionally dropped — the inclusive _after_ / _before_ cover the intent. The filter chip shows the value as a locale-formatted date (e.g. `15 Jun 2026`), and the picker resolves its locale/timezone from the AppShell context. (Only `date` is remapped this way; `datetime` and `time` keep the full numeric operator set. Datetime editors pair a calendar/date picker with a time input; `time` uses a native time input.)

### String Filter Case Sensitivity

String filters are **case-insensitive by default** — they use the Tailor Platform `regex` operator with an `(?i)` prefix. The filter chip renders a **"Case sensitive"** checkbox that lets users opt into exact-case matching.

To control this behavior programmatically, pass `caseSensitive: true` to `CollectionControl.addFilter`:

```tsx
control.addFilter("title", "contains", "acme", { caseSensitive: true });
```

You can also set `caseSensitive` directly on a `Filter` object when using `params.initialFilters` in `useCollectionVariables`:

```tsx
const { variables, control } = useCollectionVariables({
  params: {
    initialFilters: [{ field: "title", operator: "contains", value: "acme", caseSensitive: true }],
  },
});
```

When `caseSensitive` is omitted or `false`, the filter is case-insensitive. When `true`, the filter matches the exact case of the input.

## `RowAction`

A row action in the kebab-menu column. `RowAction<TRow>` extends the non-generic [`DataTableAction`](#datatableaction) (`id`, `label`, `icon`, `variant`) and adds row-based behavior.

| Property     | Type                     | Description                                                                                                                     |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `canApply`   | `(row: TRow) => boolean` | Return `false` to disable the action for a given row.                                                                           |
| `isDisabled` | `(row: TRow) => boolean` | **Deprecated** — use `canApply`, which reads the other way round. Still honoured: the action is disabled if either one says so. |
| `onClick`    | `(row: TRow) => void`    | Called when the action is clicked.                                                                                              |

## `SelectionAction`

A non-generic bulk action for selected ids. Extends [`DataTableAction`](#datatableaction). See [Selection actions](#selection-actions).

| Property  | Type                                                                           | Description                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onClick` | `(ids: string[], helpers: SelectionActionHelpers) => void \| Promise<unknown>` | Receives a copy of all selected ids at click time, including unloaded ids. Return a promise, or pass a later request to `helpers.run`, for pending-state tracking only. Selection is never cleared automatically. |

`SelectionActionHelpers` provides `clearSelection(): void` to explicitly clear every page and `run<T>(request: PromiseLike<T>): PromiseLike<T>` to track a later request without changing selection. Eligibility, fetching, confirmation, execution, and result-based selection updates belong to the consumer.

## `DataTableAction`

Non-generic presentation shared by `RowAction<TRow>` and `SelectionAction`. Share these fields, not eligibility rules: row actions can evaluate a concrete row, while selection actions operate on ids.

| Property  | Type                         | Description                                                                                                   |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`      | `string`                     | Stable identifier for the action.                                                                             |
| `label`   | `string`                     | Display label — the menu item for a row action, the button (or **More actions** item) for a selection action. |
| `icon`    | `ReactNode`                  | Optional icon shown beside the label.                                                                         |
| `variant` | `"default" \| "destructive"` | Visual style. A destructive action still needs its own confirmation step.                                     |

```tsx
const archive: DataTableAction = {
  id: "archive",
  label: "Archive",
};

useDataTable<Order>({
  columns,
  data,
  rowActions: [
    {
      ...archive,
      canApply: (order) => order.status !== "Archived",
      onClick: (order) => archiveOrders([order.id]),
    },
  ],
  rowSelection: {
    actions: [{ ...archive, onClick: (ids) => archiveOrders(ids) }],
  },
});
```

## `createColumnHelper`

Factory that captures the row type once and returns `column` and `inferColumns` with `TRow` already bound. Prefer this over the standalone `column()` function to avoid repeating the generic parameter.

```tsx
const { column, inferColumns } = createColumnHelper<Order>();
```

### `column(options)`

Defines a column with an explicit render function.

```tsx
column({ label: "Name", render: (row) => row.name });
column({ label: "Actions", render: (row) => <button>Edit {row.name}</button> });
```

### `inferColumns(tableMetadata)`

Binds table metadata and returns a per-field column factory. The factory derives `label`, `sort`, `filter` config, and `id` automatically from the field's metadata. `id` is always pinned to the metadata field name — this stabilizes the React key / column-visibility identifier and enables the `truncate` tooltip without an explicit `accessor`. Requires metadata generated by `@tailor-platform/sdk-plugin-app-shell`.

```tsx
const infer = inferColumns(tableMetadata.order);

const columns = [
  column(infer("title")),
  column(infer("status")),
  column({ ...infer("createdAt"), render: (row) => formatDate(row.createdAt) }),
];
```

The factory accepts an optional second argument to override per-column defaults:

| Option   | Type                                                                        | Default                                     | Description                                                                                                                              |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `label`  | `string`                                                                    | Field `description` or `name` from metadata | Override the column header text.                                                                                                         |
| `width`  | `number`                                                                    | —                                           | Fixed column width in pixels.                                                                                                            |
| `sort`   | `boolean`                                                                   | `true`                                      | Set to `false` to suppress the auto-generated sort config.                                                                               |
| `filter` | `boolean \| { operators?: readonly [FilterOperator, ...FilterOperator[]] }` | `true`                                      | Set to `false` to suppress the auto-generated filter config, or pass a non-empty `operators` allowlist to narrow the built-in filter UI. |

Like `column.filter`, `operators` only affects the built-in DataTable UI. Order controls menu order and, when provided, the default operator. Programmatic `CollectionControl.addFilter(...)`, URL state, and saved/persisted filters still accept the broader backend operator set.

## `useCollectionVariables`

Manages collection query state (filters, sort, pagination) and derives `variables` for GraphQL queries.

```tsx
const { variables, control } = useCollectionVariables({
  params: { pageSize: 20 },
});

// variables.pagination → { first, after? } or { last, before? }
// variables.query      → filter input object (undefined when no filters are active)
// variables.order      → sort input array or undefined
```

When you need an object for `Object.keys` or destructuring, use `variables.query ?? {}`.

### Options

| Option                  | Type                                 | Description                                                                                                                                      |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `params.pageSize`       | `number`                             | Initial page size. Default: `20`.                                                                                                                |
| `params.initialFilters` | `Filter[]`                           | Filters applied on first render.                                                                                                                 |
| `params.initialSort`    | `SortState[]`                        | Sort applied on first render.                                                                                                                    |
| `tableMetadata`         | `TableMetadata`                      | Generated table metadata. Enables typed variables and datetime normalization (see [Datetime filters](#datetime-filters-and-business-timezones)). |
| `onParamsChange`        | `(params: CollectionParams) => void` | Called after each filter, sort, or page-size change with the current params.                                                                     |

### Return Value

| Property    | Type                  | Description                                                    |
| ----------- | --------------------- | -------------------------------------------------------------- |
| `variables` | `CollectionVariables` | Derived `query`, `order`, and `pagination` sub-properties.     |
| `control`   | `CollectionControl`   | State and methods for filter, sort, and pagination management. |

`useCollectionVariables` is decoupled from `DataTable` by design — the hook owns only query state and exposes plain variables. Any collection-based view (Kanban, Gantt, custom components) can use the same hook without modification.

### Typed query variables

When using typed GraphQL documents (`TypedDocumentNode`), pass `tableMetadata` to `useCollectionVariables`. This narrows `variables.query` and `variables.order` from `unknown` to the precise types expected by the generated document.

```tsx
import { tableMetadata } from "@/generated/app-shell-datatable.generated";

const { variables, control } = useCollectionVariables({
  tableMetadata: tableMetadata.order,
  params: { pageSize: 20 },
});

// variables.query is now BuildQueryVariables<typeof tableMetadata.order> | undefined
// variables.order is now { field: OrderableFieldName; direction: "Asc" | "Desc" }[]
const [result] = useQuery({
  query: LIST_ORDERS, // TypedDocumentNode — variables are fully type-checked
  variables: {
    ...variables.pagination,
    query: variables.query,
    order: variables.order,
  },
});
```

## `useURLCollectionVariables`

Wraps `useCollectionVariables` with automatic URL persistence. It seeds filter, sort, and page-size state from the current URL search params on mount and writes changes back to the URL as the user interacts with the table — using `replace` navigation so individual interactions don't push new history entries.

Use this instead of `useCollectionVariables` when you want filters, sort, and pagination to survive page refreshes and be shareable via URL.

```tsx
import { useURLCollectionVariables } from "@tailor-platform/app-shell";

const { variables, control } = useURLCollectionVariables({
  tableMetadata,
  params: { pageSize: 20 },
});
```

The return value is identical to `useCollectionVariables` — `variables` and `control`.

### Options

All options accepted by `useCollectionVariables` are accepted here too. `tableMetadata` is optional but recommended for typed variables and correct URL round-tripping of typed field values (numbers and booleans are preserved correctly, and datetime filters are normalized to RFC 3339 instants before querying).

### URL format

| State      | URL key                | Example               |
| ---------- | ---------------------- | --------------------- |
| `pageSize` | `p`                    | `?p=20`               |
| Sort       | `s`                    | `?s=createdAt:desc`   |
| Filter     | `f.<field>:<operator>` | `?f.status:eq=ACTIVE` |

### Custom search-params binding: `withURLCollectionState`

If you need URL persistence but cannot use react-router's `useSearchParams` (e.g. a different router or test environment), use the pure `withURLCollectionState` decorator to compose URL state with `useCollectionVariables` directly:

```tsx
import { withURLCollectionState, useCollectionVariables } from "@tailor-platform/app-shell";

const [searchParams, setSearchParams] = useSearchParams();

const { variables, control } = useCollectionVariables(
  withURLCollectionState({ tableMetadata, params: { pageSize: 20 } }, [
    searchParams,
    setSearchParams,
  ]),
);
```

`withURLCollectionState` returns augmented `useCollectionVariables` options — it does not call the hook itself. The `[searchParams, setSearchParams]` tuple must match the `URLSearchParams` + setter shape that `useSearchParams()` returns.

## `useDataTableContext`

Accesses the full DataTable state from any component rendered inside `DataTable.Root`. Use this to build custom sub-components when the built-in ones don't fit.

```tsx
import { useDataTableContext } from "@tailor-platform/app-shell";

function MyCustomPagination() {
  const { pageInfo, goToNextPage, goToPrevPage, hasNextPage, hasPrevPage } = useDataTableContext();
  // ...
}
```

The selection is here too — `selectedIds`, `selectAllRows` / `deselectAllRows` for the current page, and `clearSelection` — for the rare case the built-in [selection actions](#selection-actions) bar doesn't fit. Selection exposes IDs only; consumers fetch any row objects they need.

## SDK Plugin (`@tailor-platform/sdk-plugin-app-shell`)

The SDK plugin generates `tableMetadata` from TailorDB table definitions at generate time. This metadata bridges your schema to the DataTable — it specifies how each field should be rendered and filtered (e.g. date pickers for datetime fields, dropdown for enum fields).

Register the plugin in `tailor.config.ts` and run `tailor generate`:

```ts
import { definePlugins } from "@tailor-platform/sdk";
import { appShellPlugin } from "@tailor-platform/sdk-plugin-app-shell";

export const plugins = definePlugins(
  appShellPlugin({
    dataTable: {
      metadataOutputPath: "src/generated/app-shell-datatable.generated.ts",
    },
  }),
);
```

The generated file exports `tableMetadata`, `tableNames`, and `TableName`. Pass `tableMetadata` to `inferColumns` to get type-safe column definitions with filter editors automatically configured:

```ts
import { tableMetadata } from "@/generated/app-shell-datatable.generated";
import { createColumnHelper } from "@tailor-platform/app-shell";

const { column, inferColumns } = createColumnHelper<Order>();
const infer = inferColumns(tableMetadata.order);

const columns = [
  column(infer("title")), // string → text filter
  column(infer("status")), // enum   → dropdown filter with generated values
  column(infer("createdAt")), // datetime → date picker filter
];
```

## Related

- [CsvImporter](./csv-importer.md) — Guided CSV import flow
- [Table](./table.md) — Low-level table primitives used internally by DataTable
