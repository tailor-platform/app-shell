import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Layout,
  Button,
  DataTable,
  useDataTable,
  useDataTableContext,
  useCollectionVariables,
  useToast,
  createColumnHelper,
  type AppShellPageProps,
  type CollectionVariables,
  type DataTableData,
  type PageInfo,
} from "@tailor-platform/app-shell";
import { CheckSquare, Pause, Play, Trash2 } from "lucide-react";

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

const ALL_VENDORS = makeVendors(240);

// ─── Local data source (stub for a GraphQL query) ────────────────────────────
// Sync (no simulated latency) so paging while a selection is open stays snappy
// — the point of this page is the footer, not the loading states.

function selectPage(variables: CollectionVariables): DataTableData<Vendor> {
  let rows = ALL_VENDORS;

  if (variables.order?.length) {
    const [{ field, direction }] = variables.order;
    const dir = direction === "Desc" ? -1 : 1;
    // `toSorted` would satisfy the lint rule but the app targets ES2020, so
    // sort a copy — ALL_VENDORS must not be mutated.
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

// ─── Selection footer bar ────────────────────────────────────────────────────
// ✅ Reusable Component: candidate for `DataTable.SelectionActions` in core —
// the bulk-action bar that takes over the footer while a selection is open.
//
// Actions live in the footer rather than the toolbar for two reasons: the row
// count already lives here (so the count and the things you can do to it stay
// together), and the footer is the only strip that is always on screen in a
// `<Layout fill>` table — the toolbar scrolls away on long pages.

type SelectionAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Rows in the selection this action actually applies to. Shown as "(n)". */
  count: number;
  variant?: "secondary" | "ghost" | "destructive";
  onClick: () => void;
};

function SelectionBar({ actions }: { actions: SelectionAction[] }) {
  const { selectedIds, clearSelection, total } = useDataTableContext<Vendor>();

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      {/* "20 of 240 selected" — the denominator is the whole filtered
          collection, not the current page, which is the scope the actions act
          on. `total` is null when the backend returns no count, so the bar
          falls back to the bare selected count. */}
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {total === null
          ? `${selectedIds.length} selected`
          : `${selectedIds.length} of ${total} selected`}
      </span>
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-current opacity-25" />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant ?? "secondary"}
            disabled={action.count === 0}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label} ({action.count})
          </Button>
        ))}
      </div>
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-current opacity-25" />
      <Button size="sm" variant="ghost" onClick={clearSelection}>
        Clear
      </Button>
    </div>
  );
}

// 🧪 Two candidate treatments for the active footer: `primary` is brand-tinted,
// `neutral` is a plain inverted surface (near-black in light mode, near-white in
// dark). `surface` is a class on the footer itself; `ink` feeds `toneTokens`,
// which re-points the surface tokens for everything inside the bar.
//
// Re-pointing tokens (rather than overriding class by class) is what lets the
// footer keep the *same* `DataTable.Pagination` in both states: its buttons,
// labels and page-size Select read `--foreground` / `--muted-foreground` /
// `--border` / `--accent`, so they re-theme themselves to the inverted surface
// with no `!important` and no descendant selectors.
//
// `ink` deliberately points at tokens `toneTokens` does not itself redefine
// (`--primary-foreground`, `--card`), otherwise the reference would be circular.
const TONES = {
  primary: { surface: "bg-primary", ink: "var(--primary-foreground)" },
  neutral: { surface: "bg-foreground", ink: "var(--card)" },
} as const;

type FooterTone = keyof typeof TONES;

function toneTokens(ink: string): CSSProperties {
  const tint = (pct: number) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`;
  return {
    color: ink,
    "--foreground": ink,
    "--muted-foreground": tint(75),
    // Outline controls read as ghost chips on the bar rather than light cards.
    "--background": "transparent",
    "--border": tint(25),
    "--input": tint(25),
    "--accent": tint(15),
    "--accent-foreground": ink,
    "--secondary": tint(15),
    "--secondary-foreground": ink,
    "--ring": tint(45),
  } as CSSProperties;
}

// ─── Page ────────────────────────────────────────────────────────────────────

const DataTableSelectionPage = () => {
  const toast = useToast();
  const [tone, setTone] = useState<FooterTone>("primary");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { variables, control } = useCollectionVariables({
    params: { pageSize: 25 },
  });

  const data = useMemo(() => selectPage(variables), [variables]);

  const table = useDataTable({
    columns,
    data,
    loading: false,
    control,
    // Providing `onSelectionChange` is what adds the checkbox column at the
    // left edge (header checkbox = select all on the current page).
    onSelectionChange: setSelectedIds,
  });

  // Per-action eligibility, counted across the whole selection — not just the
  // visible page — because selection is id-based and survives paging.
  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds);
    return ALL_VENDORS.filter((v) => ids.has(v.id));
  }, [selectedIds]);

  const countBy = (status: VendorStatus) =>
    selectedRows.filter((row) => row.status === status).length;

  const actions: SelectionAction[] = [
    {
      id: "activate",
      label: "Activate",
      icon: <Play />,
      count: countBy("inactive"),
      onClick: () => toast.success(`Activated ${countBy("inactive")} vendor(s)`),
    },
    {
      id: "deactivate",
      label: "Deactivate",
      icon: <Pause />,
      count: countBy("active"),
      onClick: () => toast.success(`Deactivated ${countBy("active")} vendor(s)`),
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 />,
      variant: "destructive",
      count: countBy("archived"),
      onClick: () => toast.error(`Deleted ${countBy("archived")} vendor(s)`),
    },
  ];

  const hasSelection = selectedIds.length > 0;

  return (
    // `fill` pins the toolbar and footer so the selection bar stays on screen
    // while the 240 rows scroll behind it.
    <Layout fill>
      <Layout.Header title="Multi-select — footer actions" />
      <Layout.Column>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            240 vendor records with a checkbox column. Select a few rows — the footer swaps the row
            count for the bulk-action bar and inverts its surface. Each action is counted against
            the selection — <em>Activate</em> only applies to inactive vendors, <em>Delete</em> only
            to archived ones — and disables at zero. Selection is id-based, so it survives paging.
          </p>
          {/* 🧪 Prototype control: compare the two active-footer treatments. */}
          <div className="flex shrink-0 items-center gap-1 rounded-md border border-border p-1">
            {(Object.keys(TONES) as FooterTone[]).map((key) => (
              <Button
                key={key}
                size="xs"
                variant={tone === key ? "secondary" : "ghost"}
                onClick={() => setTone(key)}
                className="capitalize"
              >
                {key}
              </Button>
            ))}
          </div>
        </div>

        <DataTable.Root value={table}>
          <DataTable.Toolbar columnSettings>
            <DataTable.Filters />
          </DataTable.Toolbar>
          <DataTable.Table />
          {/* `rounded-b-md` matches the Root's own corner radius: the footer's
              background is what paints the bottom of the card once a selection
              tints it, so without this it would square off the rounded frame.
              `min-h-13` keeps both states the same height so switching between
              them doesn't nudge the table above. */}
          <DataTable.Footer
            className={`min-h-13 rounded-b-md transition-colors ${
              hasSelection ? TONES[tone].surface : ""
            }`}
          >
            {/* Inner row carries the tone's token overrides — the footer itself
                only paints the surface, so its own tokens stay intact. */}
            <div
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-2"
              style={hasSelection ? toneTokens(TONES[tone].ink) : undefined}
            >
              {hasSelection && <SelectionBar actions={actions} />}
              {/* One Pagination in both states, so the right-hand cluster (rows
                  per page, page counter, first/prev/next/last) is identical
                  whether or not a selection is open. While the bar is up its
                  row-info text is hidden — the bar's own "N selected" owns that
                  slot — leaving the controls pushed right by their own ml-auto.
                  min-w-110: below ~440px of leftover space the cluster drops to
                  its own line instead of squeezing the bar. `whitespace-nowrap`
                  is inherited, so the page counter stays on one line. */}
              <div
                className={`min-w-110 flex-1 whitespace-nowrap ${
                  hasSelection ? "[&>div>div:first-child]:hidden" : ""
                }`}
              >
                <DataTable.Pagination pageSizeOptions={[25, 50, 100]} />
              </div>
            </div>
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
    </Layout>
  );
};

DataTableSelectionPage.appShellPageProps = {
  meta: {
    title: "Multi-select footer",
    icon: <CheckSquare size={16} />,
  },
} satisfies AppShellPageProps;

export default DataTableSelectionPage;
