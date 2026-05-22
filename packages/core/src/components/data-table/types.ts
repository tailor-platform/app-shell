import type { ReactNode } from "react";
import type { BadgeOptions } from "@/components/badge-list";
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
 * - `money` — `Intl.NumberFormat` currency. See `MoneyOptions`.
 * - `date` — `Intl.DateTimeFormat`. Accepts `Date`, ISO string, or epoch ms.
 * - `badge` — `<Badge>` keyed off the value. See `BadgeOptions`.
 * - `link` — app-shell `<Link>` with `href` from `LinkOptions`.
 */
export type ColumnCellType = "text" | "number" | "money" | "date" | "badge" | "link";

export type { BadgeVariant } from "@/components/badge-list";

/** Options for `type: "number"` cells. */
export interface NumberCellOptions {
  /** Minimum decimal places. Default: `0`. */
  minDecimals?: number;
  /** Maximum decimal places. Default: `minDecimals` (or `0`). */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "money"` cells. */
export interface MoneyCellOptions<TRow extends Record<string, unknown>> {
  /**
   * ISO 4217 currency code. Pass a string for a static currency or a function
   * to read it from the row. Default: `"USD"`.
   */
  currency?: string | ((row: TRow) => string);
  /**
   * Maximum decimals. Raises the cap above the currency default while keeping
   * the minimum at the currency default (e.g. USD stays at ≥2, but a price
   * column can show up to 4).
   */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "date"` cells. */
export interface DateCellOptions {
  /**
   * Format style. `"short"` → `Apr 9, 2026`; `"long"` → `April 9, 2026`;
   * `"datetime"` → `Apr 9, 2026, 3:45 PM`. Default: `"short"`.
   */
  dateFormat?: "short" | "long" | "datetime";
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "badge"` cells. */
export interface BadgeCellOptions extends BadgeOptions {
  /** Maximum number of badges to display before showing a "+N" overflow indicator */
  maxVisible?: number;
}

/** Options for `type: "link"` cells. `href` is required. */
export interface LinkCellOptions<TRow extends Record<string, unknown>> {
  /**
   * Extracts the link target. Returning `null` / `undefined` renders the cell
   * value as plain text instead of a link.
   */
  href: (row: TRow) => string | null | undefined;
}

/**
 * Fields shared by every `Column` regardless of `type`. Prefer `Column<TRow>`
 * in most cases; this is exported so consumers can compose more specific
 * column types (e.g. `type MoneyColumn<TRow> = ColumnBase<TRow> & { type: "money"; … }`).
 */
export interface ColumnBase<TRow extends Record<string, unknown>> {
  /** Column header text. Omit for action or icon-only columns. */
  label?: string;
  /**
   * Renders the cell content for a given row. Optional — when omitted, the
   * built-in renderer for `type` takes over (or an `—` placeholder if no
   * `type` is set). Always wins over the built-in renderer when both are
   * present.
   *
   * Kept on the base (not per-branch) so callback contextual typing works
   * across spread-then-override patterns like `column({ ...inferred, render })`.
   */
  render?: (row: TRow) => ReactNode;
  /**
   * Stable identifier used for column visibility toggling and as the React key.
   * Falls back to `label` when omitted. Set this explicitly when `label` is
   * absent or not unique.
   */
  id?: string;
  /** Fixed column width in pixels. When omitted the column sizes naturally. */
  width?: number;
  /**
   * Horizontal alignment for the header and body cell. When omitted, numeric
   * `type` values (`"number"` and `"money"`) default to `"right"` so digits
   * align along their decimal place; everything else defaults to `"left"`.
   * Pass `"left"` explicitly to opt a numeric column out.
   */
  align?: "left" | "right";
  /**
   * When `true`, the cell content is truncated with an ellipsis when it
   * overflows. A `<Tooltip>` is wired up automatically when `accessor`
   * returns a string or number, so hovering the cell reveals the full
   * value.
   *
   * Truncation requires the cell to be shrinkable — the body cell sets
   * `max-w-0`, which collapses unless another column anchors the row width.
   * Pair with `width` on neighboring columns, or rely on the natural width
   * of fixed-size columns (selection / row actions).
   */
  truncate?: boolean;
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

/**
 * Discriminated branches keyed off `type`. Each branch narrows `typeOptions`
 * and `accessor`'s return type to the values its renderer can display.
 *
 * - `type: "link"` requires `typeOptions.href`.
 * - `type: "text"` rejects `typeOptions` entirely.
 *
 * `accessor` lives on each branch (rather than `ColumnBase`) so the built-in
 * renderers can constrain what a column produces. Returning an array or a
 * non-Date object is a compile error on a typed branch, instead of silently
 * rendering `[object Object]`. Untyped columns (`type?: undefined`) still
 * accept `unknown` — they're rendered by an explicit `render`. `null` and
 * `undefined` are always allowed: every built-in renderer maps them to the
 * `—` placeholder.
 *
 * Prefer `Column<TRow>` in most cases; this is exported so consumers can
 * compose more specific column types.
 */
export type ColumnTypeBranch<TRow extends Record<string, unknown>> =
  | { type?: undefined; typeOptions?: never; accessor?: (row: TRow) => unknown }
  | {
      type: "text";
      typeOptions?: never;
      accessor?: (row: TRow) => string | number | boolean | bigint | null | undefined;
    }
  | {
      type: "number";
      typeOptions?: NumberCellOptions;
      accessor?: (row: TRow) => number | null | undefined;
    }
  | {
      type: "money";
      typeOptions?: MoneyCellOptions<TRow>;
      accessor?: (row: TRow) => number | null | undefined;
    }
  | {
      type: "date";
      typeOptions?: DateCellOptions;
      accessor?: (row: TRow) => Date | string | number | null | undefined;
    }
  | {
      type: "badge";
      typeOptions?: BadgeCellOptions;
      accessor?: (row: TRow) => string | string[] | number | boolean | null | undefined;
    }
  | {
      type: "link";
      typeOptions: LinkCellOptions<TRow>;
      accessor?: (row: TRow) => string | number | boolean | null | undefined;
    };

/**
 * A column definition for DataTable. Use one of the built-in `type` values
 * (`text`, `number`, `money`, `date`, `badge`, `link`) for automatic
 * rendering, or pass `render` to draw the cell yourself.
 *
 * `Column` is a discriminated union on `type`, so wrong-shape `typeOptions`
 * are a compile error rather than silently ignored at runtime.
 */
export type Column<TRow extends Record<string, unknown>> = ColumnBase<TRow> &
  ColumnTypeBranch<TRow>;

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
