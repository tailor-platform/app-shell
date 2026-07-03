---
slug: pattern/list/dense-scan
name: Dense Scan List
category: pattern
subcategory: list
description: High-density scannable list backed by GraphQL connections with DataTable, sort, filters, and pagination
requiredImports:
  [
    DataTable,
    useDataTable,
    useCollectionVariables,
    createColumnHelper,
    Layout,
    Card,
    Button,
    Badge,
    Link,
    Menu,
    Tabs,
  ]
tags: [table, bulk-action, filter, pagination, datatable, connection]
do:
  - Browsing many records of one entity type (orders, POs, products) with GraphQL pagination
  - Operators sort, filter, and select rows; row click navigates to detail
  - Optionally a bucket control (Tabs) aligned to one categorical dimension (status, type)
dont:
  - Side-by-side match/reconcile views comparing two grids
  - A tiny/static list where DataTable would be heavyweight — use Table.Root manually
  - Inline editable cells — use pattern/detail or pattern/form/modal instead
---

# pattern/list/dense-scan

## When to Use

- Browsing many records of one entity type (orders, POs, products, invoices) with GraphQL pagination
- Operators sort, filter, and select rows; row click navigates to detail
- Optionally: a bucket control (`Tabs`, segmented buttons) aligned to one categorical dimension the business cares about (status, fulfillment stage, type)

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

## Variants

- **Toolbar chips only (`DataTable.Filters`)** — best when filters map cleanly to typed column metadata / enum facets
- **Tabs only above `DataTable`** — best when workflows are organized as obvious buckets
- **Tabs + chips** — when buckets are primary and finer filters help
- **Bulk selection** — `onSelectionChange` hook on `useDataTable`; combine with `interaction/multi-select`
- **`Table` primitives** — small static lists without collection hooks

## Constraints

- Column count: 4-8 recommended
- Must include pagination — never render unbounded lists
- Handle every state: `DataTable` renders the loading skeleton and error row; always provide a **labelled empty state** (what the list is + how to add the first record) rather than a bare empty table
- Status Badge colors must use design system tokens (variant prop): the **primary** status column uses **filled** semantic variants; **secondary** status columns (delivery, billing) use **`outline-*`** (see `design-system.md` → Composition & emphasis rules)
- Bulk actions toolbar appears only when ≥1 row is selected
- Whole row is clickable via `onClickRow`; no per-row "View" / "Open" buttons
- Per-row `Menu` (overflow `…`) is reserved for non-navigation actions (Archive, Duplicate, Delete)

## Anti-patterns

- Building a bespoke table + custom pagination instead of `DataTable` + `useCollectionVariables`
- Tabs that mutate only local UI state while pagination/filters assume the full server set
- Using `<table>` directly instead of `<DataTable>` for live collections
- Client-side filtering on 1000+ records without server-side support
- Inline editable cells — use `pattern/detail/*` or `pattern/form/modal` instead
- Per-row "View" / "Open" buttons duplicating the row-click navigation
