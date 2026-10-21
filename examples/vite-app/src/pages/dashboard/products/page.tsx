import { useState } from "react";
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
import { allProducts, type Product, useProductsQuery } from "../../../mock-products";

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

// Share presentation only; each operation owns its eligibility checks.
const deleteProduct: DataTableAction = {
  id: "delete",
  label: "Delete",
  variant: "destructive",
};

const rowActions: RowAction<Product>[] = [
  {
    id: "edit",
    label: "Edit",
    onClick: (row) => alert(`Edit: ${row.name}`),
  },
  {
    ...deleteProduct,
    canApply: (row) => row.status !== "Active",
    onClick: (row) => alert(`Delete: ${row.name}`),
  },
];

const names = (rows: Product[]) => rows.map((row) => row.name).join(", ");

// 🧪 Dummy Data: resolve IDs against the complete mock backend, not the current page.
const selectedProducts = (ids: string[]) => allProducts.filter((row) => ids.includes(row.id));

// Alert-only previews leave selection unchanged; a real mutation should report
// completed IDs and remove only those IDs from the current selection.
const actions: SelectionAction[] = [
  {
    id: "publish",
    label: "Publish",
    onClick: (ids) =>
      alert(`Publish: ${names(selectedProducts(ids).filter((row) => row.status === "Draft"))}`),
  },
  {
    id: "archive",
    label: "Archive",
    onClick: (ids) =>
      alert(`Archive: ${names(selectedProducts(ids).filter((row) => row.status !== "Archived"))}`),
  },
  {
    ...deleteProduct,
    onClick: (ids) =>
      alert(`Delete: ${names(selectedProducts(ids).filter((row) => row.status !== "Active"))}`),
  },
];

const ProductsPage = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    rowSelection: { selectedIds, onChange: setSelectedIds, actions },
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
