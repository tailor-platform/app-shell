import {
  Layout,
  Badge,
  DataTable,
  useDataTable,
  createColumnHelper,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { FlaskConical } from "lucide-react";
import { paths } from "../../routes.generated";

// ─── Dummy data ──────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with a real GraphQL-backed source later.

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

type Invoice = {
  id: string;
  customer: string;
  email: string;
  region: string;
  owner: string;
  status: InvoiceStatus;
  amount: number;
  tax: number;
  total: number;
  issued: string;
  dueDate: string;
  notes: string;
};

const CUSTOMERS = ["Acme Corp", "Globex", "Initech", "Umbrella", "Soylent", "Hooli", "Stark Ind."];
const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];
const OWNERS = ["A. Kimura", "B. Osei", "C. Lindqvist", "D. Alvarez", "E. Nakamura"];
const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

// Deterministic pseudo-random so the dataset is stable across renders/reloads.
function makeInvoices(count: number): Invoice[] {
  const rows: Invoice[] = [];
  let seed = 4242;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  for (let i = 0; i < count; i++) {
    const amount = Math.round((rand() * 9000 + 100) * 100) / 100;
    const tax = Math.round(amount * 0.1 * 100) / 100;
    const customer = pick(CUSTOMERS);
    const issued = new Date(base + Math.floor(rand() * 120) * 86_400_000);
    const due = new Date(issued.getTime() + 30 * 86_400_000);
    rows.push({
      id: `INV-${String(1000 + i)}`,
      customer,
      email: `billing@${customer.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      region: pick(REGIONS),
      owner: pick(OWNERS),
      status: pick(STATUSES),
      amount,
      tax,
      total: Math.round((amount + tax) * 100) / 100,
      issued: issued.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      notes: `Follow-up scheduled with ${pick(OWNERS)} regarding ${pick(REGIONS)} terms and renewal.`,
    });
  }
  return rows;
}

const INVOICES = makeInvoices(40);

const statusVariant = (status: InvoiceStatus) =>
  status === "paid"
    ? ("success" as const)
    : status === "overdue"
      ? ("outline-warning" as const)
      : status === "sent"
        ? ("outline-info" as const)
        : ("neutral" as const);

// ─── Columns ───────────────────────────────────────────────────────────────
// Widths are set on every column so pinned columns can compute sticky offsets.

const { column } = createColumnHelper<Invoice>();

const baseColumns = [
  column({ id: "id", label: "Invoice", type: "text", accessor: (r) => r.id, width: 130 }),
  column({
    id: "customer",
    label: "Customer",
    type: "text",
    accessor: (r) => r.customer,
    width: 180,
    sort: { field: "customer", type: "string" },
  }),
  column({
    id: "email",
    label: "Billing email",
    type: "text",
    accessor: (r) => r.email,
    width: 240,
  }),
  column({ id: "region", label: "Region", type: "text", accessor: (r) => r.region, width: 150 }),
  column({
    id: "owner",
    label: "Account owner",
    type: "text",
    accessor: (r) => r.owner,
    width: 160,
  }),
  column({
    id: "status",
    label: "Status",
    width: 120,
    render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
  }),
  column({ id: "amount", label: "Amount", type: "money", accessor: (r) => r.amount, width: 130 }),
  column({ id: "tax", label: "Tax", type: "money", accessor: (r) => r.tax, width: 110 }),
  column({ id: "total", label: "Total", type: "money", accessor: (r) => r.total, width: 130 }),
  column({ id: "issued", label: "Issued", type: "date", accessor: (r) => r.issued, width: 140 }),
  column({
    id: "dueDate",
    label: "Due date",
    type: "date",
    accessor: (r) => r.dueDate,
    width: 140,
  }),
  column({
    id: "notes",
    label: "Notes",
    type: "text",
    accessor: (r) => r.notes,
    width: 260,
    truncate: true,
  }),
];

const rowActions = [
  { id: "duplicate", label: "Duplicate", onClick: (r: Invoice) => alert(`Duplicate ${r.id}`) },
  {
    id: "delete",
    label: "Delete",
    variant: "destructive" as const,
    onClick: (r: Invoice) => alert(`Delete ${r.id}`),
  },
];

// ─── Section shell ───────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-3 mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

const data = { rows: INVOICES, total: INVOICES.length };

// ─── Page ──────────────────────────────────────────────────────────────────

const DataTableLabPage = () => {
  // Section 1 — all-in-one column settings + default pins + row actions.
  // `tableId` persists the user's layout to localStorage across reloads.
  const settingsTable = useDataTable<Invoice>({
    columns: baseColumns.map((c) => (c.id === "id" ? { ...c, pin: "left" as const } : c)),
    data,
    tableId: "lab-invoices-settings",
    rowActions,
  });

  // Section 2 — whole-row click navigation.
  const rowClickTable = useDataTable<Invoice>({
    columns: baseColumns.map((c) => (c.id === "id" ? { ...c, pin: "left" as const } : c)),
    data,
    tableId: "lab-invoices-rowclick",
    rowHref: (row) => paths.for("/dashboard/orders/:id", { id: row.id }),
  });

  // Section 3 — whole-row click + a clickable cell. The Customer cell is a
  // `link` column, so clicking it navigates to its own target instead of the
  // row's; clicking anywhere else opens the row's detail page.
  const cellLinkColumns = baseColumns.map((c) => {
    if (c.id === "id") return { ...c, pin: "left" as const };
    if (c.id === "customer") {
      return column({
        id: "customer",
        label: "Customer",
        type: "link",
        accessor: (r: Invoice) => r.customer,
        width: 180,
        typeOptions: { href: () => paths.for("/dashboard/products") },
      });
    }
    return c;
  });
  const cellLinkTable = useDataTable<Invoice>({
    columns: cellLinkColumns,
    data,
    tableId: "lab-invoices-celllink",
    rowHref: (row) => paths.for("/dashboard/orders/:id", { id: row.id }),
  });

  return (
    <Layout>
      <Layout.Header title="DataTable Lab" />
      <Layout.Column>
        <div className="mb-8 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <strong>Prototype playground.</strong> Compares column-settings surfaces and row-click
          navigation for the DataTable. Scroll each table horizontally to see pinned columns stay
          put. Column layout (visibility, order, pins) persists per table via <code>tableId</code>.
        </div>

        <Section
          title="1 · Column settings — all-in-one popover"
          description={
            <>
              Open <strong>Columns</strong> to show/hide, drag or use the arrows to reorder, and pin
              columns left/right. The <em>Invoice</em> column is pinned left and the actions column
              is pinned right by default. Changes persist across reloads.
            </>
          }
        >
          <DataTable.Root value={settingsTable}>
            <DataTable.Toolbar>
              <DataTable.ColumnSettings />
            </DataTable.Toolbar>
            <DataTable.Table />
          </DataTable.Root>
        </Section>

        <Section
          title="2 · Row click — whole row navigates"
          description={
            <>
              The entire row is a link to the detail page. The Invoice cell is a real{" "}
              <code>&lt;Link&gt;</code>: Tab to it and press Enter, or cmd/middle-click any row to
              open it in a new tab.
            </>
          }
        >
          <DataTable.Root value={rowClickTable}>
            <DataTable.Toolbar>
              <DataTable.ColumnSettings />
            </DataTable.Toolbar>
            <DataTable.Table />
          </DataTable.Root>
        </Section>

        <Section
          title="3 · Row click + clickable cell"
          description={
            <>
              Same whole-row navigation, but the <strong>Customer</strong> cell is its own link.
              Clicking the customer goes to Products; clicking anywhere else opens the invoice
              detail — no double navigation.
            </>
          }
        >
          <DataTable.Root value={cellLinkTable}>
            <DataTable.Toolbar>
              <DataTable.ColumnSettings />
            </DataTable.Toolbar>
            <DataTable.Table />
          </DataTable.Root>
        </Section>
      </Layout.Column>
    </Layout>
  );
};

DataTableLabPage.appShellPageProps = {
  meta: {
    title: "DataTable Lab",
    icon: <FlaskConical size={16} />,
  },
} satisfies AppShellPageProps;

export default DataTableLabPage;
