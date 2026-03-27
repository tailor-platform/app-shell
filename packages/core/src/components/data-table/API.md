# DataTable API Reference (Source → app-shell)

This document describes the source DataTable API as-is, with notes on what changes during migration.

## Compound Component: `DataTable`

```tsx
export const DataTable = {
  Provider, // Context provider wrapping useDataTable return value
  Root, // Table container (renders Table.Root internally)
  Headers, // Auto-generated header row from columns + sort controls
  Body, // Auto-generated rows, or custom children for manual rendering
  Row, // Thin wrapper around Table.Row (for custom Body children)
  Cell, // Thin wrapper around Table.Cell (for custom Body children)
} as const;
```

**Usage pattern:**

```tsx
const { variables, ...collection } = useCollectionVariables({ params: { pageSize: 20 } });
const [result] = useQuery({
  query: GET_ORDERS,
  variables: { ...variables.pagination, query: variables.query, order: variables.order },
});
const table = useDataTable({ columns, data: result.data?.orders, collection });

<DataTable.Provider value={table}>
  <DataTable.Root>
    <DataTable.Headers />
    <DataTable.Body />
  </DataTable.Root>
  <Pagination />
</DataTable.Provider>;
```

**Sub-component props:**

| Sub-component        | Props                                                         |
| -------------------- | ------------------------------------------------------------- |
| `DataTable.Provider` | `value: UseDataTableReturn<TRow>`, `children`                 |
| `DataTable.Root`     | `className?`, `children`                                      |
| `DataTable.Headers`  | `className?` (reads columns/sort/rowActions from context)     |
| `DataTable.Body`     | `className?`, `children?` (if provided, skips auto-rendering) |
| `DataTable.Row`      | `ComponentProps<"tr">` (pass-through to `Table.Row`)          |
| `DataTable.Cell`     | `ComponentProps<"td">` (pass-through to `Table.Cell`)         |

**Migration notes:**

- `DataTable.Root` will hardcode `astw:border astw:rounded-md astw:bg-card` on wrapper
- Internal `Table.Headers` → `Table.Header`, `Table.HeaderRow` → `Table.Row`, `Table.HeaderCell` → `Table.Head`
- `RowActionsMenu` (internal): replace raw `<button>` / `<div role="menu">` with app-shell `Menu`
- `SortIndicator` (internal): replace `▲`/`▼` text with `lucide-react` icons
- Source `locale` prop on `UseDataTableOptions` → replaced by `defineI18nLabels` + `useT()`

## Hook: `useDataTable<TRow>(options)`

```ts
function useDataTable<TRow extends Record<string, unknown>>(
  options: UseDataTableOptions<TRow>,
): UseDataTableReturn<TRow>;

interface UseDataTableOptions<TRow> {
  columns: Column<TRow>[];
  data: CollectionResult<TRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  collection?: UseCollectionReturn;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
  locale?: "en" | "ja"; // ← Removed in migration (use defineI18nLabels)
}

interface UseDataTableReturn<TRow> {
  // Data
  rows: TRow[];
  loading: boolean;
  error: Error | null;
  sortStates: SortState[];
  onSort?: (field: string, direction?: "Asc" | "Desc") => void;

  // Pagination (delegated from collection)
  pageInfo: PageInfo;
  nextPage: (endCursor: string) => void;
  prevPage: (startCursor: string) => void;
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
  collection: UseCollectionReturn | undefined;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
  locale: "en" | "ja"; // ← Removed in migration
}
```

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

  // Filters
  filters: Filter[];
  addFilter(field: TFieldName, operator: FilterOperator, value: unknown): void;
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
  nextPage(endCursor: string): void;
  prevPage(startCursor: string): void;
  resetPage(): void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  setPageInfo(pageInfo: PageInfo): void;
  currentPage: number;
  totalPages: number | null;
  goToFirstPage(): void;
  goToLastPage(): void;
  setTotal(total: number): void;
}
```

## Component: `Pagination`

```tsx
function Pagination(props?: PaginationProps): JSX.Element;

interface PaginationProps {
  labels?: PaginationLabels;
  pageSizeOptions?: number[]; // e.g. [10, 20, 50, 100]
}

interface PaginationLabels {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
  rowsPerPage?: string;
}
```

Reads context from `useDataTableContext()` and `useCollectionVariablesContext()`. Must be used within `DataTable.Provider`.

**Migration notes:** Replace inline SVG icons with `lucide-react` (`ChevronsLeft`, `ChevronLeft`, `ChevronRight`, `ChevronsRight`). Replace raw `<button>` / `<select>` with app-shell `Button` / `Select`. Labels will move to `defineI18nLabels`.

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

## Key Types

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

interface Column<TRow> {
  label?: string;
  render: (row: TRow) => ReactNode;
  id?: string;
  width?: number;
  accessor?: (row: TRow) => unknown;
  sort?: SortConfig;
  filter?: FilterConfig;
}

interface RowAction<TRow> {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  isDisabled?: (row: TRow) => boolean;
  onClick: (row: TRow) => void;
}

interface CollectionResult<T> {
  edges: { node: T }[];
  pageInfo: PageInfo;
  total?: number | null;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
  hasPreviousPage: boolean;
  startCursor: string | null;
}

interface SortState {
  field: string;
  direction: "Asc" | "Desc";
}

interface Filter<TFieldName extends string = string> {
  field: TFieldName;
  operator: FilterOperator;
  value: unknown;
}
```

## i18n (Source → Migration)

Source uses `getLabels(locale: "en" | "ja")` returning a `DataTableLabels` object. Migration replaces this with `defineI18nLabels` integrated into app-shell's i18n system. The `locale` prop is removed from `UseDataTableOptions`; locale is resolved from `AppShellConfig.locale` via `useT()`.
