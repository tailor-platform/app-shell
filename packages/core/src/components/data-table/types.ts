import type { ReactNode } from "react";
import type { BadgeOptions } from "@/components/badge-list";
import type {
  CollectionControl,
  Filter,
  FilterConfig,
  OperatorForFilterType,
  PageInfo,
  SelectOption,
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

// =============================================================================
// Inline editing
// =============================================================================

/** Row state passed to `edit.canEdit` alongside the row. */
export interface CellEditState {
  /** Whether the row is selected. Always `false` when row selection is off. */
  selected: boolean;
}

/** Incomplete date-time editor state, interpreted in the AppShell timezone. */
export interface DateTimeDraft {
  day: string | null;
  time: string | null;
}

interface CellEditBase<TRow extends Record<string, unknown>, TValue, TDraft = TValue | null> {
  /**
   * Decides, per row, whether the cell can be edited. Receives the row and
   * whether it is selected, so "editable once selected" is
   * `(_, { selected }) => selected`. Default: every row with an `id`.
   */
  canEdit?: (row: TRow, state: CellEditState) => boolean;
  /**
   * Observes editor drafts, including incomplete input and restored drafts on
   * cancellation. Direct inputs emit raw strings; choices emit selected values,
   * not search text or highlights. Updating `data` here is outside the supported
   * coordination contract. A failed change check retains its draft and blocks
   * confirmation; pending change checks finish before `onValueCommitted` runs.
   * Cancellation notifications cannot create a new cell error after discarding
   * the draft. Pass `error: false` for unobserved callback behavior.
   */
  onValueChange?: (row: TRow, draft: TDraft) => void;
  /**
   * Attempts to confirm a changed editor output, compared with current `data`.
   * Empty cells confirm `null`. A normal return or fulfilled Promise completes
   * the edit; throw/rejection retains the draft and error for correction or retry.
   * Focus may leave while pending. Update `data` here to adopt a successful value;
   * DataTable does not persist or roll back consumer state. Output types follow
   * the editor, not the row field's runtime type.
   */
  onValueCommitted: (row: TRow, value: TValue | null) => void;
  /**
   * Callback failures automatically open an error popover without moving focus.
   * Only non-empty `CellEditError` messages are displayed by the standard UI;
   * other failures use localized generic feedback. Translate messages before throwing.
   * Pass `false` to disable interception and retain eager edit completion, or
   * `render` to replace the popover's body. Closing the details retains the draft
   * and error; reopen with the error icon or Alt+ArrowDown. Esc closes open details
   * first, then restores current data and clears the error. The standard popover
   * adds no reset action; custom content may include consumer-owned actions.
   */
  error?:
    | false
    | {
        render: (ctx: { row: TRow; error: unknown }) => ReactNode;
      };
}

/**
 * `edit` config for `type: "text"` and `type: "link"` columns. Without
 * `options` the cell is typed into: the value is the text as typed, and an
 * emptied cell commits `null`. A `link` column shows its label as plain text
 * while the cell can be edited.
 */
export interface TextCellEditOptions<TRow extends Record<string, unknown>> extends CellEditBase<
  TRow,
  string,
  string | null
> {
  /**
   * Turns the cell into a dropdown of these choices (a supplier, a warehouse,
   * a unit of measure). The column's value is an option's `value`, and every
   * cell in the column — editable or not — shows the matching `label`.
   * Picking a choice notifies its value; a "None" choice notifies `null`.
   */
  options?: readonly SelectOption[];
}

/**
 * `edit` config for `type: "badge"` columns: a dropdown whose choices render as
 * the same badges the cell shows. Picking one notifies its `value`; a "None"
 * choice notifies `null`. Single-value columns only.
 */
export interface BadgeCellEditOptions<TRow extends Record<string, unknown>> extends CellEditBase<
  TRow,
  string
> {
  /**
   * The choices. Default: the entries of `typeOptions.badgeLabelMap`, else the
   * column's enum `filter` options. A badge column with neither can't be
   * edited.
   */
  options?: readonly SelectOption[];
}

/**
 * `edit` config for `type: "date"` columns: a calendar that opens from the
 * cell. Picking a day commits `"YYYY-MM-DD"`. With `dateFormat: "datetime"`
 * the calendar emits complete `DateTimeDraft` snapshots and Done confirms an
 * ISO 8601 timestamp in the AppShell timezone only with a valid day and time.
 * Outside closing / Esc cancels; Clear explicitly confirms `null`.
 * Date-only drafts are `"YYYY-MM-DD" | null`.
 */
export type DateCellEditOptions<TRow extends Record<string, unknown>> = CellEditBase<
  TRow,
  string,
  string | DateTimeDraft | null
>;

/**
 * `edit` config for `type: "number"` and `type: "money"` columns. Drafts are raw
 * strings (including incomplete input); confirmation emits a JavaScript number
 * or `null`, not an arbitrary-precision Decimal. Editing uses `.` as the decimal
 * separator, independently of display locale. Full-width digits and valid comma
 * grouping are normalized on confirmation. Display precision does not constrain
 * input; business rules belong to the consumer.
 */
export type NumberCellEditOptions<TRow extends Record<string, unknown>> = CellEditBase<
  TRow,
  number,
  string
>;

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
  decimal: DataTableNumericTemporalFilterOperator;
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
  | (Extract<FilterConfig, { type: "decimal" }> & {
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
 * `edit` makes the cells editable in place and also narrows per branch, so
 * `onValueCommitted` receives the editor's output type, not necessarily the
 * original row field's runtime type. Text / link / badge output strings or null.
 * Every typed column
 * supports it; untyped (`render`-only) columns don't.
 *
 * Prefer `Column<TRow>` in most cases; this is exported so consumers can
 * compose more specific column types.
 */
export type ColumnTypeBranch<TRow extends Record<string, unknown>> =
  | { type?: undefined; typeOptions?: never; accessor?: (row: TRow) => unknown; edit?: never }
  | {
      type: "text";
      typeOptions?: never;
      accessor?: (row: TRow) => string | number | boolean | bigint | null | undefined;
      edit?: TextCellEditOptions<TRow>;
    }
  | {
      type: "number";
      typeOptions?: NumberCellOptions;
      accessor?: (row: TRow) => number | null | undefined;
      edit?: NumberCellEditOptions<TRow>;
    }
  | {
      type: "money";
      typeOptions?: MoneyCellOptions<TRow>;
      accessor?: (row: TRow) => number | null | undefined;
      edit?: NumberCellEditOptions<TRow>;
    }
  | {
      type: "date";
      typeOptions?: DateCellOptions;
      accessor?: (row: TRow) => Date | string | number | null | undefined;
      edit?: DateCellEditOptions<TRow>;
    }
  | {
      type: "badge";
      typeOptions?: BadgeCellOptions;
      accessor?: (row: TRow) => string | string[] | number | boolean | null | undefined;
      edit?: BadgeCellEditOptions<TRow>;
    }
  | {
      type: "link";
      typeOptions: LinkCellOptions<TRow>;
      accessor?: (row: TRow) => string | number | boolean | null | undefined;
      edit?: TextCellEditOptions<TRow>;
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

/** Controlled or uncontrolled row-selection configuration. Keep the mode stable while mounted. */
export type RowSelectionOptions = {
  /**
   * Bulk actions for the selected IDs, shown in `DataTable.Footer` while at
   * least one row is selected. The bar includes the selection count, these
   * actions, and Clear, with pagination kept alongside. The first three actions
   * render as buttons; the rest collapse into a "More actions" menu.
   * Omit or pass an empty array to enable selection without an action bar.
   */
  actions?: SelectionAction[];
} & (
  | {
      /**
       * Controlled selected ids. Update this array from `onChange`.
       * Commands issued before the owner commits each derive from this value.
       */
      selectedIds: string[];
      onChange: (ids: string[]) => void;
      defaultSelectedIds?: never;
    }
  | {
      selectedIds?: never;
      /** Initial selected ids in uncontrolled mode; subsequent changes are ignored. */
      defaultSelectedIds?: string[];
      /** Notification of user-driven selection changes, including under StrictMode. */
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
   * Controlled or uncontrolled row selection. Providing this option enables
   * checkboxes. Uses string-normalized `row.id`; rows without an id are excluded.
   * The header checkbox adds/removes only the current page, preserving other ids.
   */
  rowSelection?: RowSelectionOptions;
  /**
   * Called with the current array of selected row IDs whenever the selection
   * changes. Providing this prop or `rowSelection` enables the checkbox
   * selection column. Selection is ID-based (`row.id`) and persists
   * across page changes. Remains supported; `rowSelection.onChange` takes
   * precedence when both callbacks are supplied.
   *
   * **Requirement:** Each row must have a string or number `id` field.
   * Rows without `id` are excluded from selection.
   *
   * **Note:** The header checkbox acts on the **current page**: checking it adds
   * the page's rows to the selection and unchecking it removes them. Rows
   * selected on other pages are kept.
   *
   * @deprecated Use `rowSelection.onChange` instead.
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

/** Presentation shared by row actions and selection actions. */
export interface DataTableAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
}

/**
 * A single row action definition for the actions column.
 */
export interface RowAction<TRow extends Record<string, unknown>> extends DataTableAction {
  /** Whether the action can act on this row. Return `false` to disable it. */
  canApply?: (row: TRow) => boolean;
  /**
   * Return `true` to disable the action for a given row.
   *
   * @deprecated Use `canApply`, which reads the other way round:
   * `isDisabled: (row) => x` is `canApply: (row) => !x`. If both are set, the
   * action is disabled when either one says so.
   */
  isDisabled?: (row: TRow) => boolean;
  onClick: (row: TRow) => void;
}

/** The second argument to `SelectionAction.onClick`. */
export interface SelectionActionHelpers {
  /** Empty the selection across all pages. */
  clearSelection: () => void;
  /**
   * Hand the bar a request it should track — for one that starts after
   * `onClick` has returned, typically from a confirm dialog's confirm button.
   * The bar then behaves as if `onClick` had returned it: actions (and Clear)
   * are disabled while it is pending. It never changes selection. Returns the
   * request, so it can be awaited too.
   */
  run: <T>(request: PromiseLike<T>) => PromiseLike<T>;
}

/**
 * An ID-based bulk action shown in `DataTable.Footer` while a selection is open.
 * Configure through `UseDataTableOptions.rowSelection.actions`.
 */
export interface SelectionAction extends DataTableAction {
  /**
   * Called with a click-time copy of all selected IDs, including unloaded rows.
   * Consumers own eligibility checks, fetching, confirmation, and execution.
   * Selection is never automatically cleared: update controlled selection based
   * on the actual result, preserving ineligible IDs and any new selections.
   *
   * Return a promise to disable the bar and show a spinner while it is pending.
   * For work started later by a confirmation dialog, pass the request to
   * `helpers.run` instead. Neither success nor failure changes selection.
   */
  onClick: (ids: string[], helpers: SelectionActionHelpers) => void | Promise<unknown>;
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
  /** Selection config (passthrough for `DataTable.Root`). */
  rowSelection?: RowSelectionOptions;
  selectedIds: string[];
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  /** Adds every row on the current page to the selection. */
  selectAllRows?: () => void;
  /** Removes the current page's rows from the selection; other pages' rows stay selected. */
  deselectAllRows?: () => void;
  /** Empties the selection across all pages. */
  clearSelection?: () => void;
  /** Id of the selection action whose request is in flight, or `null`. */
  pendingActionId?: string | null;
  /**
   * Tracks a selection action's request: disables the bar while it is pending
   * without changing selection. This is what `SelectionActionHelpers.run` calls.
   * Undefined when selection is off.
   */
  runSelectionAction?: (action: { id: string }, request: PromiseLike<unknown>) => void;
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
