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
  poNumber: string;
  terms: string;
  currency: string;
  category: string;
  priority: string;
  department: string;
  discount: number;
  balance: number;
  createdBy: string;
  lastContact: string;
};

const CUSTOMERS = ["Acme Corp", "Globex", "Initech", "Umbrella", "Soylent", "Hooli", "Stark Ind."];
const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];
const OWNERS = ["A. Kimura", "B. Osei", "C. Lindqvist", "D. Alvarez", "E. Nakamura"];
const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];
const TERMS = ["Net 15", "Net 30", "Net 45", "Net 60"];
const CATEGORIES = ["Software", "Hardware", "Services", "Support", "Consulting"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const DEPARTMENTS = ["Sales", "Finance", "Operations", "Marketing", "Legal"];

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
      poNumber: `PO-${String(5000 + i)}`,
      terms: pick(TERMS),
      currency: "USD",
      category: pick(CATEGORIES),
      priority: pick(PRIORITIES),
      department: pick(DEPARTMENTS),
      discount: Math.round(rand() * 15 * 10) / 10,
      balance: Math.round(rand() * amount * 100) / 100,
      createdBy: pick(OWNERS),
      lastContact: new Date(base + Math.floor(rand() * 120) * 86_400_000)
        .toISOString()
        .slice(0, 10),
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
    label: "Billing email address for invoicing",
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
    label: "Primary account owner / relationship manager",
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
    label: "Internal notes, follow-up commentary, and account renewal reminders",
    type: "text",
    accessor: (r) => r.notes,
    width: 260,
    truncate: true,
  }),
  // Extra columns to exercise the column-settings popup with 20+ entries.
  column({
    id: "poNumber",
    label: "Purchase order reference number",
    type: "text",
    accessor: (r) => r.poNumber,
    width: 130,
  }),
  column({
    id: "terms",
    label: "Standard payment terms and conditions",
    type: "text",
    accessor: (r) => r.terms,
    width: 150,
  }),
  column({
    id: "currency",
    label: "Currency",
    type: "text",
    accessor: (r) => r.currency,
    width: 110,
  }),
  column({
    id: "category",
    label: "Category",
    type: "text",
    accessor: (r) => r.category,
    width: 150,
    filter: {
      field: "category",
      type: "enum",
      options: CATEGORIES.map((c) => ({ value: c, label: c })),
    },
  }),
  column({
    id: "priority",
    label: "Priority",
    type: "text",
    accessor: (r) => r.priority,
    width: 120,
  }),
  column({
    id: "department",
    label: "Department",
    type: "text",
    accessor: (r) => r.department,
    width: 150,
  }),
  column({
    id: "discount",
    label: "Discount",
    type: "text",
    accessor: (r) => `${r.discount}%`,
    width: 110,
  }),
  column({
    id: "balance",
    label: "Balance",
    type: "money",
    accessor: (r) => r.balance,
    width: 130,
  }),
  column({
    id: "createdBy",
    label: "Created by",
    type: "text",
    accessor: (r) => r.createdBy,
    width: 150,
  }),
  column({
    id: "lastContact",
    label: "Last contact",
    type: "date",
    accessor: (r) => r.lastContact,
    width: 150,
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

// ─── Expanded-row panel ──────────────────────────────────────────────────────
// The render prop owns its own layout entirely; DataTable only supplies the
// full-width row, the sticky wrapper and the accessible region around it.

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const lines = [
    { label: "Billing email", value: invoice.email },
    { label: "Region", value: invoice.region },
    { label: "Account owner", value: invoice.owner },
    { label: "Issued", value: invoice.issued },
    { label: "Due date", value: invoice.dueDate },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
      <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="contents">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
        <dt className="text-muted-foreground">Notes</dt>
        <dd className="text-muted-foreground">{invoice.notes}</dd>
      </dl>
      <div className="rounded-md border border-border p-3 text-sm">
        <div className="mb-2 font-medium">Totals</div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span>${invoice.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>${invoice.tax.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium">
          <span>Total</span>
          <span>${invoice.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

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
    columns: baseColumns.map((c) => {
      const pinned = c.id === "id" ? { ...c, pin: "left" as const } : c;
      // Demo: make every column filterable so the add-filter field list is long
      // enough to surface the field search (AppShell shows it past a threshold).
      return pinned.filter
        ? pinned
        : { ...pinned, filter: { field: c.id as string, type: "string" as const } };
    }),
    data: { rows, total: rows.length },
    control,
    tableId: "lab-invoices-settings",
    rowActions,
  });

  // Expandable rows next to everything they have to survive: selection, a
  // left-pinned column, row actions and horizontal scroll. `expandRowLabel`
  // returns the bare record identity — the accessible names ("Expand row
  // INV-1000", "INV-1000 details") are composed from it by AppShell.
  const expandTable = useDataTable<Invoice>({
    columns: baseColumns.map((c) => (c.id === "id" ? { ...c, pin: "left" as const } : c)),
    data: { rows, total: rows.length },
    control,
    tableId: "lab-invoices-expand",
    rowActions,
    onSelectionChange: () => {},
    renderExpandedRow: (row) => <InvoiceDetail invoice={row} />,
    canExpandRow: (row) => row.status !== "draft",
    expandRowLabel: (row) => row.id,
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

        <Section
          title="Expandable rows"
          description={
            <>
              Passing <code>renderExpandedRow</code> adds the chevron column at the left edge
              (auto-pinned after the selection column) and a full-width detail panel beneath each
              open row. Several rows can be open at once. <code>canExpandRow</code> hides the
              chevron on <em>draft</em> invoices. Scroll horizontally with a row open — the panel
              stays pinned to the left edge — and note that clicking the chevron never selects or
              triggers the row itself.
            </>
          }
        >
          <DataTable.Root value={expandTable}>
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
