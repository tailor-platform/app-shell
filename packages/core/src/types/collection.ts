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
 * Active sort state for a single field.
 */
export interface SortState {
  field: string;
  direction: "Asc" | "Desc";
}

/**
 * Page info for cursor-based pagination (Relay Connection spec).
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
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
// Metadata-based Field Name Inference Types
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

// =============================================================================
// Collection Control & Options
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
  filters: Filter<TFieldName>[];
  addFilter<F extends TFieldName>(
    field: F,
    operator: OperatorForField<TFilter, F>,
    value: unknown,
  ): void;
  setFilters: (filters: Filter<TFieldName>[]) => void;
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
  /** Stack of `endCursor` values pushed on each forward navigation. Used client-side to determine if a previous page exists, since `hasPreviousPage` may always be `false` when using `first + after`. */
  cursorStack: string[];
  paginationDirection: "forward" | "backward";
  nextPage: (cursor: string) => void;
  prevPage: (startCursor?: string) => void;
  resetPage: () => void;
  goToFirstPage: () => void;
  /**
   * Navigate to the last page.
   *
   * Requests the last `pageSize` items by setting `paginationDirection` to
   * `"backward"` with no cursor.
   */
  goToLastPage: () => void;
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
// Default Operator Labels
// =============================================================================

/**
 * Default human-readable labels for each filter operator.
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
