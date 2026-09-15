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

// Primary status column — filled semantic variants (one per row).
// Secondary status columns (e.g. delivery, billing) use outline-* instead.
const statusVariant = {
  draft: "neutral",
  confirmed: "info",
  shipped: "warning",
  delivered: "success",
} as const;

export const columns: Column<Order>[] = [
  { label: "Order #", accessor: (row) => row.orderNumber },
  { label: "Customer", accessor: (row) => row.customer },
  {
    label: "Status",
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
  {
    // Numeric columns right-align so digits line up. `type: "money" | "number"`
    // auto-right; with a custom `render` set `align` explicitly.
    label: "Amount",
    align: "right",
    render: (row) => `$${row.amount.toLocaleString()}`,
  },
  { label: "Created", accessor: (row) => row.createdAt },
];
