# DataTable API Reference

This document describes the DataTable API as currently implemented in `@tailor-platform/app-shell`.

## Compound Component: `DataTable`

```tsx
export const DataTable = {
  Root, // Context provider + outer container (accepts useDataTable return value)
  Toolbar, // Toolbar container for filters and actions
  Filters, // Auto-generated filter chips from column filter configs
  Table, // <table> with built-in Headers + Body
  Footer, // Footer container for pagination and other content
  Pagination, // Pre-built pagination controls
  Row, // Thin wrapper around Table.Row (for custom Body children)
  Cell, // Thin wrapper around Table.Cell (for custom Body children)
} as const;
```

**Usage pattern:**

```tsx
const { variables, control } = useCollectionVariables({ params: { pageSize: 20 } });
const [result] = useQuery({
  query: GET_ORDERS,
  variables: { ...variables.pagination, query: variables.query, order: variables.order },
});

const table = useDataTable({
  columns,
  data: {
    rows: result.data?.orders?.edges.map((e) => e.node) ?? [],
    pageInfo: result.data?.orders?.pageInfo,
    total: result.data?.orders?.total,
  },
  loading: result.fetching,
  control,
  onClickRow: (row) => navigate(`/orders/${row.id}`),
  rowActions: [
    { id: "delete", label: "Delete", variant: "destructive", onClick: (row) => handleDelete(row) },
  ],
});

<DataTable.Root value={table}>
  <DataTable.Toolbar>
    <DataTable.Filters />
  </DataTable.Toolbar>
  <DataTable.Table />
  <DataTable.Footer>
    <DataTable.Pagination pageSizeOptions={[10, 20, 50]} />
  </DataTable.Footer>
</DataTable.Root>;
```

**Sub-component props:**

| Sub-component          | Props                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `DataTable.Root`       | `value: UseDataTableReturn<TRow>`, `className?`, `children` |
| `DataTable.Toolbar`    | `className?`, `children`                                    |
| `DataTable.Filters`    | `className?` (reads columns/filters from context)           |
| `DataTable.Table`      | `className?` (renders Headers + Body internally)            |
| `DataTable.Footer`     | `className?`, `children`                                    |
| `DataTable.Pagination` | `pageSizeOptions?: number[]`                                |
| `DataTable.Row`        | `ComponentProps<"tr">` (pass-through to `Table.Row`)        |
| `DataTable.Cell`       | `ComponentProps<"td">` (pass-through to `Table.Cell`)       |

## Hook: `useDataTable<TRow>(options)`

```ts
function useDataTable<TRow extends Record<string, unknown>>(
  options: UseDataTableOptions<TRow>,
): UseDataTableReturn<TRow>;

interface DataTableData<TRow> {
  rows: TRow[];
  pageInfo?: PageInfo;
  total?: number | null;
}

interface UseDataTableOptions<TRow extends Record<string, unknown>> {
  columns: Column<TRow>[];
  data: DataTableData<TRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  control?: CollectionControl;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}

interface UseDataTableReturn<TRow extends Record<string, unknown>> {
  // Data
  rows: TRow[];
  loading: boolean;
  error: Error | null;
  sortStates: SortState[];
  onSort?: (field: string, direction?: "Asc" | "Desc") => void;

  // Pagination (derived from data + control)
  pageInfo: PageInfo;
  total: number | null;
  totalPages: number | null;
  nextPage: (token: string) => void;
  prevPage: (token: string) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;

  // Column management
  columns: Column<TRow>[];
  visibleColumns: Column<TRow>[];
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  isColumnVisible: (fieldOrId: string) => boolean;

  // Row operations (optimistic updates)
  updateRow: (rowId: string, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: string) => { rollback: () => void; deletedRow: TRow };
  insertRow: (row: TRow) => { rollback: () => void };

  // Passthrough
  control: CollectionControl | undefined;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}
```

## Hook: `useDataTableContext<TRow>()`

```ts
function useDataTableContext<TRow extends Record<string, unknown>>(): DataTableContextValue<TRow>;
```

Accesses the DataTable context from within `DataTable.Root`. Throws if used outside of `DataTable.Root`.

## Hook: `useCollectionVariables(options)`

Two overloads: with `tableMetadata` (typed field names) and without (string field names).

```ts
// Overload 1: With metadata (typed field names + auto-built query variables)
function useCollectionVariables<TTable extends TableMetadata>(
  options: UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
    tableMetadata: TTable;
  },
): UseCollectionReturn<TableFieldName<TTable>, { query: BuildQueryVariables<TTable> | undefined; order: ...; pagination: PaginationVariables }, TableMetadataFilter<TTable>>;

// Overload 2: Without metadata (plain string field names)
function useCollectionVariables(
  options: UseCollectionOptions & { tableMetadata?: never },
): UseCollectionReturn<string, CollectionVariables>;

interface UseCollectionOptions<TFieldName = string, TFilter = Filter<TFieldName>> {
  params?: {
    initialFilters?: TFilter[];
    initialSort?: { field: TFieldName; direction: "Asc" | "Desc" }[];
    pageSize?: number;  // default: 20
  };
}

interface UseCollectionReturn<TFieldName, TVariables, TFilter = Filter<TFieldName>> {
  variables: TVariables;                    // { query, order, pagination }
  control: CollectionControl<TFieldName, TFilter>;
}

interface CollectionControl<TFieldName = string, TFilter = Filter<TFieldName>> {
  // Filters
  filters: Filter[];
  addFilter<F extends TFieldName>(field: F, operator: OperatorForField<TFilter, F>, value: unknown): void;
  setFilters(filters: Filter[]): void;
  removeFilter(field: TFieldName): void;
  clearFilters(): void;

  // Sort
  sortStates: SortState[];
  setSort(field: TFieldName, direction?: "Asc" | "Desc"): void;
  clearSort(): void;

  // Pagination
  pageSize: number;
  setPageSize(size: number): void;
  cursor: string | null;
  paginationDirection: "forward" | "backward";
  nextPage(token: string): void;
  prevPage(token: string): void;
  resetPage(): void;
  currentPage: number;
  goToFirstPage(): void;
  goToLastPage(lastPage: number): void;
}
```

## Component: `DataTable.Pagination`

```tsx
interface DataTablePaginationProps {
  pageSizeOptions?: number[]; // e.g. [10, 20, 50, 100]
}
```

Reads context from `useDataTableContext()` and `useCollectionControl()`. Must be used within `DataTable.Root` (which provides `CollectionControlProvider` when `control` is given).

Uses `lucide-react` icons (`ChevronsLeft`, `ChevronLeft`, `ChevronRight`, `ChevronsRight`) and app-shell `Button` / `Select` components. Labels are provided via `defineI18nLabels`.

## Component: `DataTable.Filters`

Reads filterable columns (columns with a `filter` config) from context and renders:

- **Active filter chips** — popover-based editors per filter type (enum, boolean, string, uuid, number, date)
- **Add filter button** — popover to select field, operator, and value

Requires `CollectionControl` from context (provided by `DataTable.Root` when `control` is passed to `useDataTable`).

## Helper: `createColumnHelper<TRow>()`

```ts
function createColumnHelper<TRow extends Record<string, unknown>>(): {
  column: (options: ColumnOptions<TRow>) => Column<TRow>;
  inferColumns: <TTable extends TableMetadata>(
    tableMetadata: TTable,
  ) => (dataKey: TableFieldName<TTable>, options?: MetadataFieldOptions) => ColumnOptions<TRow>;
};
```

**Usage:**

```tsx
const { column, inferColumns } = createColumnHelper<Order>();

const infer = inferColumns(tableMetadata.order);
const columns = [
  column(infer("title")),
  column({ ...infer("status"), render: (row) => <StatusBadge value={row.status} /> }),
  column({ label: "Actions", render: (row) => <button>Edit {row.name}</button> }),
];
```

## Types

### Column Definition

```ts
interface ColumnOptions<TRow extends Record<string, unknown>> {
  label?: string;
  render: (row: TRow) => ReactNode;
  id?: string;
  width?: number;
  accessor?: (row: TRow) => unknown;
  sort?: SortConfig;
  filter?: FilterConfig;
}

type Column<TRow extends Record<string, unknown>> = ColumnOptions<TRow>;
```

### Sort & Filter Configuration

```ts
type SortConfig =
  | { field: string; type: "string" }
  | { field: string; type: "number" }
  | { field: string; type: "date" }
  | { field: string; type: "boolean" };

type FilterConfig =
  | { field: string; type: "string" }
  | { field: string; type: "number" }
  | { field: string; type: "date" }
  | { field: string; type: "enum"; options: SelectOption[] }
  | { field: string; type: "boolean" }
  | { field: string; type: "uuid" };

interface SelectOption {
  value: string;
  label: string;
}
```

### Filter Operators

```ts
const OPERATORS_BY_FILTER_TYPE = {
  string: ["eq", "ne", "contains", "notContains", "hasPrefix", "hasSuffix", "notHasPrefix", "notHasSuffix", "in", "nin"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "in", "nin"],
  date:   ["eq", "ne", "gt", "gte", "lt", "lte", "between", "in", "nin"],
  enum:   ["eq", "ne", "in", "nin"],
  boolean: ["eq", "ne"],
  uuid:   ["eq", "ne", "in", "nin"],
} as const;

type FilterOperator = /* union of all operators above */;
```

### Filter & Sort State

```ts
interface Filter<TFieldName extends string = string> {
  field: TFieldName;
  operator: FilterOperator;
  value: unknown;
}

interface SortState {
  field: string;
  direction: "Asc" | "Desc";
}
```

### Pagination

```ts
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPageToken: string | null;
  previousPageToken: string | null;
}

interface PaginationVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}
```

### Row Actions

```ts
interface RowAction<TRow extends Record<string, unknown>> {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  isDisabled?: (row: TRow) => boolean;
  onClick: (row: TRow) => void;
}
```

### Row Operations (Optimistic Updates)

```ts
interface RowOperations<TRow extends Record<string, unknown>> {
  updateRow: (rowId: string, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: string) => { rollback: () => void; deletedRow: TRow };
  insertRow: (row: TRow) => { rollback: () => void };
}
```

### Collection Result

```ts
interface CollectionResult<T> {
  edges: { node: T }[];
  pageInfo: PageInfo;
  total?: number | null;
}

type NodeType<T extends { edges: { node: unknown }[] } | null | undefined> =
  NonNullable<T>["edges"][number]["node"];
```

### Metadata Types

```ts
interface TableMetadata {
  readonly name: string;
  readonly pluralForm: string;
  readonly description?: string;
  readonly fields: readonly FieldMetadata[];
  readonly relations?: readonly { ... }[];
}

interface FieldMetadata {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly enumValues?: readonly string[];
  readonly arrayItemType?: FieldType;
  readonly description?: string;
  readonly relation?: { readonly fieldName: string; readonly targetTable: string };
}

type FieldType =
  | "string" | "number" | "boolean" | "uuid"
  | "datetime" | "date" | "time"
  | "enum" | "array" | "nested" | "file";

type TableFieldName<TTable extends TableMetadata> = TTable["fields"][number]["name"];

interface MetadataFieldOptions {
  label?: string;
  width?: number;
  sort?: boolean;   // default: true (auto-derived from field type)
  filter?: boolean;  // default: true (auto-derived from field type)
}
```

### Type Mapping Utilities

```ts
function fieldTypeToSortConfig(field: string, type: FieldType): SortConfig | undefined;
function fieldTypeToFilterConfig(
  field: string,
  type: FieldType,
  enumValues?: readonly string[],
): FilterConfig | undefined;
```

## i18n

```ts
import { dataTableLabels } from "@tailor-platform/app-shell";
```

All user-facing strings (loading, error, pagination labels, filter operator labels, etc.) are defined via `defineI18nLabels` and support `en` / `ja` locales.

## Exports (from `index.ts`)

```ts
export { DataTable, type DataTablePaginationProps } from "./data-table";
export { useDataTable } from "./use-data-table";
export { useDataTableContext } from "./data-table-context";
export { createColumnHelper } from "./field-helpers";
export { dataTableLabels } from "./i18n";
```
