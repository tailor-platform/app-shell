import { useMemo, useState } from "react";
import {
  Layout,
  Button,
  DataTable,
  Dialog,
  Toolbar,
  useDataTable,
  useCollectionVariables,
  useToast,
  createColumnHelper,
  type AppShellPageProps,
  type CollectionVariables,
  type DataTableData,
  type PageInfo,
  type SelectionAction,
} from "@tailor-platform/app-shell";
import { CheckSquare, Download, Pause, Play, Trash2 } from "lucide-react";

// ─── Dummy data ──────────────────────────────────────────────────────────────
// 🧪 Dummy Data: Replace with a real GraphQL-backed source later.

type VendorStatus = "active" | "inactive" | "archived";

// A `type` (not `interface`) so it satisfies `Record<string, unknown>` —
// `createColumnHelper`/`useDataTable`'s row constraint.
type Vendor = {
  id: string;
  code: string;
  name: string;
  category: string;
  owner: string;
  region: string;
  status: VendorStatus;
  spend: number;
  lastOrder: string;
};

const NAMES = [
  "Acme Corp",
  "Globex",
  "Initech",
  "Umbrella",
  "Soylent",
  "Hooli",
  "Stark Industries",
  "Wayne Supply",
  "Cyberdyne",
  "Tyrell Parts",
  "Vandelay Imports",
  "Gekko Trading",
];
const CATEGORIES = ["Raw material", "Packaging", "Logistics", "MRO", "Services", "Tooling"];
const OWNERS = ["A. Kimura", "B. Osei", "C. Lindqvist", "D. Alvarez", "E. Nakamura", "F. Bianchi"];
const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];
const STATUSES: VendorStatus[] = ["active", "inactive", "archived"];

// Deterministic pseudo-random so the dataset is stable across renders/reloads.
function makeVendors(count: number): Vendor[] {
  const rows: Vendor[] = [];
  let seed = 90210;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  const base = new Date("2026-01-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const name = pick(NAMES);
    rows.push({
      id: `VEN-${String(2000 + i)}`,
      code: `V${String(2000 + i)}`,
      // Suffix keeps names unique-ish across a long list without new fixtures.
      name: `${name} ${pick(["Ltd.", "GmbH", "K.K.", "Inc.", "SA"])}`,
      category: pick(CATEGORIES),
      owner: pick(OWNERS),
      region: pick(REGIONS),
      // Weighted so a random multi-select usually spans two or three statuses —
      // which is what makes the per-action counts in the footer interesting.
      status: rand() > 0.45 ? "active" : rand() > 0.4 ? "inactive" : pick(STATUSES),
      spend: Math.round((rand() * 480_000 + 4_000) * 100) / 100,
      lastOrder: new Date(base + Math.floor(rand() * 240) * 86_400_000).toISOString().slice(0, 10),
    });
  }
  return rows;
}

const INITIAL_VENDORS = makeVendors(240);

// ─── Local data source (stub for a GraphQL query) ────────────────────────────
// Sync (no simulated latency) so paging while a selection is open stays snappy
// — the point of this page is the footer, not the loading states.

function selectPage(vendors: Vendor[], variables: CollectionVariables): DataTableData<Vendor> {
  let rows = vendors;

  if (variables.order?.length) {
    const [{ field, direction }] = variables.order;
    const dir = direction === "Desc" ? -1 : 1;
    // `toSorted` would satisfy the lint rule but the app targets ES2020, so
    // sort a copy — the vendors state must not be mutated.
    // oxlint-disable-next-line unicorn/no-array-sort
    rows = [...rows].sort((a, b) => {
      const av = a[field as keyof Vendor];
      const bv = b[field as keyof Vendor];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const total = rows.length;

  // Cursor pagination — cursor === stringified index into the sorted list.
  const { first, after, last, before } = variables.pagination;
  let startIndex: number;
  let endIndex: number;
  if (last != null) {
    endIndex = before != null ? Number(before) : total;
    startIndex = Math.max(0, endIndex - last);
  } else {
    startIndex = after != null ? Number(after) + 1 : 0;
    endIndex = startIndex + (first ?? 25);
  }
  const page = rows.slice(startIndex, endIndex);

  const pageInfo: PageInfo = {
    startCursor: page.length ? String(startIndex) : null,
    endCursor: page.length ? String(startIndex + page.length - 1) : null,
    hasPreviousPage: startIndex > 0,
    hasNextPage: startIndex + page.length < total,
  };

  return { rows: page, pageInfo, total };
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const { column } = createColumnHelper<Vendor>();

const columns = [
  column({
    label: "Code",
    accessor: (row) => row.code,
    type: "text",
    width: 96,
    pin: "left",
    filter: { field: "code", type: "string" },
  }),
  column({
    label: "Vendor",
    accessor: (row) => row.name,
    type: "text",
    truncate: true,
    sort: { field: "name", type: "string" },
    filter: { field: "name", type: "string" },
  }),
  column({
    label: "Category",
    accessor: (row) => row.category,
    type: "text",
    width: 140,
    filter: {
      field: "category",
      type: "enum",
      options: CATEGORIES.map((c) => ({ value: c, label: c })),
    },
  }),
  column({ label: "Owner", accessor: (row) => row.owner, type: "text", width: 140 }),
  column({ label: "Region", accessor: (row) => row.region, type: "text", width: 150 }),
  column({
    label: "Status",
    accessor: (row) => row.status,
    type: "badge",
    width: 120,
    typeOptions: {
      badgeVariantMap: {
        active: "success",
        inactive: "outline-warning",
        archived: "neutral",
      },
      badgeLabelMap: { active: "Active", inactive: "Inactive", archived: "Archived" },
    },
    filter: {
      field: "status",
      type: "enum",
      options: STATUSES.map((s) => ({ value: s, label: s })),
    },
  }),
  column({
    label: "YTD spend",
    accessor: (row) => row.spend,
    type: "money",
    width: 140,
    sort: { field: "spend", type: "number" },
    filter: { field: "spend", type: "number" },
  }),
  column({
    label: "Last order",
    accessor: (row) => row.lastOrder,
    type: "date",
    width: 130,
    sort: { field: "lastOrder", type: "date" },
  }),
];

// ─── Page ────────────────────────────────────────────────────────────────────

type PendingDelete = { rows: Vendor[]; clearSelection: () => void };

const DataTableSelectionPage = () => {
  const toast = useToast();
  // 🧪 Dummy Data: local state stands in for mutations + a refetch.
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  // 🧪 Showcase control: compare the pinned footer with a page-scrolling table.
  const [fill, setFill] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const { variables, control } = useCollectionVariables({ params: { pageSize: 25 } });
  const data = useMemo(() => selectPage(vendors, variables), [vendors, variables]);

  const setStatus = (rows: Vendor[], status: VendorStatus) => {
    const ids = new Set(rows.map((row) => row.id));
    setVendors((prev) => prev.map((v) => (ids.has(v.id) ? { ...v, status } : v)));
  };

  // 🔽 Bulk actions. `appliesTo` gives each action its "(n)" count and passes
  // only the eligible rows to `onClick`; the footer disables an action at 0.
  const selectionActions: SelectionAction<Vendor>[] = [
    {
      id: "activate",
      label: "Activate",
      icon: <Play />,
      appliesTo: (v) => v.status === "inactive",
      onClick: (rows, { clearSelection }) => {
        setStatus(rows, "active");
        toast.success(`Activated ${rows.length} vendor(s)`);
        clearSelection();
      },
    },
    {
      id: "deactivate",
      label: "Deactivate",
      icon: <Pause />,
      appliesTo: (v) => v.status === "active",
      onClick: (rows, { clearSelection }) => {
        setStatus(rows, "inactive");
        toast.success(`Deactivated ${rows.length} vendor(s)`);
        clearSelection();
      },
    },
    {
      id: "export",
      label: "Export",
      icon: <Download />,
      // No `appliesTo`: applies to every selected row, so no count is shown.
      // Keeps the selection — exporting doesn't change the rows.
      onClick: (rows) => toast.success(`Exported ${rows.length} vendor(s)`),
    },
    {
      // Fourth action: lands in the footer's "More actions" menu.
      id: "delete",
      label: "Delete",
      icon: <Trash2 />,
      variant: "destructive",
      appliesTo: (v) => v.status === "archived",
      // Destructive: confirm first (interaction/confirm pattern).
      onClick: (rows, { clearSelection }) => setPendingDelete({ rows, clearSelection }),
    },
  ];

  const table = useDataTable({
    columns,
    data,
    loading: false,
    control,
    // `selectionActions` alone turns on the checkbox column.
    selectionActions,
  });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const ids = new Set(pendingDelete.rows.map((row) => row.id));
    setVendors((prev) => prev.filter((v) => !ids.has(v.id)));
    toast.error(`Deleted ${pendingDelete.rows.length} vendor(s)`);
    pendingDelete.clearSelection();
    setPendingDelete(null);
  };

  return (
    <Layout fill={fill}>
      <Layout.Header title="Bulk actions" />
      <Layout.Column>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            240 vendor records. Select a few rows: the footer becomes the bulk-action bar, and each
            action counts the selected rows it applies to — <em>Activate</em> only inactive vendors,{" "}
            <em>Delete</em> only archived ones — and disables at zero. Selection survives paging,
            and the header checkbox only adds or removes the current page. In <em>Page scroll</em>,
            the bar rides the bottom of the window until the table&apos;s end scrolls into view.
          </p>
          {/* 🧪 Showcase control */}
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border p-1">
            <Button size="xs" variant={fill ? "secondary" : "ghost"} onClick={() => setFill(true)}>
              Pinned footer
            </Button>
            <Button size="xs" variant={fill ? "ghost" : "secondary"} onClick={() => setFill(false)}>
              Page scroll
            </Button>
          </div>
        </div>

        <DataTable.Root value={table}>
          <Toolbar.Root>
            <Toolbar.Row justify="between" aria-label="Vendor table controls">
              <Toolbar.Group>
                <DataTable.Filters />
              </Toolbar.Group>
              <Toolbar.Group>
                <DataTable.ColumnSettings />
              </Toolbar.Group>
            </Toolbar.Row>
          </Toolbar.Root>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination pageSizeOptions={[25, 50, 100]} />
          </DataTable.Footer>
        </DataTable.Root>

        <Dialog.Root
          open={pendingDelete !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete {pendingDelete?.rows.length} archived vendor(s)?</Dialog.Title>
              <Dialog.Description>
                They will be removed from the vendor list. This action cannot be undone.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Layout.Column>
    </Layout>
  );
};

DataTableSelectionPage.appShellPageProps = {
  meta: {
    title: "Bulk actions",
    icon: <CheckSquare size={16} />,
  },
} satisfies AppShellPageProps;

export default DataTableSelectionPage;
