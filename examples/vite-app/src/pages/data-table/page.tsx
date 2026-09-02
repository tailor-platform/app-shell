import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Layout,
  Badge,
  DataTable,
  useDataTable,
  useCollectionVariables,
  createColumnHelper,
  type CollectionControl,
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
// One field per supported filter type so every editor/operator path is exercised:
// string, number, enum, boolean, uuid, date, datetime, time.
type Invoice = {
  id: string;
  /** uuid — matches `type: "uuid"` (eq / in). */
  externalId: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  /** boolean — matches `type: "boolean"` (is / is not). */
  recurring: boolean;
  /** ISO date, "YYYY-MM-DD" — matches what the date filter / Calendar emit. */
  dueDate: string;
  /** ISO datetime with a `Z` offset, "YYYY-MM-DDTHH:mm:ssZ" — `type: "datetime"`. */
  createdAt: string;
  /** 24h time, "HH:mm" — matches the native time input / `type: "time"`. */
  reminderAt: string;
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
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(rand() * 270); // ~9 months spread
    const hour = Math.floor(rand() * 24);
    const minute = Math.floor(rand() * 60);
    const dueMs = base + dayOffset * 86_400_000;
    const createdMs = dueMs + hour * 3_600_000 + minute * 60_000;
    const pad = (n: number) => String(n).padStart(2, "0");
    rows.push({
      id: `INV-${String(1000 + i)}`,
      externalId: `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`,
      customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
      amount: Math.round((rand() * 9000 + 100) * 100) / 100,
      status: STATUSES[Math.floor(rand() * STATUSES.length)],
      recurring: rand() > 0.5,
      dueDate: new Date(dueMs).toISOString().slice(0, 10),
      // Local "YYYY-MM-DDTHH:mm:ss" (no zone) — matches what the datetime filter
      // editor (date picker + time box) emits, so string comparison lines up.
      createdAt: new Date(createdMs).toISOString().slice(0, 19),
      reminderAt: `${pad(hour)}:${pad(minute)}`,
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
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
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
  // uuid → text input, eq only.
  column({
    label: "Ref",
    render: (row) => <span className="font-mono text-xs">{row.externalId.slice(0, 8)}…</span>,
    filter: { field: "externalId", type: "uuid" },
  }),
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
  // boolean → is / is not, True/False picker.
  column({
    label: "Recurring",
    render: (row) => (
      <Badge variant={row.recurring ? "info" : "outline-neutral"}>
        {row.recurring ? "Yes" : "No"}
      </Badge>
    ),
    filter: { field: "recurring", type: "boolean" },
  }),
  column({
    label: "Due date",
    render: (row) => dateFormatter.format(new Date(`${row.dueDate}T00:00:00`)),
    sort: { field: "dueDate", type: "date" },
    // `type: "date"` → single-date operators render the inline Calendar; the
    // "is between" range renders From/To DatePicker fields.
    filter: { field: "dueDate", type: "date" },
  }),
  // datetime → full numeric operator set; value is a strict ISO datetime string.
  column({
    label: "Created",
    render: (row) => dateTimeFormatter.format(new Date(row.createdAt)),
    sort: { field: "createdAt", type: "date" },
    filter: { field: "createdAt", type: "datetime" },
  }),
  // time → native time input, "HH:mm".
  column({
    label: "Reminder",
    render: (row) => row.reminderAt,
    filter: { field: "reminderAt", type: "time" },
  }),
];

// 🧪 Prototype: preset quick-filter tabs. Each maps to a status filter; "All"
// clears it. A common ERP pattern — shown here to trial the look on the toolbar.
const STATUS_TABS: { key: InvoiceStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "overdue", label: "Overdue" },
];

// 🧪 Preset status tabs, wired to the collection's `status` filter. "All" clears
// it; each other tab sets `status in [key]`.
function StatusTabs({ control }: { control: CollectionControl }) {
  const statusFilter = control.filters.find((f) => f.field === "status");
  const active =
    statusFilter && Array.isArray(statusFilter.value) && statusFilter.value.length === 1
      ? String(statusFilter.value[0])
      : "all";
  const select = (key: string) =>
    key === "all" ? control.removeFilter("status") : control.addFilter("status", "in", [key]);
  return (
    <div className="flex items-center gap-1">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => select(tab.key)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Reusable invoice table (own control + data). `toolbar` gets the collection
// control so each example can arrange the preset tabs + Add filter differently.
function InvoiceTable({ toolbar }: { toolbar: (control: CollectionControl) => ReactNode }) {
  const { variables, control } = useCollectionVariables({
    params: {
      pageSize: 10,
      initialSort: [{ field: "dueDate", direction: "Asc" }],
    },
  });

  const [data, setData] = useState<DataTableData<Invoice>>();
  const [loading, setLoading] = useState(true);
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
    <DataTable.Root value={table}>
      <DataTable.Toolbar>{toolbar(control)}</DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
      </DataTable.Footer>
    </DataTable.Root>
  );
}

function InfiniteInvoiceTable() {
  const { variables, control } = useCollectionVariables({
    params: {
      pageSize: 12,
      initialSort: [{ field: "dueDate", direction: "Asc" }],
    },
  });

  const [data, setData] = useState<DataTableData<Invoice>>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const append = variables.pagination.after != null;

    if (append) {
      setLoadingMore(true);
    } else {
      setData(undefined);
      setLoading(true);
    }

    queryInvoices(variables).then((result) => {
      if (id !== requestId.current) return;

      setData((prev) =>
        append && prev
          ? {
              rows: [...prev.rows, ...result.rows],
              pageInfo: result.pageInfo,
              total: result.total,
            }
          : result,
      );
      setLoading(false);
      setLoadingMore(false);
    });
  }, [variables]);

  const table = useDataTable({
    columns,
    data,
    loading,
    control,
    infiniteScroll: {
      loadingMore,
      onLoadMore: () => {
        const endCursor = data?.pageInfo?.endCursor;
        if (endCursor) {
          control.goToNextPage({ endCursor });
        }
      },
    },
  });

  return (
    <DataTable.Root value={table} className="h-full">
      <DataTable.Toolbar>
        <div className="flex items-center gap-2">
          <DataTable.Filters slot="add" addIconOnly />
          <StatusTabs control={control} />
        </div>
        <DataTable.Filters slot="chips" />
      </DataTable.Toolbar>
      <DataTable.Table />
    </DataTable.Root>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const DataTablePage = () => {
  return (
    <Layout>
      <Layout.Header title="DataTable + Filters" />
      <Layout.Column>
        <div className="mb-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <strong>Filterable invoice list.</strong> Data is supplied by a promise-based stub that
          takes the collection <code className="bg-muted px-1 py-0.5 rounded">variables</code>{" "}
          (filter <code className="bg-muted px-1 py-0.5 rounded">query</code>, order, cursor
          pagination) — a stand-in for the GraphQL query that would normally drive the table. The
          toolbar uses an icon-only <strong>Add filter</strong> button on the far left; active chips
          land on their own row below.
        </div>

        {/* With preset tabs */}
        <section className="mb-8">
          <h3 className="mb-2 text-sm font-semibold">With preset tabs</h3>
          <InvoiceTable
            toolbar={(control) => (
              <>
                {/* gap-2 matches the toolbar's p-2 so the icon sits an even step from the tabs */}
                <div className="flex items-center gap-2">
                  <DataTable.Filters slot="add" addIconOnly />
                  <StatusTabs control={control} />
                </div>
                <DataTable.Filters slot="chips" />
              </>
            )}
          />
        </section>

        {/* Without tabs */}
        <section className="mb-8">
          <h3 className="mb-2 text-sm font-semibold">Without tabs</h3>
          <InvoiceTable
            toolbar={() => (
              <>
                <DataTable.Filters slot="add" addIconOnly />
                <DataTable.Filters slot="chips" />
              </>
            )}
          />
        </section>

        {/* Infinite scroll */}
        <section className="mb-8">
          <h3 className="mb-2 text-sm font-semibold">Infinite scroll</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            Fixed-height wrapper +{" "}
            <code className="bg-muted px-1 py-0.5 rounded">infiniteScroll</code>. The consumer keeps
            appending <code className="bg-muted px-1 py-0.5 rounded">rows</code>; the table only
            detects the bottom and asks for the next chunk. No pagination footer.
          </p>
          <div className="h-[28rem] min-h-0">
            <InfiniteInvoiceTable />
          </div>
        </section>
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
