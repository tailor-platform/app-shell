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
  onSelectionChange?: (ids: string[]) => void;
};

/**
 * Options for `useDataTable` hook.
 */
export type UseDataTableOptions<TRow extends Record<string, unknown>> =
  UseDataTableBaseOptions<TRow>;

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

  // Control (passthrough for DataTable.Root)
  control: CollectionControl | undefined;

  // Row interaction (passthrough for DataTable.Provider)
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];

  // Row selection
  selectedIds: string[];
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  selectAllRows?: () => void;
  clearSelection?: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
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
