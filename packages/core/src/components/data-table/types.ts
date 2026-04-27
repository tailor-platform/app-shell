import type { ReactNode } from "react";
import type {
  CollectionControl,
  Filter,
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
  /** Column header text. Omit for action or icon-only columns. */
  label?: string;
  /** Renders the cell content for a given row. Required. */
  render: (row: TRow) => ReactNode;
  /**
   * Stable identifier used for column visibility toggling and as the React key.
   * Falls back to `label` when omitted. Set this explicitly when `label` is
   * absent or not unique.
   */
  id?: string;
  /** Fixed column width in pixels. When omitted the column sizes naturally. */
  width?: number;
  /**
   * Extracts the raw value from a row for purposes such as sorting or
   * clipboard copying. Not used for rendering — use `render` for that.
   */
  accessor?: (row: TRow) => unknown;
  /**
   * Sort configuration. When set, the column header becomes clickable and
   * cycles through `Asc → Desc → undefined`.
   * Use `fieldTypeToSortConfig` or `inferColumns` to derive this automatically.
   */
  sort?: SortConfig;
  /**
   * Filter configuration. When set, this column appears as an option in
   * `DataTable.Filters`.
   * Use `fieldTypeToFilterConfig` or `inferColumns` to derive this automatically.
   */
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
export type UseDataTableOptions<
  TRow extends Record<string, unknown>,
  TFieldName extends string = string,
  TFilter extends Filter<TFieldName> = Filter<TFieldName>,
> = {
  /** Column definitions that describe what to render in each column. */
  columns: Column<TRow>[];
  /**
   * Fetched data to display. Pass `undefined` while loading; the table will
   * show a loading state automatically.
   */
  data: DataTableData<TRow> | undefined;
  /** When `true`, the table renders a loading indicator. */
  loading?: boolean;
  /** If set, an error message is rendered in the table body. */
  error?: Error | null;
  /**
   * Collection control returned by `useCollectionVariables()`. Required when
   * using `DataTable.Pagination` or `DataTable.Filters`.
   */
  control?: CollectionControl<TFieldName, TFilter>;
  /** Called when the user clicks a row. Adds a pointer cursor to rows. */
  onClickRow?: (row: TRow) => void;
  /**
   * Per-row action items rendered in a kebab-menu column on the right.
   * The column is omitted when this array is empty or not provided.
   */
  rowActions?: RowAction<TRow>[];
  /**
   * Called with the current array of selected row IDs whenever the selection
   * changes. Providing this prop enables the checkbox selection column.
   * Selection is ID-based (`row.id`) and persists across page changes.
   *
   * **Requirement:** Each row must have a string or number `id` field.
   * Rows without `id` are excluded from selection.
   *
   * **Note:** `selectAllRows` (triggered by the header checkbox) selects only
   * the rows on the **current page**, not all pages.
   */
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Sort behaviour configuration.
   *
   * - `false` — disables sorting entirely (headers become non-clickable).
   * - `{ multiple: true }` — allows sorting by multiple columns at once.
   * - Omitted or `{}` — single-column sort (default).
   */
  sort?: false | { multiple?: boolean };
};

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
  /** 1-based page counter, automatically kept in sync by navigation actions. */
  currentPage: number;
  /** Navigate to the next page. Mode-aware: pushes cursor in forward, pops stack in backward. */
  goToNextPage: (pageInfo: Pick<PageInfo, "endCursor">) => void;
  /** Navigate to the previous page. Mode-aware: pops stack in forward, pushes cursor in backward. */
  goToPrevPage: (pageInfo: Pick<PageInfo, "startCursor">) => void;
  /** Jump to the first page. */
  goToFirstPage: () => void;
  /** Jump to the last page. Only functional when `totalPages` is known. */
  goToLastPage: () => void;
  /** Change the page size and reset to the first page. */
  setPageSize: (size: number) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;

  // Column management
  columns: Column<TRow>[];
  visibleColumns: Column<TRow>[];
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  isColumnVisible: (fieldOrId: string) => boolean;

  /**
   * The resolved page size derived from the collection control.
   * `0` when no control (or `pageSize`) is configured.
   * Used by `DataTable.Table` to render the correct number of skeleton / ghost rows.
   */
  pageSize: number;

  // Control (passthrough for DataTable.Root)
  /**
   * The collection control passed to `useDataTable`, stored here for
   * forwarding to `DataTable.Root`.
   *
   * **Note:** The type is widened to `CollectionControl` (i.e.
   * `CollectionControl<string>`) here — field-name and operator narrowing from
   * `useCollectionVariables({ tableMetadata })` is lost. For type-safe
   * `addFilter` calls, use the `control` returned directly by
   * `useCollectionVariables` rather than accessing it via this field.
   */
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
  /** Override the column header text. Defaults to the field's `description` or `name` from metadata. */
  label?: string;
  /** Fixed column width in pixels. When omitted the column sizes naturally. */
  width?: number;
  /**
   * Set to `false` to suppress the auto-generated sort config for this field.
   * Defaults to `true` (sort is enabled when the field type supports it).
   */
  sort?: boolean;
  /**
   * Set to `false` to suppress the auto-generated filter config for this field.
   * Defaults to `true` (filter is enabled when the field type supports it).
   */
  filter?: boolean;
}
