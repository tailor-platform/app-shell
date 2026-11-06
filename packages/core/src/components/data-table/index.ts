// DataTable compound component
export { DataTable, type DataTablePaginationProps, type DataTableRootProps } from "./data-table";

export { CellEditError } from "@/components/internals/table-core/cell-edit-error";
export { useDataTable } from "./use-data-table";
export { useDataTableContext, type DataTableContextValue } from "./context";

// Field helpers
export { createColumnHelper } from "./field-helpers";

export type {
  BadgeCellOptions,
  ColumnCellType,
  DateCellOptions,
  LinkCellOptions,
  MoneyCellOptions,
  NumberCellOptions,
} from "@/components/internals/table-core/column-types";

// Types — DataTable-specific
export type {
  BadgeCellEditOptions,
  BadgeVariant,
  CellEditState,
  Column,
  ColumnBase,
  ColumnTypeBranch,
  HeaderRenderContext,
  FooterRenderContext,
  DataTableData,
  DataTableFilterConfig,
  DateCellEditOptions,
  DateTimeDraft,
  MetadataFieldOptions,
  NumberCellEditOptions,
  DataTableAction,
  RowAction,
  RowSelectionOptions,
  TextCellEditOptions,
  SelectionAction,
  SelectionActionHelpers,
  UseDataTableOptions,
  UseDataTableReturn,
} from "./types";
