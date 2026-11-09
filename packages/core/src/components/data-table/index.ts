// DataTable compound component
export { DataTable, type DataTablePaginationProps, type DataTableRootProps } from "./data-table";

export { CellEditError } from "./cell-edit-error";
export { useDataTable } from "./use-data-table";
export { useDataTableContext, type DataTableContextValue } from "./context";

// Field helpers
export { createColumnHelper } from "./field-helpers";

// Types — DataTable-specific
export type {
  BadgeCellEditOptions,
  BadgeCellOptions,
  BadgeVariant,
  CellEditState,
  Column,
  ColumnBase,
  ColumnCellType,
  ColumnTypeBranch,
  HeaderRenderContext,
  FooterRenderContext,
  DataTableData,
  DataTableFilterConfig,
  DateCellEditOptions,
  DateTimeDraft,
  DateCellOptions,
  LinkCellOptions,
  MetadataFieldOptions,
  MoneyCellOptions,
  NumberCellEditOptions,
  NumberCellOptions,
  DataTableAction,
  RowAction,
  RowSelectionOptions,
  TextCellEditOptions,
  SelectionAction,
  SelectionActionHelpers,
  UseDataTableOptions,
  UseDataTableReturn,
} from "./types";
