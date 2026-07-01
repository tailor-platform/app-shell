import {
  DataTable,
  Layout,
  useDataTable,
  useURLCollectionVariables,
  createColumnHelper,
  type AppShellPageProps,
  type RowAction,
} from "@tailor-platform/app-shell";
import { Package } from "lucide-react";
import { useState } from "react";
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

const rowActions: RowAction<Product>[] = [
  {
    id: "edit",
    label: "Edit",
    onClick: (row) => alert(`Edit: ${row.name}`),
  },
  {
    id: "delete",
    label: "Delete",
    variant: "destructive",
    isDisabled: (row) => row.status === "Active",
    onClick: (row) => alert(`Delete: ${row.name}`),
  },
];

const ProductsPage = () => {
  // Single composed hook: filter/sort/pagination state is persisted to the URL
  // (bookmarkable, back-button friendly) and the URL seeds the initial state
  // synchronously, so the first fetch already reflects the URL. Check the
  // address bar as you interact.
  const { variables, control } = useURLCollectionVariables({
    params: { pageSize: 5 },
    tableMetadata: productMetadata,
  });

  const { data, loading } = useProductsQuery(variables);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    onSelectionChange: (ids) => setSelectedIds(ids),
  });

  return (
    <Layout>
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
            <DataTable.Pagination pageSizeOptions={[5, 10, 20]} />
          </DataTable.Footer>
        </DataTable.Root>
        {selectedIds.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Selected: {selectedIds.join(", ")}</p>
        )}
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
