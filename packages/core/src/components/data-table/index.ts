// DataTable compound component
export { DataTable, type DataTablePaginationProps } from "./data-table";
export { useDataTable } from "./use-data-table";
export { useDataTableContext, type DataTableContextValue } from "./data-table-context";

// Field helpers
export { createColumnHelper } from "./field-helpers";

// i18n
export { useDataTableT } from "./i18n";

// Types — DataTable-specific
export type {
  Column,
  DataTableData,
  RowAction,
  RowOperations,
  UseDataTableOptions,
  UseDataTableReturn,
  MetadataFieldOptions,
} from "./types";
