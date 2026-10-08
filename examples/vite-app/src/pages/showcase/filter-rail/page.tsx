import { useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  DataTable,
  FilterRail,
  Layout,
  Tabs,
  createColumnHelper,
  useCollectionVariables,
  useDataTable,
  useFilterRailCompact,
  useFilterRailCounts,
  useFilterRailLayout,
  useSavedViews,
  useURLCollectionVariables,
  type AppShellPageProps,
  type CollectionControl,
  type CollectionVariables,
  type DataTableData,
  type FilterRailSection,
  type PageInfo,
} from "@tailor-platform/app-shell";
import { PanelLeft } from "lucide-react";

import { allProducts, type Product } from "../../../mock-products";

// ─── FilterRail showcase ────────────────────────────────────────────────────────
//
// An always-visible faceted filter rail beside a DataTable. The rail and the
// table share one `CollectionControl`, so there is no second filter engine.
//
// Three variants prove the parts are optional:
//   Full        — every section type, counts, settings, saved views, sheet below lg
//   Checkboxes  — Root + Sections only
//   Radios      — radio + boolean + a custom section, no counts, no saved views

// ─── Rows ───────────────────────────────────────────────────────────────────────

// 🧪 Dummy Data: Replace with real data later
type Row = Product & {
  inStock: boolean;
  /** `publishedAt` is an ISO datetime; date sections commit `YYYY-MM-DD`. */
  publishedOn: string;
  priceBand: string;
};

const band = (price: number) =>
  price < 25 ? "Under $25" : price < 75 ? "$25 – $75" : price < 150 ? "$75 – $150" : "$150+";

const ROWS: Row[] = allProducts.map((product) => ({
  ...product,
  inStock: product.stock > 0,
  publishedOn: product.publishedAt.slice(0, 10),
  priceBand: band(product.price),
}));

const distinct = (pick: (row: Row) => string) =>
  [...new Set(ROWS.map(pick))].sort().map((value) => ({ value, label: value }));

const range = (pick: (row: Row) => number) => {
  const values = ROWS.map(pick);
  return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
};

const PRICE = range((row) => row.price);
const STOCK = range((row) => row.stock);
const PUBLISHED = {
  min: ROWS.reduce((a, r) => (r.publishedOn < a ? r.publishedOn : a), ROWS[0].publishedOn),
  max: ROWS.reduce((a, r) => (r.publishedOn > a ? r.publishedOn : a), ROWS[0].publishedOn),
};

// ─── Local data source (stands in for a GraphQL query) ─────────────────────────

function compare(a: unknown, b: unknown) {
  if (typeof a === "number" || typeof b === "number") return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function matches(value: unknown, op: string, operand: unknown): boolean {
  // The URL round-trip stringifies scalars, as a backend's input parsing would undo.
  const scalar =
    typeof value === "boolean" && typeof operand === "string" ? operand === "true" : operand;
  switch (op) {
    case "eq":
      return value === scalar;
    case "ne":
      return value !== scalar;
    case "gte":
      return compare(value, operand) >= 0;
    case "lte":
      return compare(value, operand) <= 0;
    case "between": {
      const { min, max } = operand as { min: unknown; max: unknown };
      return compare(value, min) >= 0 && compare(value, max) <= 0;
    }
    case "in":
      return Array.isArray(operand) && operand.map(String).includes(String(value));
    case "nin":
      return Array.isArray(operand) && !operand.map(String).includes(String(value));
    case "contains":
      return String(value).toLowerCase().includes(String(operand).toLowerCase());
    default:
      return true;
  }
}

function queryRows(variables: CollectionVariables): DataTableData<Row> {
  const query = variables.query ?? {};
  let rows = ROWS.filter((row) =>
    Object.entries(query).every(([field, ops]) =>
      Object.entries(ops as Record<string, unknown>).every(([op, operand]) =>
        matches(row[field as keyof Row], op, operand),
      ),
    ),
  );

  if (variables.order?.length) {
    const [{ field, direction }] = variables.order;
    const dir = direction === "Desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => compare(a[field as keyof Row], b[field as keyof Row]) * dir);
  }

  const total = rows.length;
  const { first, after, last, before } = variables.pagination;
  let start: number;
  let end: number;
  if (last != null) {
    end = before != null ? Number(before) : total;
    start = Math.max(0, end - last);
  } else {
    start = after != null ? Number(after) + 1 : 0;
    end = start + (first ?? 25);
  }
  const page = rows.slice(start, end);
  const pageInfo: PageInfo = {
    startCursor: page.length ? String(start) : null,
    endCursor: page.length ? String(start + page.length - 1) : null,
    hasPreviousPage: start > 0,
    hasNextPage: start + page.length < total,
  };
  return { rows: page, pageInfo, total };
}

// ─── Columns ────────────────────────────────────────────────────────────────────

const money = (value: number) => `$${value.toFixed(2)}`;
const showDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const { column } = createColumnHelper<Row>();

const COLUMNS = [
  column({
    id: "name",
    label: "Product",
    accessor: (row) => row.name,
    type: "text",
    width: 220,
    sort: { field: "name", type: "string" },
    pin: "left",
  }),
  column({
    id: "category",
    label: "Category",
    accessor: (row) => row.category,
    type: "text",
    width: 140,
    sort: { field: "category", type: "string" },
  }),
  column({
    id: "status",
    label: "Status",
    render: (row) => (
      <Badge variant={row.status === "Active" ? "success" : "neutral"}>{row.status}</Badge>
    ),
    width: 110,
  }),
  column({
    id: "price",
    label: "Price",
    render: (row) => <span className="tabular-nums">{money(row.price)}</span>,
    accessor: (row) => row.price,
    type: "number",
    align: "right",
    width: 110,
    sort: { field: "price", type: "number" },
  }),
  column({
    id: "stock",
    label: "Stock",
    accessor: (row) => row.stock,
    type: "number",
    align: "right",
    width: 90,
    sort: { field: "stock", type: "number" },
  }),
  column({
    id: "publishedOn",
    label: "Published",
    render: (row) => <span className="tabular-nums">{showDate(row.publishedOn)}</span>,
    width: 130,
    sort: { field: "publishedOn", type: "string" },
  }),
  column({
    id: "availableOn",
    label: "Available",
    render: (row) => <span className="tabular-nums">{showDate(row.availableOn)}</span>,
    width: 130,
    sort: { field: "availableOn", type: "string" },
  }),
];

// ─── Sections ───────────────────────────────────────────────────────────────────

/** Full: one of every built-in section type. Array order is screen order. */
const FULL_SECTIONS: FilterRailSection[] = [
  {
    id: "name",
    label: "Product name",
    control: "text",
    field: "name",
    operator: "contains",
    placeholder: "Search…",
  },
  {
    id: "status",
    label: "Status",
    control: "radio",
    field: "status",
    options: distinct((row) => row.status),
  },
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: distinct((row) => row.category),
    // Biggest first, on the baseline count so the order never moves under the cursor.
    sort: "baselineCount",
    truncate: 6,
  },
  {
    id: "inStock",
    label: "Availability",
    control: "boolean",
    field: "inStock",
    trueLabel: "In stock",
    falseLabel: "Out of stock",
  },
  {
    id: "price",
    label: "Price",
    control: "numberRange",
    field: "price",
    min: PRICE.min,
    max: PRICE.max,
    step: 1,
    unit: "$",
  },
  {
    id: "stock",
    label: "Stock on hand",
    control: "numberRange",
    field: "stock",
    min: STOCK.min,
    max: STOCK.max,
    step: 1,
  },
  {
    id: "publishedOn",
    label: "Published",
    control: "dateRange",
    field: "publishedOn",
    min: PUBLISHED.min,
    max: PUBLISHED.max,
  },
  {
    id: "availableOn",
    label: "Available on or after",
    control: "date",
    field: "availableOn",
    operator: "gte",
  },
];

/** Checkboxes only. */
const CHECKBOX_SECTIONS: FilterRailSection[] = [
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: distinct((row) => row.category),
    truncate: false,
  },
  {
    id: "priceBand",
    label: "Price band",
    control: "checkbox",
    field: "priceBand",
    // A curated vocabulary — authored order, never re-sorted.
    options: ["Under $25", "$25 – $75", "$75 – $150", "$150+"].map((value) => ({
      value,
      label: value,
    })),
  },
  {
    id: "status",
    label: "Status",
    control: "checkbox",
    field: "status",
    options: distinct((row) => row.status),
  },
];

/** Radios, boolean and a custom section. No counts. */
const RADIO_SECTIONS: FilterRailSection[] = [
  {
    id: "status",
    label: "Status",
    control: "radio",
    field: "status",
    options: distinct((row) => row.status),
  },
  {
    id: "inStock",
    label: "Availability",
    control: "boolean",
    field: "inStock",
    trueLabel: "In stock",
    falseLabel: "Out of stock",
    anyLabel: "All products",
  },
  {
    id: "stockLevel",
    label: "Stock level",
    hint: "A custom section writing its own filter.",
    control: "custom",
    fields: ["stock"],
    render: ({ getFilter, setFilter }) => {
      const current = getFilter("stock")?.value as { min: number; max: number } | undefined;
      const levels = [
        { label: "Low (1–20)", min: 1, max: 20 },
        { label: "Healthy (21–100)", min: 21, max: 100 },
        { label: "Overstocked (100+)", min: 101, max: STOCK.max },
      ];
      return (
        <div className="flex flex-wrap gap-1.5">
          {levels.map((level) => {
            const active = current?.min === level.min && current?.max === level.max;
            return (
              <button
                key={level.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setFilter(
                    "stock",
                    active
                      ? null
                      : { operator: "between", value: { min: level.min, max: level.max } },
                  )
                }
                className={
                  active
                    ? "rounded-md border border-transparent bg-accent px-2 py-1 text-xs"
                    : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {level.label}
              </button>
            );
          })}
        </div>
      );
    },
  },
];

// ─── Shared table ───────────────────────────────────────────────────────────────

const ProductsTable = ({
  control,
  variables,
  tableId,
}: {
  control: CollectionControl;
  variables: CollectionVariables;
  tableId: string;
}) => {
  const data = useMemo(() => queryRows(variables), [variables]);
  const table = useDataTable<Row>({ columns: COLUMNS, data, control, tableId });
  return (
    <DataTable.Root value={table} className="overflow-hidden">
      {/* No DataTable.Filters: a field belongs to one surface, not both. */}
      <DataTable.Toolbar columnSettings />
      <DataTable.Table />
      <DataTable.Footer>
        <DataTable.Pagination pageSizeOptions={[25, 50, 100]} />
      </DataTable.Footer>
    </DataTable.Root>
  );
};

// ─── Variant: Full ──────────────────────────────────────────────────────────────

const FullVariant = ({ header }: { header: ReactNode }) => {
  const { variables, control } = useURLCollectionVariables({ params: { pageSize: 25 } });
  const counts = useFilterRailCounts(ROWS, FULL_SECTIONS, control.filters, { baseline: true });
  const layout = useFilterRailLayout("showcase:products");
  const compact = useFilterRailCompact();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Saved views need the table, which lives in the main column.
  const data = useMemo(() => queryRows(variables), [variables]);
  const table = useDataTable<Row>({
    columns: COLUMNS,
    data,
    control,
    tableId: "filter-rail:full",
  });
  const views = useSavedViews(table, { storageKey: "showcase:products" });

  const rail = (
    <FilterRail.Root
      control={control}
      sections={FULL_SECTIONS}
      counts={counts}
      layout={layout}
      className={compact ? undefined : "max-h-full"}
    >
      <FilterRail.Header>
        <FilterRail.ClearAll />
        <FilterRail.Settings />
      </FilterRail.Header>
      <FilterRail.SavedViews {...views} />
      <FilterRail.Sections />
    </FilterRail.Root>
  );

  return (
    <Layout fill>
      {header}
      {!compact && <Layout.Column area="left">{rail}</Layout.Column>}
      <Layout.Column area="main">
        <DataTable.Root value={table} className="overflow-hidden">
          <DataTable.Toolbar columnSettings>
            {compact && (
              <FilterRail.Trigger
                control={control}
                sections={FULL_SECTIONS}
                onClick={() => setSheetOpen(true)}
              />
            )}
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination pageSizeOptions={[25, 50, 100]} />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>
      {compact && (
        <FilterRail.Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          {rail}
        </FilterRail.Sheet>
      )}
    </Layout>
  );
};

// ─── Variant: Checkboxes only ───────────────────────────────────────────────────

const CheckboxVariant = ({ header }: { header: ReactNode }) => {
  const { variables, control } = useCollectionVariables({ params: { pageSize: 25 } });
  const counts = useFilterRailCounts(ROWS, CHECKBOX_SECTIONS, control.filters);
  return (
    <Layout fill>
      {header}
      <Layout.Column area="left">
        <FilterRail.Root
          control={control}
          sections={CHECKBOX_SECTIONS}
          counts={counts}
          className="max-h-full"
        >
          <FilterRail.Sections />
        </FilterRail.Root>
      </Layout.Column>
      <Layout.Column area="main">
        <ProductsTable control={control} variables={variables} tableId="filter-rail:checkbox" />
      </Layout.Column>
    </Layout>
  );
};

// ─── Variant: Radios + custom ───────────────────────────────────────────────────

const RadioVariant = ({ header }: { header: ReactNode }) => {
  const { variables, control } = useCollectionVariables({ params: { pageSize: 25 } });
  return (
    <Layout fill>
      {header}
      <Layout.Column area="left">
        <FilterRail.Root
          control={control}
          sections={RADIO_SECTIONS}
          density="comfortable"
          className="max-h-full"
        >
          <FilterRail.Header title="Refine">
            <FilterRail.ClearAll />
          </FilterRail.Header>
          <FilterRail.Sections />
        </FilterRail.Root>
      </Layout.Column>
      <Layout.Column area="main">
        <ProductsTable control={control} variables={variables} tableId="filter-rail:radio" />
      </Layout.Column>
    </Layout>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────────

const VARIANTS = [
  { key: "full", label: "Full" },
  { key: "checkbox", label: "Checkboxes only" },
  { key: "radio", label: "Radios + custom" },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

const FilterRailPage = () => {
  const [variant, setVariant] = useState<VariantKey>("full");
  // Layout reads its Header / Column children directly, so each variant renders
  // its own Layout and receives the shared header.
  const header = (
    <Layout.Header title="Filter rail">
      <Tabs.Root
        value={variant}
        onValueChange={(next) => setVariant(next as VariantKey)}
        variant="capsule"
        size="sm"
      >
        <Tabs.List aria-label="Variant">
          {VARIANTS.map((item) => (
            <Tabs.Tab key={item.key} value={item.key}>
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </Layout.Header>
  );
  if (variant === "checkbox") return <CheckboxVariant header={header} />;
  if (variant === "radio") return <RadioVariant header={header} />;
  return <FullVariant header={header} />;
};

FilterRailPage.appShellPageProps = {
  meta: {
    title: "Filter rail",
    icon: <PanelLeft size={16} />,
  },
} satisfies AppShellPageProps;

export default FilterRailPage;
