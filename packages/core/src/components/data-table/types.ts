import type { ReactNode } from "react";
import type { BadgeProps } from "@/components/badge";
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
 * Built-in cell renderer types for `Column.type`.
 *
 * Each type produces a default render based on the value returned by
 * `accessor`. Pass `render` to override the built-in renderer.
 *
 * - `text` — `String(value)` with `—` placeholder for null/undefined.
 * - `number` — locale-formatted number with `—` for null/undefined.
 * - `money` — `Intl.NumberFormat` currency. See `typeOptions.currency` and
 *   `typeOptions.maxDecimals`.
 * - `date` — `Intl.DateTimeFormat`. Accepts `Date`, ISO string, or epoch ms.
 * - `badge` — `<Badge>` keyed off the value. See `typeOptions.badgeVariantMap`.
 * - `link` — app-shell `<Link>` with `href` from `typeOptions.href`.
 */
export type ColumnCellType = "text" | "number" | "money" | "date" | "badge" | "link";

/** Variant union accepted by the app-shell `<Badge>` component. */
export type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Type-specific options for `Column.type`. Fields that don't apply to the
 * column's `type` are ignored at render time.
 */
export interface ColumnTypeOptions<TRow extends Record<string, unknown>> {
  // ---- number / money --------------------------------------------------------
  /**
   * BCP 47 locale tag for `number`, `money`, and `date` cells. Defaults to the
   * runtime locale.
   */
  locale?: string;
  /** Minimum decimal places for `number` cells. Default: `0`. */
  minDecimals?: number;
  /** Maximum decimal places for `number` cells. Default: `0`. */
  maxDecimals?: number;
  // ---- money -----------------------------------------------------------------
  /**
   * ISO 4217 currency code for `money` cells. Pass a string for a static
   * currency or a function to read from the row. Default: `"USD"`.
   */
  currency?: string | ((row: TRow) => string);
  // ---- date ------------------------------------------------------------------
  /**
   * Format style for `date` cells.
   * - `"short"` — `Apr 9, 2026`.
   * - `"long"` — `April 9, 2026`.
   * - `"datetime"` — `Apr 9, 2026, 3:45 PM`.
   *
   * Default: `"short"`.
   */
  dateFormat?: "short" | "long" | "datetime";
  // ---- badge -----------------------------------------------------------------
  /**
   * Maps each cell value (stringified) to a Badge variant. Values not in the
   * map fall back to `defaultBadgeVariant`.
   */
  badgeVariantMap?: Record<string, BadgeVariant>;
  /**
   * Maps each cell value (stringified) to a display label. Values not in the
   * map render the raw cell value.
   */
  badgeLabelMap?: Record<string, string>;
  /** Variant used when the value is not in `badgeVariantMap`. Default: `"neutral"`. */
  defaultBadgeVariant?: BadgeVariant;
  // ---- link ------------------------------------------------------------------
  /**
   * Extracts the link target for `link` cells. Returning `null` / `undefined`
   * renders the value as plain text instead of a link.
   */
  href?: (row: TRow) => string | null | undefined;
}

/**
 * A column definition for DataTable.
 */
export interface Column<TRow extends Record<string, unknown>> {
  /** Column header text. Omit for action or icon-only columns. */
  label?: string;
  /**
   * Renders the cell content for a given row. Optional when `type` is set —
   * the built-in renderer is used instead. Always wins when both are present.
   */
  render?: (row: TRow) => ReactNode;
  /**
   * Built-in cell renderer. When set, the cell is rendered automatically from
   * the value returned by `accessor` (or `row[id]` when `accessor` is omitted).
   * Pass `render` to override.
   */
  type?: ColumnCellType;
  /** Type-specific options applied when `type` is set. */
  typeOptions?: ColumnTypeOptions<TRow>;
  /**
   * Stable identifier used for column visibility toggling and as the React key.
   * Falls back to `label` when omitted. Set this explicitly when `label` is
   * absent or not unique.
   */
  id?: string;
  /** Fixed column width in pixels. When omitted the column sizes naturally. */
  width?: number;
  /**
   * Extracts the raw value from a row. Used by built-in `type` renderers and
   * available to consumers for sorting or clipboard copying. When `type` is
   * set and `accessor` is omitted, the renderer falls back to `row[id]`.
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
