import type { ReactNode } from "react";
import type { BadgeOptions } from "@/components/badge-list";
import type {
  CollectionControl,
  Filter,
  FilterConfig,
  OperatorForFilterType,
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
 * Header render context for non-sortable columns.
 */
interface NonSortableHeaderRenderContext {
  label?: string;
  sortable: false;
}

/**
 * Header render context for sortable columns.
 */
interface SortableHeaderRenderContext {
  label?: string;
  sortable: true;
  sortDirection: "Asc" | "Desc" | undefined;
  activateSort: () => void;
}

/**
 * Context passed to custom `header` renderers.
 */
export type HeaderRenderContext = NonSortableHeaderRenderContext | SortableHeaderRenderContext;

type DataTableStringFilterOperator = Extract<
  OperatorForFilterType["string"],
  "eq" | "ne" | "contains" | "notContains" | "hasPrefix" | "hasSuffix"
>;
type DataTableNumericTemporalFilterOperator = Extract<
  OperatorForFilterType["number"],
  "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between"
>;
type DataTableDateFilterOperator = Extract<
  OperatorForFilterType["date"],
  "eq" | "gte" | "lte" | "between"
>;
type DataTableEnumFilterOperator = Extract<OperatorForFilterType["enum"], "in">;
type DataTableBooleanFilterOperator = OperatorForFilterType["boolean"];
type DataTableUuidFilterOperator = Extract<OperatorForFilterType["uuid"], "eq">;
type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

type DataTableUiFilterOperatorByType = {
  string: DataTableStringFilterOperator;
  number: DataTableNumericTemporalFilterOperator;
  datetime: DataTableNumericTemporalFilterOperator;
  date: DataTableDateFilterOperator;
  time: DataTableNumericTemporalFilterOperator;
  enum: DataTableEnumFilterOperator;
  boolean: DataTableBooleanFilterOperator;
  uuid: DataTableUuidFilterOperator;
};

export type DataTableFilterConfig =
  | (Extract<FilterConfig, { type: "string" }> & {
      /**
       * Allowlist of operators shown by `DataTable.Filters` for this column.
       * Order controls both the menu order and the default operator.
       */
      operators?: NonEmptyReadonlyArray<DataTableStringFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "number" }> & {
      operators?: NonEmptyReadonlyArray<DataTableNumericTemporalFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "datetime" }> & {
      operators?: NonEmptyReadonlyArray<DataTableNumericTemporalFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "date" }> & {
      operators?: NonEmptyReadonlyArray<DataTableDateFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "time" }> & {
      operators?: NonEmptyReadonlyArray<DataTableNumericTemporalFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "enum" }> & {
      operators?: NonEmptyReadonlyArray<DataTableEnumFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "boolean" }> & {
      operators?: NonEmptyReadonlyArray<DataTableBooleanFilterOperator>;
    })
  | (Extract<FilterConfig, { type: "uuid" }> & {
      operators?: NonEmptyReadonlyArray<DataTableUuidFilterOperator>;
    });

/**
 * Fields shared by every `Column` regardless of `type`. Prefer `Column<TRow>`
 * in most cases; this is exported so consumers can compose more specific
 * column types (e.g. `type MoneyColumn<TRow> = ColumnBase<TRow> & { type: "money"; … }`).
 */
export interface ColumnBase<TRow extends Record<string, unknown>> {
  /**
   * Column header text. Used as the default header content and passed to
   * custom `header` renderers.
   */
  label?: string;
  /**
   * Renders the cell content for a given row. Optional — when omitted, the
   * built-in renderer for `type` takes over (or an `—` placeholder if no
   * `type` is set). Always wins over the built-in renderer when both are
   * present.
   *
   * `render` is a **presentation** hook. Built-in behaviors that need the raw
   * cell value — such as truncation tooltips, cell context-menu copy/filter
   * actions, and typed renderers — still resolve that value from `accessor`
   * first, then `row[col.id]`. When neither exists, those behaviors fall back
   * to the return value of `render(row)` only if it is a primitive
   * (`string`/`number`/`boolean`/`bigint`).
   *
   * Kept on the base (not per-branch) so callback contextual typing works
   * across spread-then-override patterns like `column({ ...inferred, render })`.
   */
  render?: (row: TRow) => ReactNode;
  /**
   * Custom header renderer.
   *
   * `header` is a **presentation** hook. When omitted, the built-in header
   * renders `label` and, for sortable columns, owns the sort button and
   * indicator. When provided, the return value replaces the built-in header
   * entirely. Sortable custom headers receive `sortDirection` and
   * `activateSort()` and must render their own click surface and sort
   * indicator for left-click sorting; built-in header context-menu actions are
   * still driven by `label`, `sort`, and other column metadata.
   */
  header?: (ctx: HeaderRenderContext) => ReactNode;
  /**
   * Stable identifier used for column visibility toggling, persisted layout
   * state, raw-value fallback (`row[col.id]`), and as the React key. Falls
   * back to `label` when omitted. Set this explicitly when `label` is absent,
   * not unique, or when a custom-rendered column should still participate in
   * built-in cell behaviors that need a raw value.
   */
  id?: string;
  /** Fixed column width in pixels. When omitted the column sizes naturally. */
  width?: number;
  /**
   * Freeze this column to the left or right edge so it stays visible while the
   * table scrolls horizontally. This is the **default** pin; the user can
   * override it at runtime via the toolbar's `columnSettings` control (persisted when
   * `tableId` is set).
   *
   * Sticky offsets for stacked pinned columns are measured from the rendered
   * layout, so a `width` is not required — but setting `width` on pinned columns
   * is recommended so their size stays stable as row content changes.
   */
  pin?: "left" | "right";
  /**
   * Horizontal alignment for the header and body cell. When omitted, numeric
   * `type` values (`"number"` and `"money"`) default to `"right"` so digits
   * align along their decimal place; everything else defaults to `"left"`.
   * Pass `"left"` explicitly to opt a numeric column out.
   */
  align?: "left" | "right";
  /**
   * When `true`, the cell content is truncated with an ellipsis when it
   * overflows. A `<Tooltip>` is wired up automatically when the resolved raw
   * value is a string or number (`accessor` first, then `row[col.id]`).
   *
   * Truncation requires the cell to be shrinkable — the body cell sets
   * `max-w-0`, which collapses unless another column anchors the row width.
   * Pair with `width` on neighboring columns, or rely on the natural width
   * of fixed-size columns (selection / row actions).
   */
  truncate?: boolean;
  /**
   * Sort configuration. When set, the column participates in built-in sort
   * behaviors such as the default clickable header and the header context-menu
   * sort submenu. Left-click sorting from a custom `header` still requires that
   * renderer to call `ctx.activateSort()`.
   *
   * Use `fieldTypeToSortConfig` or `inferColumns` to derive this automatically.
   */
  sort?: SortConfig;
  /**
   * Filter configuration. When set, this column appears as an option in
   * `DataTable.Filters` and, when collection `control` is available, can also
   * drive the built-in cell context-menu filter actions.
   *
   * `operators` optionally narrows the conditions exposed by the built-in
   * filter UI for this column. Order controls both the menu order and the
   * default operator. This affects the DataTable UI only — collection control
   * APIs and persisted filter state still accept the full backend operator set.
   * The cell context-menu narrows this further to single-value operators only.
   *
   * Use `fieldTypeToFilterConfig` or `inferColumns` to derive this automatically.
   */
  filter?: DataTableFilterConfig;
}

/**
 * Discriminated branches keyed off `type`. Each branch narrows `typeOptions`
 * and `accessor`'s return type to the values its renderer can display.
 *
 * - `type: "link"` requires `typeOptions.href`.
 * - `type: "text"` rejects `typeOptions` entirely.
 *
 * `accessor` lives on each branch (rather than `ColumnBase`) so the built-in
 * renderers can constrain what a column produces. It is also the primary
 * source of truth for built-in cell behaviors that need the raw value
 * (truncate tooltip, cell context-menu copy/filter actions). Returning an
 * array or a non-Date object is a compile error on a typed branch, instead of
 * silently rendering `[object Object]`. Untyped columns (`type?: undefined`)
 * still accept `unknown` — they're rendered by an explicit `render`. `null`
 * and `undefined` are always allowed: every built-in renderer maps them to the
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
 * Expandable-row configuration for `useDataTable`.
 *
 * The union is what makes an invalid setup unrepresentable: pass `expandedIds`
 * and you must pass `onChange` with it (controlled), or pass neither and let
 * the hook own the state. `onChange` alone is still allowed — in uncontrolled
 * mode it is a notification.
 */
export type RowExpansionOptions<TRow extends Record<string, unknown>> = {
  /** Renders the detail panel for an expanded row. */
  render: (row: TRow) => ReactNode;
  /**
   * Decides whether a row can be expanded. Rows returning `false` render an
   * empty cell in place of the chevron. Defaults to `true` for rows with an
   * `id`. Gates the panel in both directions: an id in `expandedIds` never
   * opens a panel for a row this rejects.
   */
  canExpand?: (row: TRow) => boolean;
  /**
   * The row's record identity — a **bare identifier** such as `"INV-1001"`, not
   * a sentence. The built-in i18n labels compose it into the accessible names of
   * the chevron ("Expand row INV-1001") and the panel ("INV-1001 details").
   * Without it, the generic "Expand row" / "Row details" fallbacks are used.
   */
  getLabel?: (row: TRow) => string;
} & (
  | {
      /**
       * Ids of the expanded rows. Passing this switches expansion to
       * **controlled** mode: internal state is never written and you update this
       * array from `onChange`.
       *
       * **Batching caveat:** each toggle derives the next array from this
       * value, so two toggles dispatched before your state commits share a base
       * and the first is lost. Relevant behind an async store (a debounced URL
       * sync, `startTransition`) or when looping the toggle over many rows.
       */
      expandedIds: string[];
      /** Called with the full array of expanded ids. Fires once per toggle. */
      onChange: (ids: string[]) => void;
    }
  | {
      expandedIds?: never;
      /**
       * Optional notification in uncontrolled mode, called with the full array
       * of expanded ids. Fires once per toggle, including under StrictMode.
       */
      onChange?: (ids: string[]) => void;
    }
);

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
  /**
   * Stable id used to persist per-user column layout (visibility, order, and
   * pinning) to `localStorage`, keyed by this id. When omitted, column layout is
   * in-memory only and resets on reload.
   */
  tableId?: string;
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
   * Expandable detail rows. Providing this enables the whole feature: a chevron
   * column is added at the left edge (auto-pinned left, after the selection
   * column) and `render`'s output appears in a full-width row beneath its parent.
   *
   * Grouped rather than flat so the parts can't be configured in a broken
   * combination — a label or predicate without a renderer, or `expandedIds`
   * without `onChange`, are all compile errors.
   *
   * **Requirement:** Each row must have a string or number `id` field.
   * Expansion is keyed by `id`, so rows without one render no chevron.
   *
   * **Note:** Expansion is **not** cleared on page change — ids of rows no
   * longer on the page simply do not render. Call `collapseAllRows()` to reset.
   */
  rowExpansion?: RowExpansionOptions<TRow>;
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
  /** Column keys in display order (visible and hidden). */
  columnOrder: string[];
  /** Move the column with `key` to `toIndex` within the ordered column list. */
  moveColumn: (key: string, toIndex: number) => void;
  /** Replace the full column order with `keys`. */
  setColumnOrder: (keys: string[]) => void;
  /** Per-user pin overrides, keyed by column key (`"none"` = explicitly unpinned). */
  pinnedColumns: Record<string, "left" | "right" | "none">;
  /**
   * Set the pin for the column with `key`: `"left"`/`"right"` to pin, `"none"` to
   * explicitly unpin (overriding a default `pin`), or `null` to clear the override
   * and fall back to the column's default.
   */
  setPin: (key: string, side: "left" | "right" | "none" | null) => void;

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

  // Row expansion
  /** Ids of the currently expanded rows. */
  expandedIds: string[];
  /** Whether `row` is currently expanded. Always `false` for rows without an `id`. */
  isRowExpanded: (row: TRow) => boolean;
  /** Toggle `row`'s detail panel. Undefined when `rowExpansion` is not provided. */
  toggleRowExpansion?: (row: TRow) => void;
  /** Collapse every expanded row. Undefined when `rowExpansion` is not provided. */
  collapseAllRows?: () => void;
  /** Expansion config (passthrough for `DataTable.Root`). */
  rowExpansion?: RowExpansionOptions<TRow>;
}

// =============================================================================
// Metadata-based Column Inference Types (DataTable specific)
// =============================================================================

type MetadataFieldFilterOptions<TType extends FilterConfig["type"] = FilterConfig["type"]> = {
  operators?: NonEmptyReadonlyArray<DataTableUiFilterOperatorByType[TType]>;
};

/**
 * Options for metadata-based single field inference.
 */
export type MetadataFieldOptions<TType extends FilterConfig["type"] = FilterConfig["type"]> = {
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
   * Set to `false` to suppress the auto-generated filter config for this field,
   * or pass `operators` to narrow the DataTable filter conditions exposed for
   * this field.
   *
   * When used through `inferColumns()` with specific table metadata, operator
   * literals are narrowed to the inferred field type. If the metadata has
   * already widened to `TableMetadata`, mismatched operators are still filtered
   * out at runtime.
   */
  filter?: boolean | MetadataFieldFilterOptions<TType>;
};
