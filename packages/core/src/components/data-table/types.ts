import type { ReactNode } from "react";
import type {
  CollectionControl,
  FilterConfig,
  PageInfo,
  SortConfig,
  SortState,
} from "@/types/collection";

// =============================================================================
// Column Definitions
// =============================================================================

/**
 * A column definition for DataTable.
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

// =============================================================================
// useDataTable Types
// =============================================================================

/**
 * Data input for `useDataTable` hook.
 */
export interface DataTableData<TRow> {
  rows: TRow[];
  pageInfo?: PageInfo;
  total?: number | null;
}

/**
 * Options for `useDataTable` hook.
 */
export interface UseDataTableOptions<TRow extends Record<string, unknown>> {
  columns: Column<TRow>[];
  data: DataTableData<TRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  control?: CollectionControl;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
  /**
   * The field name used as the unique row identifier for optimistic updates.
   *
   * @default "id"
   * @warning If `TRow` does not have an `"id"` field, you **must** specify `rowKey`.
   * Omitting it when no `"id"` field exists will cause `updateRow`, `deleteRow`,
   * and `insertRow` to silently no-op instead of updating the correct row.
   */
  rowKey?: keyof TRow & string;
}

/**
 * Row operations with optimistic update support.
 */
export interface RowOperations<TRow extends Record<string, unknown>> {
  updateRow: (rowId: string, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: string) => {
    rollback: () => void;
    deletedRow: TRow | undefined;
  };
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

  // Pagination (derived from data)
  pageInfo: PageInfo;
  total: number | null;
  totalPages: number | null;
  nextPage: (token: string) => void;
  prevPage: (token: string) => void;
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
  deleteRow: (rowId: string) => {
    rollback: () => void;
    deletedRow: TRow | undefined;
  };
  insertRow: (row: TRow) => { rollback: () => void };

  // Control (passthrough for DataTable.Provider)
  control: CollectionControl | undefined;

  // Row interaction (passthrough for DataTable.Provider)
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}

// =============================================================================
// Metadata-based Column Inference Types (DataTable specific)
// =============================================================================

/**
 * Options for metadata-based single field inference.
 */
export interface MetadataFieldOptions {
  label?: string;
  width?: number;
  sort?: boolean;
  filter?: boolean;
}


