---
title: DataTable
description: Compound data table component with sortable columns, filter chips, cursor-based pagination, row actions, and multi-row selection
---

# DataTable

`DataTable` is a compound component for displaying collections of records. It integrates with the collection variable hooks (`useCollectionVariables`) to drive sorting, filtering, and cursor-based pagination through a GraphQL API.

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

| Sub-component          | Description                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DataTable.Root`       | Context provider. Wraps all other sub-components. Required.                                                       |
| `DataTable.Table`      | Renders the `<table>` with headers and body. Required.                                                            |
| `DataTable.Toolbar`    | Container for toolbar content (e.g. filters, column visibility). Optional.                                        |
| `DataTable.Filters`    | Auto-generated filter chips from column filter configs. Requires `control` from `useCollectionVariables`.         |
| `DataTable.Footer`     | Footer container for pagination and other footer content. Optional.                                               |
| `DataTable.Pagination` | Pre-built pagination controls. Requires `control` from `useCollectionVariables`. Place inside `DataTable.Footer`. |

### `DataTable.Root` Props

| Prop        | Type                       | Description                                  |
| ----------- | -------------------------- | -------------------------------------------- |
| `value`     | `UseDataTableReturn<TRow>` | Return value of `useDataTable()`. Required.  |
| `children`  | `ReactNode`                | Sub-components to render inside the root.    |
| `className` | `string`                   | Additional CSS class for the root container. |

### `DataTable.Pagination` Props

| Prop              | Type       | Default | Description                                                                                                                                               |
| ----------------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pageSizeOptions` | `number[]` | —       | Available page-size options. When provided, a page-size switcher is rendered. First/Last buttons are shown only when the backend returns a `total` count. |

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

| Option              | Type                               | Description                                                                                                       |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `columns`           | `Column<TRow>[]`                   | Column definitions. Required.                                                                                     |
| `data`              | `DataTableData<TRow> \| undefined` | Fetched data. Pass `undefined` while loading.                                                                     |
| `loading`           | `boolean`                          | When `true`, renders a loading skeleton.                                                                          |
| `error`             | `Error \| null`                    | When set, renders an error message in the table body.                                                             |
| `control`           | `CollectionControl`                | Collection control from `useCollectionVariables()`. Required for `DataTable.Pagination` and `DataTable.Filters`.  |
| `onClickRow`        | `(row: TRow) => void`              | Called when the user clicks a row. Adds a pointer cursor to rows.                                                 |
| `rowActions`        | `RowAction<TRow>[]`                | Per-row action items rendered in a kebab-menu column. The column is omitted when empty or not provided.           |
| `onSelectionChange` | `(ids: string[]) => void`          | Called with selected row IDs on change. Providing this enables the checkbox column. Rows must have a string `id`. |

### `DataTableData`

| Property   | Type             | Description                                                          |
| ---------- | ---------------- | -------------------------------------------------------------------- |
| `rows`     | `TRow[]`         | Row data to display.                                                 |
| `pageInfo` | `PageInfo`       | Cursor pagination info from the API.                                 |
| `total`    | `number \| null` | Total record count. Used for First/Last navigation and page counter. |

## `Column`

A column definition passed to `useDataTable`.

| Property   | Type                       | Description                                                                                |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `label`    | `string`                   | Column header text. Omit for icon-only columns.                                            |
| `render`   | `(row: TRow) => ReactNode` | Renders the cell content. Required.                                                        |
| `id`       | `string`                   | Stable identifier for column visibility and React key. Falls back to `label` when omitted. |
| `width`    | `number`                   | Fixed column width in pixels. Optional.                                                    |
| `accessor` | `(row: TRow) => unknown`   | Extracts the raw value for sorting. Not used for rendering.                                |
| `sort`     | `SortConfig`               | Sort configuration. When set, the column header becomes clickable (Asc → Desc → off).      |
| `filter`   | `FilterConfig`             | Filter configuration. When set, the column appears as an option in `DataTable.Filters`.    |

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

Binds table metadata and returns a per-field column factory. The factory derives `label`, `sort`, and `filter` config automatically from the field's metadata. Requires metadata generated by `@tailor-platform/app-shell-sdk-plugin`.

```tsx
const infer = inferColumns(tableMetadata.order);

const columns = [
  column(infer("title")),
  column(infer("status")),
  column({ ...infer("createdAt"), render: (row) => formatDate(row.createdAt) }),
];
```

The factory accepts an optional second argument to override per-column defaults:

| Option   | Type      | Default                                     | Description                                                  |
| -------- | --------- | ------------------------------------------- | ------------------------------------------------------------ |
| `label`  | `string`  | Field `description` or `name` from metadata | Override the column header text.                             |
| `width`  | `number`  | —                                           | Fixed column width in pixels.                                |
| `sort`   | `boolean` | `true`                                      | Set to `false` to suppress the auto-generated sort config.   |
| `filter` | `boolean` | `true`                                      | Set to `false` to suppress the auto-generated filter config. |

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

| Option                  | Type            | Description                                                                                                           |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `params.pageSize`       | `number`        | Initial page size. Default: `20`.                                                                                     |
| `params.initialFilters` | `Filter[]`      | Filters applied on first render.                                                                                      |
| `params.initialSort`    | `SortState[]`   | Sort applied on first render.                                                                                         |
| `tableMetadata`         | `TableMetadata` | Generated table metadata. Required for typed GraphQL documents (see [Typed query variables](#typed-query-variables)). |

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

## `useDataTableContext`

Accesses the full DataTable state from any component rendered inside `DataTable.Root`. Use this to build custom sub-components when the built-in ones don't fit.

```tsx
import { useDataTableContext } from "@tailor-platform/app-shell";

function MyCustomPagination() {
  const { pageInfo, nextPage, prevPage, hasNextPage, hasPrevPage } = useDataTableContext();
  // ...
}
```

## SDK Plugin (`@tailor-platform/app-shell-sdk-plugin`)

The SDK plugin generates `tableMetadata` from TailorDB type definitions at code-gen time. This metadata bridges your schema to the DataTable — it specifies how each field should be rendered and filtered (e.g. date pickers for datetime fields, dropdown for enum fields).

Register the plugin in `tailor.config.ts` and run `tailor-sdk generate`:

```ts
import { definePlugins } from "@tailor-platform/sdk";
import { appShellPlugin } from "@tailor-platform/app-shell-sdk-plugin";

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
