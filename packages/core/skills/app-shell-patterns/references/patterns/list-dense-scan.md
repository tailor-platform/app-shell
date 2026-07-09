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
import { DataTable, Layout, useDataTable, Button, Input } from "@tailor-platform/app-shell";
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
    // `fill` pins the page chrome for table-first pages: the title, toolbar,
    // column header row, and pagination footer stay visible at every viewport
    // height — only the table's rows region scrolls. Omit `fill` on pages
    // that should flow and scroll naturally (forms, dashboards, articles).
    <Layout fill>
      <Layout.Header
        title="Orders"
        actions={[
          <Button key="create" onClick={onCreateClick}>
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
```

## Page Layout & Internal Scrolling

Table-first pages should pin their chrome and scroll only the rows region. Wrap the page in `<Layout fill>`:

- `fill` stretches the layout to the available height and bounds the column row, so the `DataTable` shrinks to fit instead of growing past the viewport
- The `Layout.Header` (title/actions), `DataTable.Toolbar`, the column header row (sticky), and `DataTable.Footer` (pagination) stay visible at every viewport height — only the rows scroll vertically
- When the current page of rows fits, nothing stretches and no scrollbar appears — short tables render identically with or without `fill`
- Requires no extra styling on the page: the height chain (`AppShell` content area → `Layout fill` → `Layout.Column` → `DataTable.Root`) is wired by the components

Omit `fill` on pages that should flow and scroll naturally (forms, dashboards, articles) — the AppShell content area scrolls those.

## Variants

- **Toolbar chips only (`DataTable.Filters`)** — best when filters map cleanly to typed column metadata / enum facets
- **Tabs only above `DataTable`** — best when workflows are organized as obvious buckets
- **Tabs + chips** — when buckets are primary and finer filters help
- **Bulk selection** — `onSelectionChange` hook on `useDataTable`; combine with `interaction/multi-select`
- **`Table` primitives** — small static lists without collection hooks

## Constraints

- Column count: 4-8 recommended
- Must include pagination — never render unbounded lists
- Table-first pages use `<Layout fill>` so title/toolbar/header/footer stay pinned and only rows scroll
- Status Badge colors must use design system tokens (variant prop)
- Bulk actions toolbar appears only when ≥1 row is selected
- Whole row is clickable via `onClickRow`; no per-row "View" / "Open" buttons
- Per-row `Menu` (overflow `…`) is reserved for non-navigation actions (Archive, Duplicate, Delete)

## Anti-patterns

- Building a bespoke table + custom pagination instead of `DataTable` + `useCollectionVariables`
- Hand-rolled `max-height`/`overflow` wrappers around `DataTable` to contain scrolling — use `<Layout fill>` instead
- Tabs that mutate only local UI state while pagination/filters assume the full server set
- Using `<table>` directly instead of `<DataTable>` for live collections
- Client-side filtering on 1000+ records without server-side support
- Inline editable cells — use `pattern/detail/*` or `pattern/form/modal` instead
- Per-row "View" / "Open" buttons duplicating the row-click navigation
