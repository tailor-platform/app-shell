import {
  DataTable,
  Layout,
  useDataTable,
  useNavigate,
  useURLCollectionVariables,
  createColumnHelper,
  type AppShellPageProps,
  type RowAction,
} from "@tailor-platform/app-shell";
import { ReceiptText } from "lucide-react";
import { paths } from "../../../routes.generated";
import { labels } from "../../../i18n-labels";
import { type Order, useOrdersQuery } from "../../../mock-orders";

const orderMetadata = {
  name: "order",
  pluralForm: "orders",
  fields: [
    { name: "id", type: "uuid", required: true },
    { name: "customer", type: "string", required: true },
    {
      name: "status",
      type: "enum",
      required: true,
      enumValues: ["Processing", "Shipped", "Delivered", "Cancelled"],
    },
    {
      name: "channel",
      type: "enum",
      required: true,
      enumValues: ["Web", "Retail", "Phone"],
    },
    { name: "items", type: "number", required: true },
    { name: "total", type: "number", required: true },
    { name: "placedOn", type: "date", required: true },
  ],
} as const;

const { column, inferColumns } = createColumnHelper<Order>();
const infer = inferColumns(orderMetadata);

const columns = [
  column({
    ...infer("id"),
    label: "Order",
    render: (row) => <span className="font-mono text-xs">{row.id}</span>,
  }),
  column({
    ...infer("customer"),
    label: "Customer",
    render: (row) => <span className="font-medium">{row.customer}</span>,
  }),
  column({
    ...infer("status"),
    label: "Status",
    type: "badge",
    typeOptions: {
      badgeVariantMap: {
        Processing: "outline-warning",
        Shipped: "outline-info",
        Delivered: "success",
        Cancelled: "neutral",
      },
    },
  }),
  column({ ...infer("channel"), label: "Channel" }),
  column({ ...infer("items"), label: "Items", type: "number" }),
  column({ ...infer("total"), label: "Total", type: "money" }),
  // `type: "date"` → the filter panel renders a single-calendar range editor
  // for "between". Try Status → in, or Placed on → between.
  column({
    ...infer("placedOn"),
    label: "Placed on",
    type: "date",
    typeOptions: { dateFormat: "long" },
  }),
];

const OrdersPage = () => {
  const navigate = useNavigate();

  // Filter/sort/pagination state persists to the URL and seeds the initial
  // fetch synchronously — bookmarkable and back-button friendly.
  const { variables, control } = useURLCollectionVariables({
    params: { pageSize: 5 },
    tableMetadata: orderMetadata,
  });

  const { data, loading } = useOrdersQuery(variables);

  const rowActions: RowAction<Order>[] = [
    {
      id: "view",
      label: "View details",
      onClick: (row) => navigate(paths.for("/dashboard/orders/:id", { id: row.id })),
    },
    {
      id: "cancel",
      label: "Cancel order",
      variant: "destructive",
      isDisabled: (row) => row.status === "Delivered" || row.status === "Cancelled",
      onClick: (row) => alert(`Cancel ${row.id}`),
    },
  ];

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
    onClickRow: (row) => navigate(paths.for("/dashboard/orders/:id", { id: row.id })),
  });

  return (
    <Layout>
      <Layout.Header title="Orders" />
      <Layout.Column>
        <p className="mb-4 text-sm text-muted-foreground">
          DataTable backed by a mock remote query (
          <code className="bg-muted rounded px-1">useOrdersQuery</code>, ~800 ms latency) with
          filters, sorting, and pagination synced to the URL. Every fetch shows a loading state.
          Filter <strong>Placed on</strong> with the <em>between</em> operator to use the range
          calendar. Click a row to open the order.
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
      </Layout.Column>
    </Layout>
  );
};

OrdersPage.appShellPageProps = {
  meta: {
    title: labels.t("ordersTitle"),
    icon: <ReceiptText />,
  },
} satisfies AppShellPageProps;

export default OrdersPage;
