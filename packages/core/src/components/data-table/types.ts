import type { ReactNode } from "react";

// =============================================================================
// Metadata Types (from generator — self-contained here)
// =============================================================================

/**
 * Field type mapping for Data View.
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "uuid"
  | "datetime"
  | "date"
  | "time"
  | "enum"
  | "array"
  | "nested"
  | "file";

/**
 * Metadata for a single field.
 */
export interface FieldMetadata {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly enumValues?: readonly string[];
  readonly arrayItemType?: FieldType;
  readonly description?: string;
  readonly relation?: {
    readonly fieldName: string;
    readonly targetTable: string;
  };
}

/**
 * Metadata for a single table.
 */
export interface TableMetadata {
  readonly name: string;
  readonly pluralForm: string;
  readonly description?: string;
  readonly fields: readonly FieldMetadata[];
  readonly relations?: readonly {
    readonly relationType: "manyToOne" | "oneToOne" | "oneToMany";
    readonly fieldName: string;
    readonly targetTable: string;
    readonly foreignKeyField: string;
  }[];
}

/**
 * Map of all tables.
 */
export type TableMetadataMap = { readonly [key: string]: TableMetadata };

// =============================================================================
// Sort & Filter Configuration (Discriminated Unions)
// =============================================================================

/**
 * Sort configuration for a column.
 * The `type` determines how values are compared when sorting.
 * The `field` identifies the backend field name used for ordering.
 */
export type SortConfig =
  | { field: string; type: "string" }
  | { field: string; type: "number" }
  | { field: string; type: "date" }
  | { field: string; type: "boolean" };

/**
 * Select option for enum/dropdown filters.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Filter configuration for a column.
 * The `type` determines which operators are available.
 * The `field` identifies the backend field name used for filtering.
 */
export type FilterConfig =
  | { field: string; type: "string" }
  | { field: string; type: "number" }
  | { field: string; type: "date" }
  | { field: string; type: "enum"; options: SelectOption[] }
  | { field: string; type: "boolean" }
  | { field: string; type: "uuid" };

// =============================================================================
// Filter Operators (Single Source of Truth)
// =============================================================================

/**
 * Operators available per filter type (Tailor Platform schema).
 */
export const OPERATORS_BY_FILTER_TYPE = {
  string: [
    "eq",
    "ne",
    "contains",
    "notContains",
    "hasPrefix",
    "hasSuffix",
    "notHasPrefix",
    "notHasSuffix",
    "in",
    "nin",
  ],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "in", "nin"],
  date: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "in", "nin"],
  enum: ["eq", "ne", "in", "nin"],
  boolean: ["eq", "ne"],
  uuid: ["eq", "ne", "in", "nin"],
} as const satisfies Record<FilterConfig["type"], readonly string[]>;

/**
 * Maps each filter type to the union of operators it supports.
 */
export type OperatorForFilterType = {
  [T in FilterConfig["type"]]: (typeof OPERATORS_BY_FILTER_TYPE)[T][number];
};

/**
 * Union of all available filter operators.
 */
export type FilterOperator = OperatorForFilterType[FilterConfig["type"]];

/**
 * Resolve the operator union for a specific field within a filter type.
 */
export type OperatorForField<TFilter, F extends string> = [Extract<TFilter, { field: F }>] extends [
  never,
]
  ? FilterOperator
  : Extract<TFilter, { field: F }> extends { operator: infer O }
    ? O
    : FilterOperator;

// =============================================================================
// Filter Type → FieldType Mapping (type-level)
// =============================================================================

/**
 * Type-level mapping from `FieldType` (metadata) to `FilterConfig["type"]`.
 */
export type FieldTypeToFilterConfigType = {
  string: "string";
  number: "number";
  boolean: "boolean";
  uuid: "uuid";
  datetime: "date";
  date: "date";
  time: "date";
  enum: "enum";
  array: never;
  nested: never;
  file: never;
};

// =============================================================================
// Filter & Sort State
// =============================================================================

/**
 * Active filter state.
 *
 * @typeParam TFieldName - Union of allowed field name strings (default: `string`).
 */
export interface Filter<TFieldName extends string = string> {
  field: TFieldName;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Metadata-aware filter type from a single table metadata object.
 */
export type TableMetadataFilter<TTable extends TableMetadata> =
  TTable["fields"][number] extends infer F
    ? F extends { readonly name: infer N; readonly type: infer T }
      ? N extends string
        ? T extends keyof FieldTypeToFilterConfigType
          ? FieldTypeToFilterConfigType[T] extends never
            ? never
            : {
                field: N;
                operator: OperatorForFilterType[FieldTypeToFilterConfigType[T]];
                value: unknown;
              }
          : never
        : never
      : never
    : never;

/**
 * Metadata-aware filter type.
 *
 * @deprecated Use `TableMetadataFilter<TMetadata[TTableName]>` instead.
 */
export type MetadataFilter<
  TMetadata extends TableMetadataMap,
  TTableName extends string & keyof TMetadata,
> = TableMetadataFilter<TMetadata[TTableName]>;

/**
 * Active sort state for a single field.
 */
export interface SortState {
  field: string;
  direction: "Asc" | "Desc";
}

/**
 * Page info from GraphQL response (Tailor Platform standard).
 */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
  hasPreviousPage: boolean;
  startCursor: string | null;
}

// =============================================================================
// Query Variables (Tailor Platform format)
// =============================================================================

/**
 * GraphQL query variables in Tailor Platform format.
 */
export interface QueryVariables {
  query?: Record<string, unknown>;
  order?: { field: string; direction: "Asc" | "Desc" }[];
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

// =============================================================================
// Collection Variables (split into explicit sub-properties)
// =============================================================================

/**
 * Pagination variables for cursor-based pagination (Tailor Platform format).
 */
export interface PaginationVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

// ---------------------------------------------------------------------------
// Metadata-aware filter variable types
// ---------------------------------------------------------------------------

type FieldTypeToTSType = {
  string: string;
  number: number;
  boolean: boolean;
  uuid: string;
  datetime: string;
  date: string;
  time: string;
  enum: string;
};

type ResolveFieldValueType<F, T extends keyof FieldTypeToTSType> = T extends "enum"
  ? F extends { readonly enumValues: readonly (infer V extends string)[] }
    ? V
    : string
  : FieldTypeToTSType[T];

type OperatorValueType<TOp extends string, TValue> = TOp extends "in" | "nin"
  ? TValue[]
  : TOp extends "between"
    ? { min: TValue; max: TValue }
    : TValue;

type FilterInputForFieldType<TFilterConfigType extends FilterConfig["type"], TValue> = {
  [Op in OperatorForFilterType[TFilterConfigType]]?: OperatorValueType<Op, TValue>;
};

/**
 * Builds a Tailor Platform QueryInput-compatible type from table metadata.
 */
export type BuildQueryVariables<TTable extends TableMetadata> = {
  [F in TTable["fields"][number] as F extends {
    readonly name: infer N extends string;
    readonly type: infer T;
  }
    ? T extends keyof FieldTypeToFilterConfigType
      ? FieldTypeToFilterConfigType[T] extends never
        ? never
        : N
      : never
    : never]?: F extends {
    readonly type: infer T extends keyof FieldTypeToFilterConfigType & keyof FieldTypeToTSType;
  }
    ? FieldTypeToFilterConfigType[T] extends infer FCT extends FilterConfig["type"]
      ? FilterInputForFieldType<FCT, ResolveFieldValueType<F, T>>
      : never
    : never;
};

/**
 * Collection variables split into explicit sub-properties.
 */
export interface CollectionVariables {
  query: Record<string, Record<string, unknown>> | undefined;
  order: { field: string; direction: "Asc" | "Desc" }[] | undefined;
  pagination: PaginationVariables;
}

// =============================================================================
// Collection Result (Tailor Platform standard)
// =============================================================================

/**
 * GraphQL collection result format (Tailor Platform standard).
 */
export interface CollectionResult<T> {
  edges: { node: T }[];
  pageInfo: PageInfo;
  total?: number | null;
}

/**
 * Extract the node type from a cursor connection result.
 */
export type NodeType<T extends { edges: { node: unknown }[] } | null | undefined> =
  NonNullable<T>["edges"][number]["node"];

// =============================================================================
// Column Definitions
// =============================================================================

/**
 * Options for defining a column (used with `column()` helper).
 */
export interface ColumnOptions<TRow extends Record<string, unknown>> {
  label?: string;
  render: (row: TRow) => ReactNode;
  id?: string;
  width?: number;
  accessor?: (row: TRow) => unknown;
  sort?: SortConfig;
  filter?: FilterConfig;
}

/**
 * A column definition (produced by `column()` helper).
 */
export interface Column<TRow extends Record<string, unknown>> {
  label?: string;
  render: (row: TRow) => ReactNode;
  id?: string;
  width?: number;
  accessor?: (row: TRow) => unknown;
  sort?: SortConfig;
  filter?: FilterConfig;
}

/**
 * Column definition used by `useDataTable` (same as `Column`).
 */
export type ColumnDefinition<TRow extends Record<string, unknown>> = Column<TRow>;

// =============================================================================
// useCollectionVariables Types
// =============================================================================

/**
 * Options for `useCollectionVariables` hook.
 */
export interface UseCollectionOptions<
  TFieldName extends string = string,
  TFilter extends Filter<TFieldName> = Filter<TFieldName>,
> {
  params?: {
    initialFilters?: TFilter[];
    initialSort?: { field: TFieldName; direction: "Asc" | "Desc" }[];
    pageSize?: number;
  };
}

/**
 * Collection control interface for UI components to interact with
 * filter, sort, and pagination state.
 */
export interface CollectionControl<
  TFieldName extends string = string,
  TFilter = Filter<TFieldName>,
> {
  // Filter operations
  filters: Filter[];
  addFilter<F extends TFieldName>(
    field: F,
    operator: OperatorForField<TFilter, F>,
    value: unknown,
  ): void;
  setFilters: (filters: Filter[]) => void;
  removeFilter(field: TFieldName): void;
  clearFilters: () => void;

  // Sort operations
  sortStates: SortState[];
  setSort(field: TFieldName, direction?: "Asc" | "Desc"): void;
  clearSort: () => void;

  // Pagination operations
  pageSize: number;
  setPageSize: (size: number) => void;
  cursor: string | null;
  paginationDirection: "forward" | "backward";
  nextPage: (endCursor: string) => void;
  prevPage: (startCursor: string) => void;
  resetPage: () => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  setPageInfo: (pageInfo: PageInfo) => void;
  currentPage: number;
  totalPages: number | null;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setTotal: (total: number) => void;
}

/**
 * Return type of `useCollectionVariables` hook.
 */
export interface UseCollectionReturn<
  TFieldName extends string = string,
  TVariables = CollectionVariables,
  TFilter = Filter<TFieldName>,
> {
  variables: TVariables;
  control: CollectionControl<TFieldName, TFilter>;
}

// =============================================================================
// useDataTable Types
// =============================================================================

/**
 * Options for `useDataTable` hook.
 */
export interface UseDataTableOptions<TRow extends Record<string, unknown>> {
  columns: Column<TRow>[];
  data: CollectionResult<TRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  control?: CollectionControl;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}

/**
 * Row operations with optimistic update support.
 */
export interface RowOperations<TRow extends Record<string, unknown>> {
  updateRow: (rowId: string, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: string) => { rollback: () => void; deletedRow: TRow };
  insertRow: (row: TRow) => { rollback: () => void };
}

// =============================================================================
// Row Actions
// =============================================================================

/**
 * A single row action definition for the actions column.
 */
export interface RowAction<TRow extends Record<string, unknown>> {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  isDisabled?: (row: TRow) => boolean;
  onClick: (row: TRow) => void;
}

/**
 * Return type of `useDataTable` hook.
 */
export interface UseDataTableReturn<TRow extends Record<string, unknown>> {
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

  // Row Operations (Optimistic Updates)
  updateRow: (rowId: string, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: string) => { rollback: () => void; deletedRow: TRow };
  insertRow: (row: TRow) => { rollback: () => void };

  // Control (passthrough for DataTable.Provider)
  control: CollectionControl | undefined;

  // Row interaction (passthrough for DataTable.Provider)
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}

// =============================================================================
// Metadata-based Column Inference Types
// =============================================================================

/**
 * Extract field names from a single table metadata object.
 */
export type TableFieldName<TTable extends TableMetadata> = TTable["fields"][number] extends {
  readonly name: infer N;
}
  ? N extends string
    ? N
    : never
  : never;

/**
 * Extract field names from table metadata map + table name.
 *
 * @deprecated Use `TableFieldName<TMetadata[TTableName]>` instead.
 */
export type FieldName<
  TMetadata extends TableMetadataMap,
  TTableName extends keyof TMetadata,
> = TableFieldName<TMetadata[TTableName]>;

type OrderableFieldType = "string" | "number" | "boolean" | "datetime" | "date" | "time" | "enum";

/**
 * Extract only orderable field names from a single table metadata object.
 */
export type TableOrderableFieldName<TTable extends TableMetadata> =
  Extract<TTable["fields"][number], { readonly type: OrderableFieldType }> extends {
    readonly name: infer N;
  }
    ? N extends string
      ? N
      : never
    : never;

/**
 * Extract only orderable field names from table metadata map + table name.
 *
 * @deprecated Use `TableOrderableFieldName<TMetadata[TTableName]>` instead.
 */
export type OrderableFieldName<
  TMetadata extends TableMetadataMap,
  TTableName extends keyof TMetadata,
> = TableOrderableFieldName<TMetadata[TTableName]>;

/**
 * Find table names in metadata whose fields are a superset of `TFieldName`.
 */
export type MatchingTableName<TMetadata extends TableMetadataMap, TFieldName extends string> = {
  [K in string & keyof TMetadata]: TFieldName extends FieldName<TMetadata, K> ? K : never;
}[string & keyof TMetadata];

/**
 * Options for metadata-based single field inference.
 */
export interface MetadataFieldOptions {
  label?: string;
  width?: number;
  sort?: boolean;
  filter?: boolean;
}

/**
 * Options for metadata-based multi-field definition.
 */
export interface MetadataFieldsOptions {
  overrides?: Record<string, Partial<MetadataFieldOptions>>;
  sort?: boolean;
  filter?: boolean;
}

// =============================================================================
// Default Operator Labels
// =============================================================================

/**
 * Default operator labels used by SearchFilterForm.
 */
export const DEFAULT_OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "=",
  ne: "≠",
  contains: "contains",
  notContains: "not contains",
  hasPrefix: "starts with",
  hasSuffix: "ends with",
  notHasPrefix: "not starts with",
  notHasSuffix: "not ends with",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "between",
  in: "in",
  nin: "not in",
};

// =============================================================================
// Type Mapping Utilities
// =============================================================================

/**
 * Map metadata field type to SortConfig.
 * Returns undefined for types that don't support sorting.
 */
export function fieldTypeToSortConfig(field: string, type: FieldType): SortConfig | undefined {
  switch (type) {
    case "string":
      return { field, type: "string" };
    case "number":
      return { field, type: "number" };
    case "boolean":
      return { field, type: "boolean" };
    case "datetime":
    case "date":
    case "time":
      return { field, type: "date" };
    case "enum":
      return { field, type: "string" };
    default:
      return undefined;
  }
}

/**
 * Map metadata field type to FilterConfig.
 * Returns undefined for types that don't support filtering.
 */
export function fieldTypeToFilterConfig(
  field: string,
  type: FieldType,
  enumValues?: readonly string[],
): FilterConfig | undefined {
  switch (type) {
    case "string":
      return { field, type: "string" };
    case "number":
      return { field, type: "number" };
    case "boolean":
      return { field, type: "boolean" };
    case "uuid":
      return { field, type: "uuid" };
    case "datetime":
    case "date":
    case "time":
      return { field, type: "date" };
    case "enum":
      return {
        field,
        type: "enum",
        options: (enumValues ?? []).map((v) => ({ value: v, label: v })),
      };
    default:
      return undefined;
  }
}
