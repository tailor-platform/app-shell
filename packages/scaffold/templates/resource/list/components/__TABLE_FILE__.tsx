/* app-shell-scaffold: resource/list table scaffold banner. */
import {
  Card,
  DataTable,
  Link,
  createColumnHelper,
  useDataTable,
  useNavigate,
  useURLCollectionVariables,
} from "@tailor-platform/app-shell";

/*
 * TODO(app-shell-scaffold): Step 1 of 5. Add your GraphQL query and imports.
 *
 * ```ts
 * import { useQuery } from "urql";
 * import { graphql, type ResultOf } from "@/graphql";
 *
 * const __ENTITY_NAME_PLURAL_PASCAL__Query = graphql(`
 *   query __ENTITY_NAME_PLURAL_PASCAL__(
 *     $first: Int
 *     $after: String
 *     $last: Int
 *     $before: String
 *     $order: [__ENTITY_NAME_SINGULAR_PASCAL__OrderInput]
 *     $query: __ENTITY_NAME_SINGULAR_PASCAL__QueryInput
 *   ) {
 *     __ENTITY_NAME_PLURAL_CAMEL__(
 *       first: $first
 *       after: $after
 *       last: $last
 *       before: $before
 *       order: $order
 *       query: $query
 *     ) {
 *       pageInfo {
 *         hasNextPage
 *         hasPreviousPage
 *         startCursor
 *         endCursor
 *       }
 *       total
 *       edges {
 *         node {
 *           id
 *           title
 *           status
 *           createdAt
 *         }
 *       }
 *     }
 *   }
 * `);
 * ```
 */

/*
 * TODO(app-shell-scaffold): Step 2 of 5. Replace the placeholder row type below
 * with the generated node type. Do not keep a hand-written row shape.
 *
 * ```ts
 * type __ENTITY_NAME_SINGULAR_PASCAL__Row = NonNullable<
 *   NonNullable<ResultOf<typeof __ENTITY_NAME_PLURAL_PASCAL__Query>["__ENTITY_NAME_PLURAL_CAMEL__"]>["edges"]
 * >[number]["node"];
 * ```
 */
type __ENTITY_NAME_SINGULAR_PASCAL__Row = {
  id: string;
  title: string;
  status: "Draft" | "Active" | "Archived";
  createdAt: string;
};

/*
 * TODO(app-shell-scaffold): Step 3 of 5. Replace the inline metadata below with
 * generated `tableMetadata`.
 *
 * The metadata output path is configurable in `tailor.config.ts`, so do not assume a
 * fixed import path. Search your project for `app-shell-datatable.generated.ts` or
 * `export const tableMetadata =` and import the matching entry.
 *
 * ```ts
 * import { tableMetadata } from "...";
 *
 * const tableMetadataForEntity = tableMetadata.__ENTITY_NAME_SINGULAR_CAMEL__;
 * ```
 */
const tableMetadataForEntity = {
  name: "__ENTITY_NAME_SINGULAR_CAMEL__",
  pluralForm: "__ENTITY_NAME_PLURAL_CAMEL__",
  fields: [
    { name: "title", type: "string", required: true },
    {
      name: "status",
      type: "enum",
      required: true,
      enumValues: ["Draft", "Active", "Archived"],
    },
    { name: "createdAt", type: "date", required: true },
  ],
} as const;

const statusBadgeMap = {
  Draft: "neutral",
  Active: "success",
  Archived: "outline-neutral",
} as const;

const emptyPageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

const { column, inferColumns } = createColumnHelper<__ENTITY_NAME_SINGULAR_PASCAL__Row>();
const infer = inferColumns(tableMetadataForEntity);

const columns = [
  column({
    ...infer("title", { label: "Title" }),
    render: (row) => (
      <Link to={row.id} className="text-primary underline-offset-4 hover:underline">
        {row.title}
      </Link>
    ),
  }),
  column({
    ...infer("status", { label: "Status" }),
    type: "badge",
    typeOptions: { badgeVariantMap: statusBadgeMap },
  }),
  column({
    ...infer("createdAt", { label: "Created" }),
    type: "date",
    typeOptions: { dateFormat: "long" },
  }),
];

export const ListTable = () => {
  const navigate = useNavigate();
  const { variables, control } = useURLCollectionVariables({
    tableMetadata: tableMetadataForEntity,
    params: {
      pageSize: 25,
      initialSort: [{ field: "createdAt", direction: "Desc" }],
    },
  });

  /*
   * TODO(app-shell-scaffold): Step 4 of 5. Replace the placeholder data block
   * below with the real query result.
   *
   * ```ts
   * const [{ data, fetching, error }] = useQuery({
   *   query: __ENTITY_NAME_PLURAL_PASCAL__Query,
   *   variables: {
   *     ...variables.pagination,
   *     order: variables.order,
   *     query: variables.query,
   *   },
   * });
   *
   * const rows = data?.__ENTITY_NAME_PLURAL_CAMEL__?.edges.map((edge) => edge.node) ?? [];
   * const loading = fetching;
   * const tableData = data?.__ENTITY_NAME_PLURAL_CAMEL__
   *   ? {
   *       rows,
   *       pageInfo: data.__ENTITY_NAME_PLURAL_CAMEL__.pageInfo,
   *       total: data.__ENTITY_NAME_PLURAL_CAMEL__.total,
   *     }
   *   : undefined;
   * ```
   */
  const rows: __ENTITY_NAME_SINGULAR_PASCAL__Row[] = [];
  const loading = false;
  const error: Error | null = null;
  const tableData = {
    rows,
    total: rows.length,
    pageInfo: emptyPageInfo,
  };
  const emptyStateTitle = variables.query
    ? "No matching __ENTITY_NAME_PLURAL_TITLE_LOWER__"
    : "No __ENTITY_NAME_PLURAL_TITLE_LOWER__";

  const table = useDataTable({
    tableId: "__ENTITY_NAME_PLURAL_KEBAB__",
    columns,
    control,
    data: tableData,
    loading,
    error,
    onClickRow: (row) => void navigate(row.id),
  });

  /*
   * TODO(app-shell-scaffold): Step 5 of 5. Keep a labelled empty state after
   * replacing the placeholder rows.
   */
  if (rows.length === 0) {
    return (
      <Card.Root>
        <Card.Header title={emptyStateTitle} />
        <Card.Content>
          <p className="text-sm text-muted-foreground">
            Replace placeholder rows with your query result, then keep a labelled empty state here.
          </p>
        </Card.Content>
      </Card.Root>
    );
  }

  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar columnSettings>
        <DataTable.Filters />
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination pageSizeOptions={[10, 25, 50]} />
      </DataTable.Footer>
    </DataTable.Root>
  );
};
