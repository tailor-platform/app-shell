---
slug: pattern/list/dense-scan
name: Dense Scan List
category: pattern
subcategory: list
description: High-density scannable list for browsing large record sets
requiredImports: [DataTable, useDataTable, Button, Badge, Input]
tags: [table, bulk-action, filter, pagination]
do:
  - Displaying 50+ records in a scannable list
  - Status-based filtering is the primary navigation
  - Bulk actions are needed (delete, export, status change)
  - No inline editing — click-through to detail page
dont:
  - Using <table> directly instead of <DataTable>
  - Client-side filtering on 1000+ records without server-side support
  - Inline editable cells — use pattern/detail or pattern/form/modal instead
  - Omitting pagination for simplicity
---

# pattern/list/dense-scan

## When to Use

- Displaying 50+ records in a scannable list
- Status-based filtering is the primary navigation
- Bulk actions are needed (delete, export, status change)
- No inline editing — click-through to detail page

## Column Definition

```tsx
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
    render: (row) => `${row.amount.toLocaleString()}`,
  },
  { label: "Created", accessor: (row) => row.createdAt },
];
```

## Page Implementation

```tsx
/* pattern: list/dense-scan */
import { DataTable, useDataTable, Button, Input } from "@tailor-platform/app-shell";
import type { Order } from "./columns";
import { columns } from "./columns";
import type { DataTableData } from "@tailor-platform/app-shell";

type Props = {
  data: DataTableData<Order>;
  onCreateClick: () => void;
};

export default function DenseScanList({ data, onCreateClick }: Props) {
  const table = useDataTable({ data, columns });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input placeholder="Search orders..." className="max-w-sm" />
        <Button onClick={onCreateClick}>Create Order</Button>
      </div>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}
```

## Constraints

- Column count: 4-8 recommended
- Must include pagination — never render unbounded lists
- Status Badge colors must use design system tokens (variant prop)
- Bulk actions toolbar appears only when ≥1 row is selected

## Anti-patterns

- Using `<table>` directly instead of `<DataTable>`
- Client-side filtering on 1000+ records without server-side support
- Inline editable cells — use `pattern/detail/*` or `pattern/form/modal` instead
- Omitting pagination for "simplicity"
