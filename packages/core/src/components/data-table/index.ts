// DataTable compound component
export { DataTable, type DataTablePaginationProps, type DataTableRootProps } from "./data-table";
export { useCurrentPage } from "./pagination";
export { useDataTable } from "./use-data-table";
export { useDataTableContext, type DataTableContextValue } from "./data-table-context";

// Field helpers
export { createColumnHelper, type ColumnHelper, type ColumnInferFn } from "./field-helpers";

// Types — DataTable-specific
export type {
  Column,
  DataTableData,
  RowAction,
  UseDataTableOptions,
  UseDataTableReturn,
  MetadataFieldOptions,
} from "./types";
