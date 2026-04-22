---
"@tailor-platform/app-shell": major
---

Add `DataTable` compound component. Also introduces `@tailor-platform/app-shell-sdk-plugin` — a companion SDK plugin that generates `tableMetadata` from TailorDB type definitions for use with `createColumnHelper`.

## DataTable

- Sortable columns (click header to cycle Asc → Desc → off)
- Filter chips with per-type editors (string, number, date, enum, boolean, uuid)
- Cursor-based pagination with optional total-aware First/Last navigation
- Per-row action menu (kebab menu)
- Multi-row checkbox selection (current page only)
- Column visibility toggling
- Loading, error, and empty states
- Metadata-driven column inference via `createColumnHelper` and `inferColumns`

```tsx
import {
  DataTable,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
  type RowAction,
} from "@tailor-platform/app-shell";

const { column } = createColumnHelper<Order>();

const columns = [
  column({
    field: "title",
    label: "Title",
    type: "string",
  }),
  column({
    field: "status",
    label: "Status",
    type: "enum",
    enumValues: ["pending", "shipped", "delivered"],
    render: (row) => <Badge>{row.status}</Badge>,
  }),
];

const rowActions: RowAction<Order>[] = [
  {
    id: "edit",
    label: "Edit",
    onClick: (row) => navigate(`/orders/${row.id}`),
  },
];

function OrdersPage() {
  const { variables, control } = useCollectionVariables({
    params: { pageSize: 20 },
  });
  const [result] = useQuery({ query: GET_ORDERS, variables });

  const table = useDataTable<Order>({
    columns,
    data: result.data
      ? {
          rows: result.data.orders.edges.map((e) => e.node),
          pageInfo: {
            hasNextPage: result.data.orders.pageInfo.hasNextPage,
            hasPreviousPage: result.data.orders.pageInfo.hasPreviousPage,
            endCursor: result.data.orders.pageInfo.endCursor,
            startCursor: result.data.orders.pageInfo.startCursor,
          },
          total: result.data.orders.total,
        }
      : undefined,
    loading: result.fetching,
    control,
    rowActions,
    onClickRow: (row) => navigate(`/orders/${row.id}`),
    onSelectionChange: (ids) => setSelectedIds(ids),
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

## sdk-plugins (`@tailor-platform/app-shell-sdk-plugin`)

`tableMetadata` is what bridges your TailorDB schema to the DataTable. It tells `inferColumns` how to render and filter each field — for example, which fields get a date picker, which get an enum dropdown (and with what options), and which are numeric. Without it, you would need to declare all of this manually per column.

The metadata is generated at SDK code-gen time from your TailorDB type definitions. Register the plugin in `tailor.config.ts` and run `tailor-sdk generate`:

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
  column(infer("title")),         // string column → text filter
  column(infer("status")),        // enum column  → dropdown filter with generated values
  column(infer("createdAt")),     // datetime column → date picker filter
];
```
