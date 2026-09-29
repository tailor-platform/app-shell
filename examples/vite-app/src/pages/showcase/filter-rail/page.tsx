import { useMemo, useState } from "react";
import {
  DataTable,
  Layout,
  createColumnHelper,
  useDataTable,
  useURLCollectionVariables,
  type AppShellPageProps,
  type CollectionVariables,
  type DataTableData,
  type PageInfo,
} from "@tailor-platform/app-shell";
import { PanelLeft } from "lucide-react";

import { FilterRail } from "../../../filter-rail/FilterRail";
import { useLocalFacetCounts } from "../../../filter-rail/facet-counts";
import { applyOperator } from "../../../filter-rail/operators";
import { FilterRailSheet, FilterRailTrigger, useIsCompact } from "../../../filter-rail/responsive";
import { useRailLayout } from "../../../filter-rail/use-rail-layout";
import { useSavedFilters } from "../../../filter-rail/use-saved-filters";
import { railFields, type FilterRailSection } from "../../../filter-rail/types";
import { allProducts, type Product } from "../../../mock-products";

// ─── An exposed faceted filter rail ─────────────────────────────────────────────
//
// Every filterable axis rendered beside the results with live counts, instead of
// hidden behind a dropdown. A sibling to `DataTable` — it takes the same
// `CollectionControl` and writes the same `variables.query`, so there is no
// second filter engine and no boolean syntax for the user. A checkbox group IS
// the existing `in` operator.
//
// The component lives in `src/filter-rail/` and imports nothing from this app,
// so it can be lifted into the library as-is. `useLocalFacetCounts`,
// `useRailLayout` and `useSavedFilters` are companions, not part of it: against
// a real backend counts come from an aggregation query, and where a layout or a
// saved filter is stored is an application decision.
//
// One section per filter type `DataTable` supports, so the rail never has to
// hand a field back to the generic filter builder:
//
//   string → text    enum → checkbox/radio   boolean → boolean
//   number → numberRange   date → date / dateRange
//
// `tags` is deliberately NOT a facet. It is `string[]`, and `in` compares the
// whole cell against the options, so it would match nothing — faceting a
// list-valued field needs an operator the model does not expose. Leaving it out
// is more honest than shipping a facet that silently returns zero rows.

// ─── Rows ───────────────────────────────────────────────────────────────────────

/** `Product` plus two fields derived for filtering. */
type Row = Product & {
  /** A real boolean, to exercise the boolean control. */
  inStock: boolean;
  /** `publishedAt` is an ISO datetime; date controls commit `YYYY-MM-DD`. */
  publishedOn: string;
};

const ROWS: Row[] = allProducts.map((product) => ({
  ...product,
  inStock: product.stock > 0,
  publishedOn: product.publishedAt.slice(0, 10),
}));

const distinct = (pick: (row: Row) => string) =>
  [...new Set(ROWS.map(pick))].sort().map((value) => ({ value, label: value }));

const bounds = (pick: (row: Row) => number) => {
  const values = ROWS.map(pick);
  return { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) };
};

const PRICE = bounds((row) => row.price);
const STOCK = bounds((row) => row.stock);
const PUBLISHED = {
  min: ROWS.reduce((a, r) => (r.publishedOn < a ? r.publishedOn : a), ROWS[0].publishedOn),
  max: ROWS.reduce((a, r) => (r.publishedOn > a ? r.publishedOn : a), ROWS[0].publishedOn),
};

// ─── Local data source (stub for a GraphQL query) ───────────────────────────────

function matchesQuery(row: Row, query: CollectionVariables["query"]): boolean {
  if (!query) return true;
  return Object.entries(query).every(([field, ops]) =>
    Object.entries(ops).every(([op, value]) => applyOperator(row[field as keyof Row], op, value)),
  );
}

function queryProducts(variables: CollectionVariables): DataTableData<Row> {
  let rows = ROWS.filter((row) => matchesQuery(row, variables.query));

  if (variables.order?.length) {
    const [{ field, direction }] = variables.order;
    const dir = direction === "Desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[field as keyof Row] as string | number;
      const bv = b[field as keyof Row] as string | number;
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  const total = rows.length;
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
    accessor: (row) => row.status,
    type: "text",
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
    accessor: (row) => row.publishedOn,
    width: 130,
    sort: { field: "publishedOn", type: "string" },
  }),
  column({
    id: "availableOn",
    label: "Available",
    render: (row) => <span className="tabular-nums">{showDate(row.availableOn)}</span>,
    accessor: (row) => row.availableOn,
    width: 130,
    sort: { field: "availableOn", type: "string" },
  }),
];

// ─── Sections — the array order IS the screen order ─────────────────────────────

const SECTIONS: FilterRailSection[] = [
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
    anyLabel: "Any",
    options: distinct((row) => row.status),
  },
  {
    id: "category",
    label: "Category",
    control: "checkbox",
    field: "category",
    options: distinct((row) => row.category),
    // Biggest first, and on the BASELINE count so the order never moves. Sorting
    // by the live count would reorder rows under the cursor every time an
    // unrelated axis changed — the opposite of the muscle memory an exposed rail
    // exists to build.
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

// ─── Page ───────────────────────────────────────────────────────────────────────

const FilterRailPage = () => {
  const { variables, control } = useURLCollectionVariables({ params: { pageSize: 25 } });

  const counts = useLocalFacetCounts(ROWS, SECTIONS, control.filters, { baseline: true });
  const saved = useSavedFilters("example:filter-rail:saved-filters");
  const layout = useRailLayout("example:filter-rail:layout");
  const data = useMemo(() => queryProducts(variables), [variables]);

  const table = useDataTable<Row>({
    columns: COLUMNS,
    data,
    control,
    tableId: "filter-rail:products",
  });

  // Below `lg` the rail moves into a sheet behind a toolbar button — a fixed
  // 320px column stacked above the table would push every row off the fold.
  const compact = useIsCompact();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeRailFilters = useMemo(() => {
    const owned = railFields(SECTIONS);
    return control.filters.filter((filter) => owned.has(filter.field)).length;
  }, [control.filters]);

  const rowSummary = useMemo(() => {
    const total = data.total ?? data.rows.length;
    if (total === 0) return "No products match";
    const start = Number(data.pageInfo?.startCursor ?? 0) + 1;
    const end = Number(data.pageInfo?.endCursor ?? total - 1) + 1;
    if (start === 1 && end === total) return `${total.toLocaleString()} products`;
    return `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} products`;
  }, [data]);

  const rail = (
    <FilterRail
      control={control}
      sections={SECTIONS}
      counts={counts}
      saved={saved}
      layout={layout}
      className={compact ? "h-full rounded-none border-0" : "max-h-full"}
    />
  );

  return (
    <Layout fill>
      <Layout.Header title="Products" />

      {!compact && <Layout.Column area="left">{rail}</Layout.Column>}

      <Layout.Column area="main">
        <DataTable.Root value={table} className="overflow-hidden">
          {/* No `DataTable.Filters`. The rail already shows every active
              selection, and a chips row would duplicate that state somewhere it
              can disagree. A field belongs to one surface, not both. */}
          <DataTable.Toolbar columnSettings>
            {compact ? (
              <FilterRailTrigger count={activeRailFilters} onClick={() => setFiltersOpen(true)} />
            ) : undefined}
          </DataTable.Toolbar>
          <DataTable.Table />
          {/* `DataTable.Pagination` renders its own "N row(s)" and takes no label
              prop, so it is suppressed and replaced — on a screen whose job is
              narrowing, the useful number is how much of the set you are seeing. */}
          <DataTable.Footer className="gap-4 [&>div>div:first-child]:hidden">
            <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
              {rowSummary}
            </span>
            <DataTable.Pagination pageSizeOptions={[25, 50, 100]} />
          </DataTable.Footer>
        </DataTable.Root>
      </Layout.Column>

      {compact && (
        <FilterRailSheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          {rail}
        </FilterRailSheet>
      )}
    </Layout>
  );
};

FilterRailPage.appShellPageProps = {
  meta: {
    title: "Filter rail",
    icon: <PanelLeft size={16} />,
  },
} satisfies AppShellPageProps;

export default FilterRailPage;
