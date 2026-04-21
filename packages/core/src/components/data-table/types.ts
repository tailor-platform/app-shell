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

type UseDataTableBaseOptions<TRow extends Record<string, unknown>> = {
  columns: Column<TRow>[];
  data: DataTableData<TRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  control?: CollectionControl;
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
};

/**
 * Options for `useDataTable` hook.
 *
 * `rowKey` identifies the unique row field used for optimistic updates.
 * - When `TRow` has an `"id"` field, `rowKey` defaults to `"id"` and may be omitted.
 * - When `TRow` has no `"id"` field, `rowKey` is **required**. Omitting it would
 *   cause `updateRow`, `deleteRow`, and `insertRow` to silently no-op.
 */
export type UseDataTableOptions<TRow extends Record<string, unknown>> =
  UseDataTableBaseOptions<TRow> &
    ("id" extends keyof TRow ? { rowKey?: keyof TRow & string } : { rowKey: keyof TRow & string });

/**
 * Row operations with optimistic update support.
 *
 * Each operation returns a `rollback()` function that restores row state to
 * the **snapshot taken immediately before that specific call**. If multiple
 * operations are chained, rolling back an earlier one also undoes all later
 * ones, because the snapshot predates those subsequent operations.
 *
 * Optimistic state is automatically discarded when the `data` prop reference
 * changes (i.e., after a server refetch completes), so explicit cleanup is
 * not required on the success path.
 */
export interface RowOperations<TRow extends Record<string, unknown>, TRowId = string> {
  /** Optimistically update fields of a row identified by `rowId`. */
  updateRow: (rowId: TRowId, fields: Partial<TRow>) => { rollback: () => void };
  /** Optimistically remove a row identified by `rowId`. Returns the deleted row for undo. */
  deleteRow: (rowId: TRowId) => {
    rollback: () => void;
    deletedRow: TRow | undefined;
  };
  /** Optimistically prepend a new row to the list. */
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
export interface UseDataTableReturn<
  TRow extends Record<string, unknown>,
  TRowId = string,
> extends RowOperations<TRow, TRowId> {
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

  // Row key identifier
  rowKey: string;

  // Control (passthrough for DataTable.Root)
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
