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
- Loading, error, and empty states
- Metadata-driven column inference via `createColumnHelper` and `inferColumns`

### Example with urql (Relay Cursor Connection GraphQL API)

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

const { column } = createColumnHelper<{
  id: string;
  contents: string;
  authorID: string;
}>();

const columns = [
  column({ field: "id", label: "ID", type: "uuid" }),
  column({ field: "authorID", label: "Author", type: "string" }),
  column({ field: "contents", label: "Contents", type: "string" }),
];

function JournalsPage() {
  // variables: { query, order, pagination } — maps directly to GraphQL variables.
  // control: holds filter/sort/pagination state and methods (addFilter, setSort, nextPage, …).
  //          Passing it to useDataTable wires UI interactions (column clicks, filter chips,
  //          pagination buttons) to state updates, which re-derive variables and re-run the query.
  const { variables, control } = useCollectionVariables({
    params: { pageSize: 20 },
  });

  // pagination holds { first, after? } (forward) or { last, before? } (backward).
  const [result] = useQuery({
    query: LIST_JOURNALS,
    variables: {
      first: variables.pagination.first,
      after: variables.pagination.after,
      last: variables.pagination.last,
      before: variables.pagination.before,
      query: variables.query,
      order: variables.order,
    },
  });

  const table = useDataTable<Journal>({
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

  // DataTable.Root + DataTable.Table are the only required sub-components.
  // DataTable.Toolbar / DataTable.Filters / DataTable.Pagination are opt-in sensible defaults.
  // If they don't fit, use useDataTableContext() to build your own sub-components —
  // it exposes the full DataTable state (rows, columns, sort, pagination, selection, etc.)
  // from the nearest DataTable.Root.
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

`useCollectionVariables` is intentionally decoupled from DataTable and any other UI component. The hook owns only the query state and exposes plain `variables` — how those variables are rendered is entirely up to the consumer. This means future collection-based views such as Kanban boards can adopt the same hook without modification, and any custom component you build can use a GraphQL cursor-based API as its backend with minimal wiring.

## sdk-plugin (`@tailor-platform/app-shell-sdk-plugin`)

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
  column(infer("title")), // string column → text filter
  column(infer("status")), // enum column  → dropdown filter with generated values
  column(infer("createdAt")), // datetime column → date picker filter
];
```
