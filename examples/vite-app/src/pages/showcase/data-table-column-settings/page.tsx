import { useMemo, type ReactNode } from "react";
import {
  Badge,
  DataTable,
  Layout,
  Toolbar,
  createColumnHelper,
  useCollectionVariables,
  useDataTable,
  useDataTableContext,
  type Column,
  type SortState,
  type AppShellPageProps,
  type DataTableData,
} from "@tailor-platform/app-shell";

// ─── Column settings prototype ──────────────────────────────────────────────────
//
// The real DataTable.ColumnSettings popover (fixed left / scrollable / fixed right
// zones, drag to reorder or pin), extended with a visibility checkbox on the left
// and a per-column sort select on the right. The change lives in core's
// column-settings.tsx — this page only mounts the stock component.

// ─── Dummy data ─────────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with real data later

type Invoice = {
  id: string;
  customer: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  createdAt: string;
};

const CUSTOMERS = ["Acme Corp", "Globex", "Initech", "Umbrella", "Soylent", "Hooli"];
const STATUSES: Invoice["status"][] = ["draft", "sent", "paid", "overdue"];

const INVOICES: Invoice[] = Array.from({ length: 40 }, (_, i) => ({
  id: `INV-${1000 + i}`,
  customer: CUSTOMERS[(i * 7) % CUSTOMERS.length],
  amount: Math.round(((i * 937) % 9000) + 100),
  status: STATUSES[(i * 5) % STATUSES.length],
  dueDate: new Date(Date.UTC(2026, 0, 1 + ((i * 13) % 270))).toISOString().slice(0, 10),
  createdAt: new Date(Date.UTC(2026, 0, 1 + ((i * 11) % 270), i % 24, (i * 7) % 60))
    .toISOString()
    .slice(0, 16),
}));

const { column } = createColumnHelper<Invoice>();

const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

const columns = [
  column({ label: "Invoice", render: (row) => row.id }),
  column({
    label: "Customer",
    render: (row) => row.customer,
    sort: { field: "customer", type: "string" },
  }),
  column({
    label: "Amount",
    render: (row) => money.format(row.amount),
    sort: { field: "amount", type: "number" },
  }),
  column({
    label: "Status",
    render: (row) => <Badge variant="neutral">{row.status}</Badge>,
    sort: { field: "status", type: "string" },
  }),
  column({
    label: "Due date",
    render: (row) => row.dueDate,
    sort: { field: "dueDate", type: "date" },
  }),
  column({
    label: "Created",
    render: (row) => row.createdAt.replace("T", " "),
    sort: { field: "createdAt", type: "date" },
  }),
];

// ─── Page ───────────────────────────────────────────────────────────────────────

function sortRows(rows: Invoice[], order: { field: string; direction: string }[] | undefined) {
  if (!order?.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { field, direction } of order) {
      const av = a[field as keyof Invoice];
      const bv = b[field as keyof Invoice];
      if (av === bv) continue;
      return (av < bv ? -1 : 1) * (direction === "Desc" ? -1 : 1);
    }
    return 0;
  });
}

// Live read-out of the active sort keys, in priority order.
function SortReadout() {
  const { sortStates, columns } = useDataTableContext<Record<string, unknown>>();
  const labelOf = (field: string) => columns.find((c) => c.sort?.field === field)?.label ?? field;
  return (
    <div className="text-body-sm text-muted-foreground">
      {sortStates.length === 0
        ? "Not sorted"
        : "Sorted by " +
          sortStates
            .map((s) => `${labelOf(s.field)} ${s.direction === "Asc" ? "↑" : "↓"}`)
            .join("  →  ")}
    </div>
  );
}

// ✅ Reusable Component: one table wired to local data, configurable per example.
function Demo({
  initialSort,
  multiple,
  cols = columns,
}: {
  initialSort: SortState[];
  multiple: boolean;
  cols?: Column<Invoice>[];
}) {
  const { variables, control } = useCollectionVariables({
    params: { pageSize: 15, initialSort },
  });
  const data = useMemo<DataTableData<Invoice>>(
    () => ({
      rows: sortRows(INVOICES, variables.order).slice(0, 8),
      pageInfo: { startCursor: null, endCursor: null, hasPreviousPage: false, hasNextPage: false },
      total: INVOICES.length,
    }),
    [variables.order],
  );
  const table = useDataTable({
    columns: cols,
    data,
    control,
    sort: multiple ? { multiple: true } : {},
  });
  return (
    <DataTable.Root value={table}>
      <Toolbar.Root>
        <Toolbar.Row justify="between" aria-label="Invoice table controls">
          <Toolbar.Group>
            <SortReadout />
          </Toolbar.Group>
          <Toolbar.Group>
            <DataTable.ColumnSettings />
          </Toolbar.Group>
        </Toolbar.Row>
      </Toolbar.Root>
      <DataTable.Table />
    </DataTable.Root>
  );
}

// Pinned example: Invoice fixed left, Created fixed right, both stay put while scrolling.
const pinnedColumns = columns.map((c, i) =>
  i === 0
    ? { ...c, pin: "left" as const }
    : i === columns.length - 1
      ? { ...c, pin: "right" as const }
      : c,
) as Column<Invoice>[];

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) => (
  <section className="mb-10">
    <h3 className="text-sm font-semibold">{title}</h3>
    <p className="mt-0.5 mb-2 text-body-sm text-muted-foreground">{hint}</p>
    {children}
  </section>
);

const DataTableColumnSettingsPage = () => (
  <Layout>
    <Layout.Header title="Column settings + sort" />
    <Layout.Column>
      <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
        <strong>Prototype.</strong> The stock Columns popover with the visibility checkbox on the
        left and a sort select on the right. Open <em>Columns</em> on each example below. Compare
        with the Sorting tab in PR #716.
      </div>

      <Section
        title="1. Multi-column sort"
        hint="Starts sorted by Status, then Amount (desc), then Due date. The number beside each select is its priority; the read-out on the left updates live."
      >
        <Demo
          multiple
          initialSort={[
            { field: "status", direction: "Asc" },
            { field: "amount", direction: "Desc" },
            { field: "dueDate", direction: "Asc" },
          ]}
        />
      </Section>

      <Section
        title="2. Single-column sort (library default)"
        hint="Picking a sort on another column replaces the current one, so no priority numbers appear."
      >
        <Demo multiple={false} initialSort={[{ field: "customer", direction: "Asc" }]} />
      </Section>

      <Section
        title="3. With fixed columns"
        hint="Invoice is fixed left and Created fixed right. Sorting, pinning and visibility all live in the same popover."
      >
        <Demo
          multiple
          initialSort={[{ field: "amount", direction: "Desc" }]}
          cols={pinnedColumns}
        />
      </Section>

      <Section
        title="4. Hide a sorted column"
        hint="In example 1, untick Status in Columns. The sort stays active (see the read-out) even though its column is gone. This is the hidden-sort case to design for."
      >
        <p className="text-body-sm text-muted-foreground">Use example 1 above.</p>
      </Section>
    </Layout.Column>
  </Layout>
);

DataTableColumnSettingsPage.appShellPageProps = {
  meta: { title: "Column settings + sort" },
} satisfies AppShellPageProps;

export default DataTableColumnSettingsPage;
