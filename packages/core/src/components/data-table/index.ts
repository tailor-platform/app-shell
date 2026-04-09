// DataTable compound component
export { DataTable } from "./data-table";
export { useDataTable } from "./use-data-table";
export { useDataTableContext } from "./data-table-context";

// Pagination
export { Pagination, type PaginationProps } from "./pagination";

// Field helpers
export { createColumnHelper } from "./field-helpers";

// i18n
export { dataTableLabels } from "./i18n";

// Types — runtime constants
export {
  OPERATORS_BY_FILTER_TYPE,
  DEFAULT_OPERATOR_LABELS,
  fieldTypeToSortConfig,
  fieldTypeToFilterConfig,
} from "./types";

// Types — public type exports
export type {
  // Core
  Column,
  ColumnOptions,
  ColumnDefinition,
  SortConfig,
  FilterConfig,
  SortState,
  Filter,
  FilterOperator,
  SelectOption,
  PageInfo,
  DataTableData,
  RowAction,
  RowOperations,

  // Collection
  CollectionVariables,
  CollectionControl,
  CollectionResult,
  NodeType,
  QueryVariables,
  PaginationVariables,
  UseCollectionOptions,
  UseCollectionReturn,

  // DataTable
  UseDataTableOptions,
  UseDataTableReturn,

  // Metadata
  FieldType,
  FieldMetadata,
  TableMetadata,
  TableMetadataMap,
  BuildQueryVariables,
  TableMetadataFilter,
  MetadataFilter,
  TableFieldName,
  TableOrderableFieldName,
  OrderableFieldName,
  FieldName,
  MatchingTableName,
  MetadataFieldOptions,
  MetadataFieldsOptions,
} from "./types";
