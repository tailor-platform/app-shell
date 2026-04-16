// DataTable compound component
export { DataTable, type DataTablePaginationProps } from "./data-table";
export { useDataTable } from "./use-data-table";
export { useDataTableContext } from "./data-table-context";

// Field helpers
export { createColumnHelper } from "./field-helpers";

// i18n
export { dataTableLabels } from "./i18n";

// Types — DataTable-specific
export type {
  Column,
  ColumnOptions,
  DataTableData,
  RowAction,
  RowOperations,
  UseDataTableOptions,
  UseDataTableReturn,
  MetadataFieldOptions,
  MetadataFieldsOptions,
} from "./types";
