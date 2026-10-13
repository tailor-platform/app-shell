import { Badge, Button, DataTable, Input, Layout, useDataTable } from "@tailor-platform/app-shell";
import type { Column } from "@tailor-platform/app-shell";

type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  status: "draft" | "confirmed" | "shipped" | "delivered";
  amount: number;
  createdAt: string;
};

const statusVariant = {
  draft: "neutral",
  confirmed: "info",
  shipped: "warning",
  delivered: "success",
} as const;

const columns: Column<Order>[] = [
  { label: "Order #", accessor: (row) => row.orderNumber },
  { label: "Customer", accessor: (row) => row.customer },
  {
    label: "Status",
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
  { label: "Amount", align: "right", render: (row) => `$${row.amount.toLocaleString()}` },
  { label: "Created", accessor: (row) => row.createdAt },
];

const orders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-001",
    customer: "Acme Corp",
    status: "confirmed",
    amount: 1500,
    createdAt: "2026-01-15",
  },
  {
    id: "2",
    orderNumber: "ORD-002",
    customer: "Globex Inc",
    status: "draft",
    amount: 3200,
    createdAt: "2026-01-16",
  },
  {
    id: "3",
    orderNumber: "ORD-003",
    customer: "Initech",
    status: "shipped",
    amount: 890,
    createdAt: "2026-01-17",
  },
  {
    id: "4",
    orderNumber: "ORD-004",
    customer: "Umbrella Corp",
    status: "delivered",
    amount: 4200,
    createdAt: "2026-01-18",
  },
  {
    id: "5",
    orderNumber: "ORD-005",
    customer: "Stark Industries",
    status: "confirmed",
    amount: 7800,
    createdAt: "2026-01-19",
  },
];

export function DenseScan() {
  const table = useDataTable({ data: { rows: orders, total: orders.length }, columns });

  return (
    <Layout>
      <Layout.Header
        title="Orders"
        actions={[
          <Button key="create" size="sm">
            Create Order
          </Button>,
        ]}
      />
      <Layout.Column>
        <DataTable.Root value={table}>
          <DataTable.Toolbar>
            <Input placeholder="Search orders..." className="max-w-sm" />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
    </Layout>
  );
}
