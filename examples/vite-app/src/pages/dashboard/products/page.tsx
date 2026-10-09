import {
  DataTable,
  Layout,
  useDataTable,
  useURLCollectionVariables,
  createColumnHelper,
  type AppShellPageProps,
  type DataTableAction,
  type RowAction,
  type SelectionAction,
} from "@tailor-platform/app-shell";
import { Package } from "lucide-react";
import { type Product, useProductsQuery } from "../../../mock-products";

const productMetadata = {
  name: "product",
  pluralForm: "products",
  fields: [
    { name: "id", type: "uuid", required: true },
    { name: "name", type: "string", required: true },
    { name: "description", type: "string", required: true },
    { name: "category", type: "string", required: true },
    { name: "price", type: "number", required: true },
    { name: "stock", type: "number", required: false },
    {
      name: "status",
      type: "enum",
      required: true,
      enumValues: ["Active", "Draft", "Archived"],
    },
    { name: "publishedAt", type: "datetime", required: true },
    { name: "tags", type: "string", required: false },
  ],
} as const;

const { column, inferColumns } = createColumnHelper<Product>();
const infer = inferColumns(productMetadata);

const columns = [
  column({
    ...infer("name"),
    render: (row) => <span className="font-medium">{row.name}</span>,
  }),
  column({ ...infer("description"), type: "text", truncate: true }),
  column(infer("category")),
  column({ ...infer("price"), type: "money" }),
  column({ ...infer("stock"), type: "number" }),
  column({
    ...infer("status"),
    type: "badge",
    typeOptions: {
      badgeVariantMap: {
        Active: "success",
        Draft: "outline-warning",
        Archived: "neutral",
      },
    },
  }),
  column({
    ...infer("tags"),
    type: "badge",
    typeOptions: {
      badgeVariantMap: {
        Premium: "warning",
        Ergonomic: "success",
        Office: "outline-info",
        Wireless: "outline-neutral",
      },
      defaultBadgeVariant: "neutral",
      maxVisible: 2,
    },
  }),
];

// Defined once, used by both the row menu and the bulk-action bar — only
// `onClick` differs. `canApply` disables the row action for active products
// and scopes the bulk action to the selected rows it can delete.
const deleteProduct: DataTableAction<Product> = {
  id: "delete",
  label: "Delete",
  variant: "destructive",
  canApply: (row) => row.status !== "Active",
};

const rowActions: RowAction<Product>[] = [
  {
    id: "edit",
    label: "Edit",
    onClick: (row) => alert(`Edit: ${row.name}`),
  },
  { ...deleteProduct, onClick: (row) => alert(`Delete: ${row.name}`) },
];

const names = (rows: Product[]) => rows.map((row) => row.name).join(", ");

// Bulk actions in the footer while rows are selected. `canApply` scopes each
// action to the selected rows it can act on and shows that count.
const selectionActions: SelectionAction<Product>[] = [
  {
    id: "publish",
    label: "Publish",
    canApply: (row) => row.status === "Draft",
    onClick: (rows) => alert(`Publish: ${names(rows)}`),
  },
  {
    id: "archive",
    label: "Archive",
    canApply: (row) => row.status !== "Archived",
    onClick: (rows) => alert(`Archive: ${names(rows)}`),
  },
  { ...deleteProduct, onClick: (rows) => alert(`Delete: ${names(rows)}`) },
];

const ProductsPage = () => {
  // Single composed hook: filter/sort/pagination state is persisted to the URL
  // (bookmarkable, back-button friendly) and the URL seeds the initial state
  // synchronously, so the first fetch already reflects the URL. Check the
  // address bar as you interact.
  const { variables, control } = useURLCollectionVariables({
    params: { pageSize: 25 },
    tableMetadata: productMetadata,
  });

  const { data, loading } = useProductsQuery(variables);

  const table = useDataTable({
    columns,
    data: data
      ? {
          rows: data.edges.map((e) => e.node),
          pageInfo: data.pageInfo,
          total: data.total,
        }
      : undefined,
    loading,
    control,
    rowActions,
    onClickRow: (row) => alert(`Clicked: ${row.name}`),
    selectionActions,
  });

  return (
    // `fill` pins the page chrome: the title, table header, and footer stay
    // visible while the rows region scrolls internally.
    <Layout fill>
      <Layout.Header title="Products" />
      <Layout.Column>
        <p className="mb-4 text-sm text-muted-foreground">
          DataTable with mock remote query, pagination, sorting, and filters — all synced to the URL
          via <code className="bg-muted rounded px-1">useURLCollectionVariables</code>. Sort a
          column, change page size, or add a filter, then check the address bar. Deep-link state
          (e.g. <code className="bg-muted rounded px-1">?p=10&amp;s=price:desc</code>) hydrates on
          load.
        </p>
        <DataTable.Root value={table}>
          <DataTable.Toolbar>
            <DataTable.Filters />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination pageSizeOptions={[10, 25, 50, 100]} />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
    </Layout>
  );
};

ProductsPage.appShellPageProps = {
  meta: {
    title: "Products",
    icon: <Package />,
  },
} satisfies AppShellPageProps;

export default ProductsPage;
