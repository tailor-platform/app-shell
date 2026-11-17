import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Dialog,
  Layout,
  Link,
  Toolbar,
  createColumnHelper,
  useDataTable,
  useNavigate,
  useToast,
  useURLCollectionVariables,
} from "@tailor-platform/app-shell";
import type {
  DataTableData,
  PageInfo,
  SelectionActionHelpers,
  TableMetadata,
} from "@tailor-platform/app-shell";

// --- Stand-ins for the app-local modules a real screen imports. ------------
// In a consuming app these are:
//   import { useQuery } from "urql";
//   import { graphql } from "@/graphql";
//   import { tableMetadata } from "@/graphql/generated/app-shell-datatable.generated";
// They are not exported, so they stay out of the rendered documentation.

type PurchaseOrder = {
  id: string;
  docNumber: string;
  supplierName: string;
  orderStatus: "DRAFT" | "SUBMITTED" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
  receiptStatus: "PENDING" | "PARTIAL" | "COMPLETE";
  grandTotal: number;
  currencyCode: string;
  orderDate: string;
  createdAt: string;
};

const tableMetadata = {
  purchaseOrder: {
    name: "purchaseOrder",
    pluralForm: "purchaseOrders",
    fields: [
      { name: "docNumber", type: "string", required: true, description: "PO Number" },
      { name: "supplierName", type: "string", required: true, description: "Supplier" },
      {
        name: "orderStatus",
        type: "enum",
        required: true,
        description: "Status",
        enumValues: ["DRAFT", "SUBMITTED", "CONFIRMED", "RECEIVED", "CANCELLED"],
      },
      {
        name: "receiptStatus",
        type: "enum",
        required: true,
        description: "Receipt",
        enumValues: ["PENDING", "PARTIAL", "COMPLETE"],
      },
      { name: "grandTotal", type: "number", required: true, description: "Total" },
      { name: "orderDate", type: "date", required: true, description: "Order Date" },
      { name: "createdAt", type: "datetime", required: true, description: "Created" },
    ],
  } satisfies TableMetadata,
};

const graphql = (source: TemplateStringsArray) => source.join("");

const SUPPLIERS = ["Acme Metals", "Northwind Packaging", "Globex Components", "Initech Supply"];
const ORDER_STATUSES = ["DRAFT", "SUBMITTED", "CONFIRMED", "RECEIVED", "CANCELLED"] as const;
const RECEIPT_STATUSES = ["PENDING", "PARTIAL", "COMPLETE"] as const;

const SAMPLE_ORDERS: PurchaseOrder[] = Array.from({ length: 47 }, (_, i) => {
  const day = String(28 - (i % 28)).padStart(2, "0");
  return {
    id: `po-${i + 1}`,
    docNumber: `PO-${String(1047 - i).padStart(5, "0")}`,
    supplierName: SUPPLIERS[i % SUPPLIERS.length],
    orderStatus: ORDER_STATUSES[i % ORDER_STATUSES.length],
    receiptStatus: RECEIPT_STATUSES[i % RECEIPT_STATUSES.length],
    grandTotal: 1200 + ((i * 7919) % 48000),
    currencyCode: "USD",
    orderDate: `2026-10-${day}`,
    createdAt: `2026-10-${day}T09:00:00Z`,
  };
});

// Serves SAMPLE_ORDERS as a cursor-paginated connection. Filters and sort are
// ignored; a real backend applies `variables.query` and `variables.order`.
function useQuery({ variables }: { query: string; variables: Record<string, unknown> }) {
  const { first, last, after, before } = variables as {
    first?: number;
    last?: number;
    after?: string;
    before?: string;
  };
  let start = after != null ? Number(after) + 1 : 0;
  let end = before != null ? Number(before) : SAMPLE_ORDERS.length;
  if (last != null) start = Math.max(0, end - last);
  else end = Math.min(end, start + (first ?? 20));
  const nodes = SAMPLE_ORDERS.slice(start, end);
  const pageInfo: PageInfo = {
    startCursor: String(start),
    endCursor: String(end - 1),
    hasNextPage: end < SAMPLE_ORDERS.length,
    hasPreviousPage: start > 0,
  };
  return [
    {
      data: {
        purchaseOrders: {
          edges: nodes.map((node) => ({ node })),
          pageInfo,
          total: SAMPLE_ORDERS.length as number | null,
        },
      },
      fetching: false,
      error: undefined as Error | undefined,
    },
  ] as const;
}

// Resolves with the ids it actually cancelled, which may be fewer than asked for.
async function cancelPurchaseOrders(ids: string[]): Promise<{ cancelledIds: string[] }> {
  return { cancelledIds: ids };
}

// --- The screen ------------------------------------------------------------

// The connection query takes the three variable groups the collection hook
// derives, and returns `edges`, `pageInfo` and `total`. `total` is what enables
// the First/Last controls and the page counter.
const PurchaseOrdersQuery = graphql`
  query PurchaseOrders(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $order: [PurchaseOrderOrderInput]
    $query: PurchaseOrderQueryInput
  ) {
    purchaseOrders(
      first: $first
      last: $last
      after: $after
      before: $before
      order: $order
      query: $query
    ) {
      edges {
        node {
          id
          docNumber
          supplierName
          orderStatus
          receiptStatus
          grandTotal
          currencyCode
          orderDate
          createdAt
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      total
    }
  }
`;

const { column, inferColumns } = createColumnHelper<PurchaseOrder>();

function usePurchaseOrderColumns() {
  return useMemo(() => {
    // `inferColumns` derives label, sort and filter config from the generated
    // metadata, so only rendering concerns are spelled out below. Reach for a
    // custom `render` only where no built-in `type` fits.
    const infer = inferColumns(tableMetadata.purchaseOrder);
    return [
      column({
        ...infer("docNumber"),
        // The primary identifier leads and stays put while other columns scroll.
        pin: "left",
        type: "link",
        accessor: (row) => row.docNumber,
        typeOptions: { href: (row) => `/purchase-orders/${row.id}` },
      }),
      column(infer("supplierName")),
      // The record's own lifecycle status: filled semantic variants.
      column({
        ...infer("orderStatus"),
        type: "badge",
        accessor: (row) => row.orderStatus,
        typeOptions: {
          badgeVariantMap: {
            DRAFT: "neutral",
            SUBMITTED: "info",
            CONFIRMED: "info",
            RECEIVED: "success",
            CANCELLED: "outline-error",
          },
          badgeLabelMap: {
            DRAFT: "Draft",
            SUBMITTED: "Submitted",
            CONFIRMED: "Confirmed",
            RECEIVED: "Received",
            CANCELLED: "Cancelled",
          },
        },
      }),
      // A second, derived status gets its own column rather than being folded
      // into the first — and outline variants, so it reads as secondary.
      column({
        ...infer("receiptStatus"),
        type: "badge",
        accessor: (row) => row.receiptStatus,
        typeOptions: {
          badgeVariantMap: {
            PENDING: "outline-neutral",
            PARTIAL: "outline-warning",
            COMPLETE: "outline-success",
          },
          badgeLabelMap: { PENDING: "Pending", PARTIAL: "Partial", COMPLETE: "Complete" },
        },
      }),
      column({
        ...infer("grandTotal"),
        type: "money",
        accessor: (row) => row.grandTotal,
        typeOptions: { currency: (row: PurchaseOrder) => row.currencyCode },
      }),
      column({ ...infer("orderDate"), type: "date", accessor: (row) => row.orderDate }),
    ];
  }, []);
}

export function DocumentCollection() {
  const navigate = useNavigate();
  const toast = useToast();

  // One hook: owns filter/sort/pagination state and persists filters, sort and
  // page size to the URL. Cursor is not persisted, so a refresh returns to
  // page one.
  const { variables, control } = useURLCollectionVariables({
    tableMetadata: tableMetadata.purchaseOrder,
    params: {
      pageSize: 25,
      initialSort: [{ field: "createdAt", direction: "Desc" }],
    },
  });

  // `variables.pagination` is a nested group (`first`/`after` or `last`/`before`),
  // so it is spread flat to match the query's arguments.
  const [{ data, fetching, error }] = useQuery({
    query: PurchaseOrdersQuery,
    variables: {
      ...variables.pagination,
      order: variables.order,
      query: variables.query,
    },
  });

  // Column definitions follow DataTable's "Adding a typed column" and
  // `inferColumns`; nothing about them is specific to this page.
  const columns = usePurchaseOrderColumns();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingCancel, setPendingCancel] = useState<{
    ids: string[];
    run: SelectionActionHelpers["run"];
  } | null>(null);

  const confirmCancel = async () => {
    if (!pendingCancel) return;
    const { ids, run } = pendingCancel;
    setPendingCancel(null);
    // `run` keeps the bulk-action bar's pending state on the request the
    // dialog started.
    const { cancelledIds } = await run(cancelPurchaseOrders(ids));
    // Report what the server did, not what was asked for.
    toast.success(`Cancelled ${cancelledIds.length} of ${ids.length} orders`);
    // Remove only what was cancelled, against the current selection, so rows
    // selected since the click stay selected.
    const done = new Set(cancelledIds);
    setSelectedIds((current) => current.filter((id) => !done.has(id)));
  };

  // `undefined` while the first page is in flight is meaningful — it is what
  // makes the table render its skeleton rather than an empty state.
  const tableData: DataTableData<PurchaseOrder> | undefined = useMemo(
    () =>
      data
        ? {
            rows: data.purchaseOrders.edges.map((edge) => edge.node),
            pageInfo: data.purchaseOrders.pageInfo,
            total: data.purchaseOrders.total,
          }
        : undefined,
    [data],
  );

  const table = useDataTable({
    columns,
    data: tableData,
    loading: fetching,
    error,
    control,
    // Persists the user's column show/hide, order and pinning choices.
    tableId: "purchase-orders",
    onClickRow: (row) => navigate(`/purchase-orders/${row.id}`),
    rowSelection: {
      selectedIds,
      onChange: setSelectedIds,
      // Rendered by `DataTable.Footer` beside the selection count. Only actions
      // that need no per-record follow-up belong here — a status transition,
      // not "amend" or "create sub-document".
      actions: [
        {
          id: "cancel",
          label: "Cancel orders",
          variant: "destructive",
          // `ids` is a click-time copy of the whole selection, including rows
          // on pages that were never loaded. Destructive, so it only opens the
          // confirm.
          onClick: (ids, { run }) => setPendingCancel({ ids, run }),
        },
      ],
    },
  });

  return (
    <>
      {/* `fill` pins the header, toolbar, column headers and pagination footer,
          leaving only the rows region to scroll. */}
      <Layout fill>
        <Layout.Header
          title="Purchase Orders"
          actions={[
            <Button key="create" render={<Link to="create" />}>
              Create Purchase Order
            </Button>,
          ]}
        />
        <Layout.Column>
          <DataTable.Root value={table}>
            <Toolbar.Root>
              <Toolbar.Row justify="between" aria-label="Purchase order table controls">
                <Toolbar.Group>
                  <DataTable.Filters />
                </Toolbar.Group>
                <Toolbar.Group>
                  <DataTable.ColumnSettings />
                </Toolbar.Group>
              </Toolbar.Row>
            </Toolbar.Root>
            <DataTable.Table />
            <DataTable.Footer>
              <DataTable.Pagination pageSizeOptions={[10, 25, 50, 100]} />
            </DataTable.Footer>
          </DataTable.Root>
        </Layout.Column>
      </Layout>

      <Dialog.Root
        open={pendingCancel !== null}
        onOpenChange={(open) => !open && setPendingCancel(null)}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Cancel {pendingCancel?.ids.length} purchase orders?</Dialog.Title>
            <Dialog.Description>
              Suppliers will no longer fulfil these orders. Cancelled orders can't be reopened.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="outline" />}>Keep orders</Dialog.Close>
            <Button variant="destructive" onClick={() => void confirmCancel()}>
              Cancel orders
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
