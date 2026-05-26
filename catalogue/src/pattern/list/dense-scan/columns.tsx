import type { Column } from "@tailor-platform/app-shell";
import { Badge } from "@tailor-platform/app-shell";

export type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  status: "draft" | "confirmed" | "shipped" | "delivered";
  amount: number;
  createdAt: string;
};

const statusVariant = {
  draft: "neutral",
  confirmed: "outline-info",
  shipped: "outline-warning",
  delivered: "outline-success",
} as const;

export const columns: Column<Order>[] = [
  { label: "Order #", accessor: (row) => row.orderNumber },
  { label: "Customer", accessor: (row) => row.customer },
  {
    label: "Status",
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
  {
    label: "Amount",
    render: (row) => `$${row.amount.toLocaleString()}`,
  },
  { label: "Created", accessor: (row) => row.createdAt },
];
