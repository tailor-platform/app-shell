// DataTable compound component
export { DataTable, type DataTablePaginationProps, type DataTableRootProps } from "./data-table";

export { useDataTable } from "./use-data-table";
export { useDataTableContext, type DataTableContextValue } from "./data-table-context";

// Field helpers
export { createColumnHelper } from "./field-helpers";

// Types — DataTable-specific
export type {
  BadgeVariant,
  Column,
  ColumnCellType,
  ColumnTypeOptions,
  DataTableData,
  RowAction,
  UseDataTableOptions,
  UseDataTableReturn,
  MetadataFieldOptions,
} from "./types";
