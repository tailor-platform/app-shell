import {
  Layout,
  Badge,
  DataTable,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { FlaskConical } from "lucide-react";
import { useMemo } from "react";

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

// Minimal client-side filter matcher so the demo's DataTable.Filters actually
// narrows the static rows. A real app filters server-side by passing the
// collection `query` variables to its GraphQL query instead.
function applyOperator(value: unknown, op: string, opValue: unknown): boolean {
  switch (op) {
    case "eq":
      return value === opValue;
    case "ne":
      return value !== opValue;
    case "gt":
      return (value as number) > (opValue as number);
    case "gte":
      return (value as number) >= (opValue as number);
    case "lt":
      return (value as number) < (opValue as number);
    case "lte":
      return (value as number) <= (opValue as number);
    case "between": {
      const { min, max } = opValue as { min: number | string; max: number | string };
      return (value as number) >= (min as number) && (value as number) <= (max as number);
    }
    case "in":
      return Array.isArray(opValue) && opValue.includes(value);
    case "nin":
      return Array.isArray(opValue) && !opValue.includes(value);
    case "contains":
      return String(value).toLowerCase().includes(String(opValue).toLowerCase());
    case "regex": {
      // Tailor's case-insensitive string filters commit a "(?i)"-prefixed
      // pattern (not valid JS regex), so strip it and set the `i` flag.
      const pattern = String(opValue);
      const ci = pattern.startsWith("(?i)");
      return new RegExp(ci ? pattern.slice(4) : pattern, ci ? "i" : "").test(String(value));
    }
    default:
      return true;
  }
}

function matchesQuery(
  row: Invoice,
  query: Record<string, Record<string, unknown>> | undefined,
): boolean {
  if (!query) return true;
  return Object.entries(query).every(([field, ops]) =>
    Object.entries(ops).every(([op, v]) => applyOperator(row[field as keyof Invoice], op, v)),
  );
}

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
    filter: { field: "customer", type: "string" },
  }),
  column({
    id: "email",
    label: "Billing email",
    type: "text",
    accessor: (r) => r.email,
    width: 240,
  }),
  column({
    id: "region",
    label: "Region",
    type: "text",
    accessor: (r) => r.region,
    width: 150,
    filter: {
      field: "region",
      type: "enum",
      options: REGIONS.map((r) => ({ value: r, label: r })),
    },
  }),
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
    filter: {
      field: "status",
      type: "enum",
      options: STATUSES.map((s) => ({ value: s, label: s })),
    },
  }),
  column({
    id: "amount",
    label: "Amount",
    type: "money",
    accessor: (r) => r.amount,
    width: 130,
    filter: { field: "amount", type: "number" },
  }),
  column({ id: "tax", label: "Tax", type: "money", accessor: (r) => r.tax, width: 110 }),
  column({ id: "total", label: "Total", type: "money", accessor: (r) => r.total, width: 130 }),
  // Intentionally no `width` — exercises measure-based pinning for an auto-width column.
  column({ id: "issued", label: "Issued", type: "date", accessor: (r) => r.issued }),
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

// ─── Page ──────────────────────────────────────────────────────────────────

const DataTableLabPage = () => {
  // `control` drives DataTable.Filters. Here we apply its query to the static
  // rows client-side; a real app passes `variables` to a server query.
  const { variables, control } = useCollectionVariables({ params: { pageSize: 50 } });
  const rows = useMemo(
    () => INVOICES.filter((r) => matchesQuery(r, variables.query)),
    [variables.query],
  );

  // Column settings + default pins + row actions. `tableId` persists the user's
  // layout (visibility, order, pinning) to localStorage across reloads.
  const settingsTable = useDataTable<Invoice>({
    columns: baseColumns.map((c) => (c.id === "id" ? { ...c, pin: "left" as const } : c)),
    data: { rows, total: rows.length },
    control,
    tableId: "lab-invoices-settings",
    rowActions,
  });

  return (
    <Layout>
      <Layout.Header title="DataTable Lab" />
      <Layout.Column>
        <div className="mb-8 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <strong>Prototype playground.</strong> Column visibility, ordering, and pinning for the
          DataTable. Open <strong>Columns</strong> to show/hide and drag columns between the Fixed
          left / Scrollable / Fixed right zones; scroll horizontally to see pinned columns stay put.
          Layout persists per table via <code>tableId</code>.
        </div>

        <Section
          title="Toolbar — filters + column settings"
          description={
            <>
              <strong>Add filter</strong> (left) and the <strong>Columns</strong> control (right)
              share one toolbar row. Open <strong>Columns</strong> to show/hide, drag to reorder,
              and drag between zones to pin left/right. The <em>Invoice</em> column is pinned left
              and the actions column is pinned right by default. Changes persist across reloads.
            </>
          }
        >
          <DataTable.Root value={settingsTable}>
            <DataTable.Toolbar columnSettings>
              <DataTable.Filters />
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
