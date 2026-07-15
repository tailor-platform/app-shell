import { useEffect, useRef, useState } from "react";
import {
  Layout,
  Badge,
  DataTable,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
  type CollectionVariables,
  type PageInfo,
  type DataTableData,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { Table2 } from "lucide-react";

// ─── Dummy data ────────────────────────────────────────────────────────────────

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

// A `type` (not `interface`) so it satisfies `Record<string, unknown>` —
// `createColumnHelper`/`useDataTable`'s row constraint. Interfaces lack the
// implicit index signature that type aliases of object literals have.
type Invoice = {
  id: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  /** ISO date, "YYYY-MM-DD" — matches what the date filter / DatePicker emit. */
  dueDate: string;
};

const CUSTOMERS = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella",
  "Soylent",
  "Hooli",
  "Stark Industries",
];
const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

// Deterministic pseudo-random so the dataset is stable across renders/reloads.
function makeInvoices(count: number): Invoice[] {
  const rows: Invoice[] = [];
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(rand() * 270); // ~9 months spread
    const d = new Date(base + dayOffset * 86_400_000);
    rows.push({
      id: `INV-${String(1000 + i)}`,
      customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
      amount: Math.round((rand() * 9000 + 100) * 100) / 100,
      status: STATUSES[Math.floor(rand() * STATUSES.length)],
      dueDate: d.toISOString().slice(0, 10),
    });
  }
  return rows;
}

const ALL_INVOICES = makeInvoices(57);

// ─── Async data source (stub for a GraphQL query) ───────────────────────────────
// Mirrors a real resolver: takes the collection `variables` (filter `query`,
// `order`, cursor `pagination`) and resolves a connection-shaped page after a
// simulated network delay. Swap this out for `useQuery(gql\`...\`)` later.

function applyOperator(fieldValue: unknown, op: string, opValue: unknown): boolean {
  switch (op) {
    case "eq":
      return fieldValue === opValue;
    case "ne":
      return fieldValue !== opValue;
    case "gt":
      return (fieldValue as string | number) > (opValue as string | number);
    case "gte":
      return (fieldValue as string | number) >= (opValue as string | number);
    case "lt":
      return (fieldValue as string | number) < (opValue as string | number);
    case "lte":
      return (fieldValue as string | number) <= (opValue as string | number);
    case "between": {
      const { min, max } = opValue as { min: string | number; max: string | number };
      return (fieldValue as string | number) >= min && (fieldValue as string | number) <= max;
    }
    case "in":
      return Array.isArray(opValue) && opValue.includes(fieldValue);
    case "nin":
      return Array.isArray(opValue) && !opValue.includes(fieldValue);
    case "contains":
      return String(fieldValue).includes(String(opValue));
    case "regex": {
      // Tailor's case-insensitive filters use a "(?i)" prefix (not valid JS regex).
      const pattern = String(opValue);
      const ci = pattern.startsWith("(?i)");
      return new RegExp(ci ? pattern.slice(4) : pattern, ci ? "i" : "").test(String(fieldValue));
    }
    default:
      return true;
  }
}

function matchesQuery(row: Invoice, query: CollectionVariables["query"]): boolean {
  if (!query) return true;
  return Object.entries(query).every(([field, ops]) =>
    Object.entries(ops).every(([op, value]) =>
      applyOperator(row[field as keyof Invoice], op, value),
    ),
  );
}

async function queryInvoices(variables: CollectionVariables): Promise<DataTableData<Invoice>> {
  // 1. filter
  let rows = ALL_INVOICES.filter((r) => matchesQuery(r, variables.query));

  // 2. sort
  if (variables.order?.length) {
    const [{ field, direction }] = variables.order;
    const dir = direction === "Desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[field as keyof Invoice];
      const bv = b[field as keyof Invoice];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const total = rows.length;

  // 3. cursor pagination (cursor === stringified index into the filtered+sorted list)
  const { first, after, last, before } = variables.pagination;
  let startIndex: number;
  let endIndex: number;
  if (last != null) {
    endIndex = before != null ? Number(before) : total;
    startIndex = Math.max(0, endIndex - last);
  } else {
    startIndex = after != null ? Number(after) + 1 : 0;
    endIndex = startIndex + (first ?? 10);
  }
  const page = rows.slice(startIndex, endIndex);

  const pageInfo: PageInfo = {
    startCursor: page.length ? String(startIndex) : null,
    endCursor: page.length ? String(startIndex + page.length - 1) : null,
    hasPreviousPage: startIndex > 0,
    hasNextPage: startIndex + page.length < total,
  };

  // simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 450));
  return { rows: page, pageInfo, total };
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const { column } = createColumnHelper<Invoice>();

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const moneyFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

const statusVariant = (status: InvoiceStatus) =>
  status === "paid"
    ? ("success" as const)
    : status === "overdue"
      ? ("outline-warning" as const)
      : status === "sent"
        ? ("outline-info" as const)
        : ("neutral" as const);

const columns = [
  column({ label: "Invoice", render: (row) => row.id }),
  column({
    label: "Customer",
    render: (row) => row.customer,
    sort: { field: "customer", type: "string" },
    filter: { field: "customer", type: "string" },
  }),
  column({
    label: "Amount",
    render: (row) => moneyFormatter.format(row.amount),
    sort: { field: "amount", type: "number" },
    filter: { field: "amount", type: "number" },
  }),
  column({
    label: "Status",
    render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    filter: {
      field: "status",
      type: "enum",
      options: STATUSES.map((s) => ({ value: s, label: s })),
    },
  }),
  column({
    label: "Due date",
    render: (row) => dateFormatter.format(new Date(`${row.dueDate}T00:00:00`)),
    sort: { field: "dueDate", type: "date" },
    // `type: "date"` → the filter editor renders the app-shell DatePicker.
    filter: { field: "dueDate", type: "date" },
  }),
];

// ─── Page ──────────────────────────────────────────────────────────────────────

const DataTablePage = () => {
  const { variables, control } = useCollectionVariables({
    params: {
      pageSize: 10,
      initialSort: [{ field: "dueDate", direction: "Asc" }],
    },
  });

  const [data, setData] = useState<DataTableData<Invoice>>();
  const [loading, setLoading] = useState(true);
  // Toggle between the two add-filter UI variants for A/B testing.
  const [filterVariant, setFilterVariant] = useState<"menu" | "panel">("menu");
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    queryInvoices(variables).then((result) => {
      // Ignore out-of-order responses from superseded requests.
      if (id === requestId.current) {
        setData(result);
        setLoading(false);
      }
    });
  }, [variables]);

  const table = useDataTable({ columns, data, loading, control });

  return (
    <Layout>
      <Layout.Header title="DataTable + Filters" />
      <Layout.Column>
        <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <strong>Filterable invoice list.</strong> Data is supplied by a promise-based stub that
          takes the collection <code className="bg-muted px-1 py-0.5 rounded">variables</code>{" "}
          (filter <code className="bg-muted px-1 py-0.5 rounded">query</code>, order, cursor
          pagination) — a stand-in for the GraphQL query that would normally drive the table. Add a{" "}
          <strong>Due date</strong> filter to use the <strong>DatePicker</strong> as the input.
        </div>
        {/* A/B toggle for the two add-filter variants (demo only). */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Add-filter UI:</span>
          {(["menu", "panel"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilterVariant(v)}
              className={`rounded-md border px-2.5 py-1 ${
                filterVariant === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {v === "menu" ? "A · Nested menu" : "B · 3-column panel"}
            </button>
          ))}
        </div>
        <DataTable.Root value={table}>
          <DataTable.Toolbar>
            <DataTable.Filters addFilterVariant={filterVariant} />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
    </Layout>
  );
};

DataTablePage.appShellPageProps = {
  meta: {
    title: "DataTable + Filters",
    icon: <Table2 size={16} />,
  },
} satisfies AppShellPageProps;

export default DataTablePage;
