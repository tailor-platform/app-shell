---
title: DataTable
description: Compound data table component with sortable columns, filter chips, cursor-based pagination, row actions, and multi-row selection
---

# DataTable

`DataTable` is a compound component for displaying collections of records. It integrates with the collection variable hooks (`useCollectionVariables`) to drive sorting, filtering, and cursor-based pagination through a GraphQL API.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/components/data-table)

## Import

```tsx
import {
  DataTable,
  useDataTable,
  useDataTableContext,
  useCollectionVariables,
  createColumnHelper,
  type Column,
  type DataTableData,
  type DataTableRootProps,
  type DataTablePaginationProps,
  type RowAction,
  type UseDataTableOptions,
  type UseDataTableReturn,
  type MetadataFieldOptions,
  type DataTableContextValue,
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

| Sub-component          | Description                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataTable.Root`       | Context provider. Wraps all other sub-components. Required.                                                                                                                           |
| `DataTable.Table`      | Renders the `<table>` with headers and body. Required.                                                                                                                                |
| `DataTable.Toolbar`    | Container for toolbar content (e.g. filters). Optional. Pass `columnSettings` to render the built-in "Columns" control (show/hide + reorder + pin) at the top-right. See props below. |
| `DataTable.Filters`    | Add-filter panel + active filter chips, auto-generated from column filter configs. Requires `control` from `useCollectionVariables`.                                                  |
| `DataTable.Footer`     | Footer container for pagination and other footer content. Optional.                                                                                                                   |
| `DataTable.Pagination` | Pre-built pagination controls with optional row count and selection info. Requires `control` from `useCollectionVariables`. Place inside `DataTable.Footer`.                          |

### `DataTable.Root` Props

| Prop        | Type                       | Description                                  |
| ----------- | -------------------------- | -------------------------------------------- |
| `value`     | `UseDataTableReturn<TRow>` | Return value of `useDataTable()`. Required.  |
| `children`  | `ReactNode`                | Sub-components to render inside the root.    |
| `className` | `string`                   | Additional CSS class for the root container. |

### `DataTable.Toolbar` Props

| Prop             | Type        | Default | Description                                                                                                                                         |
| ---------------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`       | `ReactNode` | —       | Toolbar content (e.g. `DataTable.Filters`), laid out on the left.                                                                                   |
| `columnSettings` | `boolean`   | `false` | Render the built-in "Columns" control (show/hide + reorder + pin) anchored to the top-right. Persists per-user when `useDataTable` has a `tableId`. |
| `className`      | `string`    | —       | Additional CSS class for the toolbar container.                                                                                                     |

### `DataTable.Filters` Props

| Prop          | Type                        | Default | Description                                                                                    |
| ------------- | --------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `slot`        | `"all" \| "chips" \| "add"` | `"all"` | Which part to render (see below).                                                              |
| `addIconOnly` | `boolean`                   | `false` | Render the **Add filter** trigger as an icon-only button (the label becomes its `aria-label`). |
| `className`   | `string`                    | —       | Additional CSS class for the filters container.                                                |

By default `DataTable.Filters` renders the active filter chips plus the **Add filter** trigger together. The `slot` prop lets you split them across a custom toolbar layout:

- `"all"` — chips + the **Add filter** trigger (default).
- `"chips"` — only the active chips (renders nothing when there are none).
- `"add"` — only the **Add filter** trigger.

```tsx
// Add filter in a header row (with tabs, etc.); chips on the row below.
<DataTable.Toolbar>
  <div className="flex items-center justify-between">
    <MyViewTabs />
    <DataTable.Filters slot="add" />
  </div>
  <DataTable.Filters slot="chips" />
</DataTable.Toolbar>
```

### `DataTable.Pagination` Props

| Prop              | Type       | Default | Description                                                                                                                                                                             |
| ----------------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSizeOptions` | `number[]` | —       | Available page-size options. When provided, a page-size switcher is rendered. The First button is always shown; the Last button is shown only when the backend returns a `total` count. |

`DataTable.Pagination` automatically displays a row count and selection info text on the left side of the pagination bar based on context state:

| Condition                                 | Displayed text           |
| ----------------------------------------- | ------------------------ |
| `total` is provided                       | `X row(s)`               |
| Rows selected and `total` is provided     | `Y of X row(s) selected` |
| Rows selected and `total` is not provided | `Y row(s) selected`      |
| No selection enabled and no `total`       | _(nothing displayed)_    |

Row selection is enabled by providing `onSelectionChange` to `useDataTable`. The `total` value comes from `DataTableData.total`.

## Column pinning, visibility & ordering

- **Pin** a column with `pin: "left" | "right"`. Pinned columns stay visible during horizontal scroll; the selection and expand columns auto-pin left and the row-actions column auto-pins right. A subtle shadow appears at the frozen edge once the table is scrolled under it. Sticky offsets are measured from the rendered layout, so a `width` isn't required — but setting `width` on pinned columns is recommended so their size stays stable as content changes.
- **Column settings.** Pass `columnSettings` to `DataTable.Toolbar` to render a built-in "Columns" control — a popover to show/hide columns, reorder them (drag), and change pinning by dragging a column between the **Fixed left**, **Scrollable**, and **Fixed right** zones. It's a toolbar prop (not a composed sub-component) because the control always sits in the same top-right position.
- **Persistence.** Pass a stable, **unique** `tableId` to persist each user's column layout (visibility, order, pinning) to `localStorage` (key `as:data-table:v1:<tableId>`). This is a per-user preference — it is deliberately **not** stored in the URL like filters/sort/pagination, so it survives reloads and isn't reset by shared/filtered links. Omit `tableId` for in-memory-only layout (state simply isn't persisted). Two tables mounted with the same `tableId` share one storage key and overwrite each other — use a unique id per table (e.g. `<route>:<entity>`); a dev-mode warning fires on duplicates.

```tsx
const table = useDataTable<Order>({
  columns, // e.g. [{ id: "ref", label: "Ref", width: 140, pin: "left" }, ...]
  data,
  tableId: "orders-list",
});

<DataTable.Root value={table}>
  <DataTable.Toolbar columnSettings />
  <DataTable.Table />
</DataTable.Root>;
```

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

## `useDataTable`

Creates the table state object to pass to `DataTable.Root`.

```tsx
const table = useDataTable({
  columns,
  data,
  loading,
  control,
});
```

### Options

| Option              | Type                               | Description                                                                                                                                                                     |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`           | `Column<TRow>[]`                   | Column definitions. Required.                                                                                                                                                   |
| `data`              | `DataTableData<TRow> \| undefined` | Fetched data. Pass `undefined` while loading.                                                                                                                                   |
| `loading`           | `boolean`                          | When `true`, renders a loading skeleton.                                                                                                                                        |
| `error`             | `Error \| null`                    | When set, renders an error message in the table body.                                                                                                                           |
| `control`           | `CollectionControl`                | Collection control from `useCollectionVariables()`. Required for `DataTable.Pagination` and `DataTable.Filters`.                                                                |
| `onClickRow`        | `(row: TRow) => void`              | Called when the user clicks a row. Adds a pointer cursor to rows.                                                                                                               |
| `tableId`           | `string`                           | Stable id used to persist per-user column layout (visibility, order, pinning) to `localStorage`. When omitted, column layout is in-memory only and resets on reload.            |
| `rowActions`        | `RowAction<TRow>[]`                | Per-row action items rendered in a kebab-menu column. The column is omitted when empty or not provided.                                                                         |
| `onSelectionChange` | `(ids: string[]) => void`          | Called with selected row IDs on change. Providing this enables the checkbox column. Rows must have a string `id`.                                                               |
| `rowExpansion`      | `RowExpansionOptions<TRow>`        | Expandable detail rows: `render`, plus optional `canExpand` / `getLabel`, and `expandedIds` + `onChange` together for controlled mode. See [Expandable rows](#expandable-rows). |
| `sort`              | `false \| { multiple?: boolean }`  | Sort behaviour. `false` disables sorting entirely. `{ multiple: true }` enables multi-column sorting. Omit or pass `{}` for single-column sort (default).                       |

### `DataTableData`

| Property   | Type             | Description                                                          |
| ---------- | ---------------- | -------------------------------------------------------------------- |
| `rows`     | `TRow[]`         | Row data to display.                                                 |
| `pageInfo` | `PageInfo`       | Cursor pagination info from the API.                                 |
| `total`    | `number \| null` | Total record count. Used for First/Last navigation and page counter. |

## `Column`

A column definition passed to `useDataTable`. `Column<TRow>` is a discriminated union on `type` — the shape of `typeOptions` is narrowed per branch, so mismatches are compile errors rather than silent runtime no-ops.

### Shared fields

| Property   | Type                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`                                  | Column header text. Omit for icon-only columns.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `header`   | `(ctx: HeaderRenderContext) => ReactNode` | Custom header renderer. When omitted, the built-in header renders `label` and owns the sort button/indicator. When provided, the return value replaces the built-in header entirely; sortable custom headers receive `sortDirection` and `activateSort()` via `ctx` and must render their own click surface.                                                                                                                                                                                  |
| `render`   | `(row: TRow) => ReactNode`                | Renders the cell content. Optional — overrides the built-in `type` renderer when set.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `id`       | `string`                                  | Stable identifier for column visibility and React key. Falls back to `label` when omitted.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `width`    | `number`                                  | Fixed column width in pixels. Optional.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pin`      | `"left" \| "right"`                       | Freezes the column to that edge so it stays visible during horizontal scroll (the default; the user can override it via the toolbar's `columnSettings` control). Sticky offsets are measured from the rendered layout, so `width` isn't required — but setting `width` on pinned columns is recommended for stable sizing. The selection and expand columns auto-pin left and the row-actions column auto-pins right.                                                                         |
| `align`    | `"left" \| "right"`                       | Horizontal alignment. Defaults to `"right"` for `type: "number"` and `type: "money"`; `"left"` otherwise. Pass `"left"` to opt a numeric column out.                                                                                                                                                                                                                                                                                                                                          |
| `truncate` | `boolean`                                 | Truncate overflowing text with an ellipsis. Wires up an app-shell `<Tooltip>` automatically when the resolved cell value is a string or number — resolved via `accessor` first, then `row[col.id]` as a fallback — so hovering the cell reveals the full value. With `inferColumns`, no explicit `accessor` is needed because `id` is pinned to the field name. Requires another column to anchor the row width (`width` on a neighbor, or a fixed-size column like selection / row actions). |
| `accessor` | _(narrowed per `type`)_                   | Extracts the raw value. The return type is narrowed per `type` branch — returning an array is a compile error on all typed columns except `badge`, and returning a plain object is a compile error on all typed columns. Untyped columns (`type` omitted) retain `unknown`. `null` and `undefined` are always allowed.                                                                                                                                                                        |
| `sort`     | `SortConfig`                              | Sort configuration. When set, the column header becomes clickable (Asc → Desc → off).                                                                                                                                                                                                                                                                                                                                                                                                         |
| `filter`   | `FilterConfig`                            | Filter configuration. When set, the column appears as an option in `DataTable.Filters`.                                                                                                                                                                                                                                                                                                                                                                                                       |

### `type`-specific fields

| `type`      | `typeOptions`                                                |
| ----------- | ------------------------------------------------------------ |
| _(omitted)_ | _(not allowed; provide `render` to draw the cell)_           |
| `"text"`    | _(not allowed)_                                              |
| `"number"`  | `NumberCellOptions`                                          |
| `"money"`   | `MoneyCellOptions<TRow>`                                     |
| `"date"`    | `DateCellOptions`                                            |
| `"badge"`   | `BadgeCellOptions`                                           |
| `"link"`    | **Required** — `LinkCellOptions<TRow>` (must include `href`) |

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

| Type       | Input editor              | Supported operators                                                                                          |
| ---------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `string`   | Text                      | `eq`, `ne`, `contains`, `notContains`, `hasPrefix`, `hasSuffix`, `notHasPrefix`, `notHasSuffix`, `in`, `nin` |
| `number`   | Number                    | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `datetime` | Datetime-local            | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `date`     | **Calendar / DatePicker** | `eq` (_exact date_), `gte` (_after_), `lte` (_before_), **`between`**                                        |
| `time`     | Time                      | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, **`between`**, `in`, `nin`                                             |
| `enum`     | Dropdown                  | `eq`, `ne`, `in`, `nin`                                                                                      |
| `boolean`  | Toggle                    | `eq`, `ne`                                                                                                   |
| `uuid`     | Text                      | `eq`, `ne`, `in`, `nin`                                                                                      |

When the `between` operator is selected on a `number`, `datetime`, `date`, or `time` column, the value editor renders a range input with **min**/**max** (or **From**/**To** for dates) bounds.

### Date Filters

`date` columns render app-shell date components as the value editor: single-value operators (`eq` / `gte` / `lte`) use an inline `Calendar`, and the `between` range uses two [`DatePicker`](./date-picker.md) **From** / **To** fields. (The range fields are a stopgap — they'll be replaced with a single range calendar once date-range support lands in the date-picker component.) `date` columns also present a friendlier, slimmer operator set:

| Operator  | Label        | Meaning                    |
| --------- | ------------ | -------------------------- |
| `eq`      | _exact date_ | matches that calendar date |
| `gte`     | _after_      | on or after (inclusive)    |
| `lte`     | _before_     | on or before (inclusive)   |
| `between` | _between_    | inclusive min–max range    |

`gt` / `lt` / `ne` are intentionally dropped — the inclusive _after_ / _before_ cover the intent. The filter chip shows the value as a locale-formatted date (e.g. `15 Jun 2026`), and the picker resolves its locale/timezone from the AppShell context. (Only `date` is remapped this way; `datetime` and `time` keep the full numeric operator set and native inputs.)

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

| Property     | Type                         | Description                                          |
| ------------ | ---------------------------- | ---------------------------------------------------- |
| `id`         | `string`                     | Stable identifier for the action.                    |
| `label`      | `string`                     | Display label in the kebab menu.                     |
| `icon`       | `ReactNode`                  | Optional icon shown beside the label.                |
| `variant`    | `"default" \| "destructive"` | Visual style of the menu item.                       |
| `isDisabled` | `(row: TRow) => boolean`     | Return `true` to disable the action for a given row. |
| `onClick`    | `(row: TRow) => void`        | Called when the action is clicked.                   |

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
// variables.query      → filter input object or undefined
// variables.order      → sort input array or undefined
```

### Options

| Option                  | Type                                 | Description                                                                                                           |
| ----------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `params.pageSize`       | `number`                             | Initial page size. Default: `20`.                                                                                     |
| `params.initialFilters` | `Filter[]`                           | Filters applied on first render.                                                                                      |
| `params.initialSort`    | `SortState[]`                        | Sort applied on first render.                                                                                         |
| `tableMetadata`         | `TableMetadata`                      | Generated table metadata. Required for typed GraphQL documents (see [Typed query variables](#typed-query-variables)). |
| `onParamsChange`        | `(params: CollectionParams) => void` | Called after each filter, sort, or page-size change with the current params.                                          |

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

// variables.query is now BuildQueryVariables<typeof tableMetadata.order>
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

All options accepted by `useCollectionVariables` are accepted here too. `tableMetadata` is optional but recommended for typed variables and correct URL round-tripping of typed field values (numbers and booleans are preserved correctly).

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
