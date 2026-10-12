import type { ReactNode } from "react";

/**
 * One typed line-change op produced by `getChangeSet()`. The shape is
 * transport-agnostic — apps map it onto GraphQL mutations or REST calls.
 *
 * - `add` → `{ tempId, data }`; `tempId` is client-only, the server mints the real id.
 * - `update` → `{ lineId, patch }`; only changed fields appear in `patch`.
 * - `remove` → `{ lineId }`.
 * - `reorder` → `{ lineId, position }`; zero-based final index (manual ordering only).
 */
export type LineItemsLineChange =
  | { action: "add"; tempId: string; data: LineItemsRowPatch }
  | { action: "update"; lineId: string; patch: LineItemsRowPatch }
  | { action: "remove"; lineId: string }
  | { action: "reorder"; lineId: string; position: number };

export type LineItemsRowPatch = Record<string, unknown>;

/** Result of `useLineItems().getChangeSet()`. `isEmpty` short-circuits no-op submits. */
export type LineItemsChangeSet = {
  isEmpty: boolean;
  lineChanges: LineItemsLineChange[];
};

/**
 * `"view"` renders every cell read-only. `"edit"` and `"amend"` each render an
 * editor for fields whose `editable` list includes that mode, so `"amend"` is a
 * partial lock: a document past confirmation where only a few fields (a memo, a
 * received quantity) may still be corrected. Cells locked in `"amend"` are
 * tinted so it is obvious what is still touchable.
 */
export type LineItemsMode = "view" | "edit" | "amend";

/**
 * `"sort"` (default) lets column headers drive row order and emits no reorder
 * ops. `"manual"` preserves document order, enables drag-reordering, and emits
 * `reorder` ops in the change-set.
 */
export type LineItemsOrderingMode = "sort" | "manual";

export type LineItemsColumnAlign = "left" | "center" | "right";

/**
 * Where a field's edits go.
 *
 * - `"document"` (default) bundles them into `getChangeSet()`.
 * - `"metadata"` keeps them out of the change-set and emits them through
 *   `onMetadataCommit` instead, for values that save out-of-band — a journal
 *   memo that stays editable while the rest of the document is locked.
 */
export type LineItemsFieldCommit = "document" | "metadata";

/** One out-of-band cell edit, emitted for `commit: "metadata"` fields. */
export type LineItemsMetadataCommit<T extends LineItemsRowData> = {
  lineRef: string;
  patch: LineItemsRowPatch;
  previous: LineItemsRowPatch;
  row: T;
};

export type LineItemsSortDirection = "asc" | "desc";

/** Which column the grid is sorted by, under `ordering: "sort"`. */
export type LineItemsSortState = {
  columnId: string;
  direction: LineItemsSortDirection;
};

/** Every row exposes a stable `lineRef` — the server id when persisted, else a generated temp id. */
export type LineItemsRowData = Record<string, unknown> & { lineRef: string };

/** One option for a `kind: "select"` field (SKU pickers, unit of measure, etc.). */
export type LineItemsSelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Context handed to a `kind: "custom"` field's `renderEditor`. Mirrors the
 * contract the built-in editors follow so keyboard nav, commit, and
 * dirty-tracking keep working around a custom editor.
 */
export type LineItemsCustomEditorContext<T extends LineItemsRowData> = {
  /** Current cell value, already passed through the field's `normalize` when set. */
  value: unknown;
  /** Commit a new value into the line. Call on blur or Enter, not per keystroke. */
  onCommit: (next: unknown) => void;
  /** Abandon the in-flight edit (Escape). The previous value is kept. */
  onCancel: () => void;
  row: T;
  mode: LineItemsMode;
  field: LineItemsField<T>;
};

/**
 * Drives the editor input, formatting, normalization, and equality for an
 * editable field. Omit for read-only or computed columns.
 */
export type LineItemsFieldType<T extends LineItemsRowData = LineItemsRowData> =
  | { kind: "text" }
  | { kind: "number"; decimals?: number }
  | {
      kind: "select";
      options: ReadonlyArray<LineItemsSelectOption>;
      placeholder?: string;
    }
  | { kind: "boolean"; trueLabel?: string; falseLabel?: string }
  | { kind: "date"; min?: string; max?: string }
  | {
      kind: "custom";
      /** Renders the in-cell editor only — the grid owns the selection ring and fill handle. */
      renderEditor: (ctx: LineItemsCustomEditorContext<T>) => ReactNode;
      /** Value coercion before equality. Mirrors `LineItemsField.normalize`. */
      normalize?: (value: unknown, row: T) => unknown;
      /** Dirty-equality. Mirrors `LineItemsField.equals`. */
      equals?: (a: unknown, b: unknown, row: T) => boolean;
    };

/**
 * One column in the line-items table.
 *
 * `key` doubles as the column id and, for editable fields, the property name on
 * `T`. Computed columns (a derived "total", say) pick any unique string for
 * `key` and omit `editable` and `type` — they are excluded from the change-set.
 *
 * Build these with `createLineItemHelper<T>().field({ … })` to get full
 * inference of `key`, `render`, and `sort.comparator`.
 */
export type LineItemsField<T extends LineItemsRowData> = {
  /** Stable column id. For editable fields, use a real key on `T`. */
  key: (keyof T & string) | (string & {});
  label: ReactNode;
  /** Cell content in view mode, and in edit mode whenever no editor is shown. */
  render: (line: T) => ReactNode;
  /**
   * Modes in which an editor replaces `render`. Omitted or empty means
   * read-only. Typical editable line columns pass `["edit"]`.
   */
  editable?: LineItemsMode[];
  /** Required when the field is editable; drives the editor input and equality semantics. */
  type?: LineItemsFieldType<T>;
  /**
   * `"document"` (default) bundles edits into the change-set; `"metadata"`
   * routes them to `onMetadataCommit` and omits them from it.
   */
  commit?: LineItemsFieldCommit;
  /**
   * Makes the column header sortable, cycling ascending, descending, then
   * unsorted. Ignored when `ordering` is `"manual"`, which preserves document
   * order.
   */
  sort?: { comparator: (a: T, b: T) => number };
  /** Returns `true` when `line` matches the active search query. */
  search?: (line: T, query: string) => boolean;
  /**
   * Horizontal alignment. When omitted, `number` fields default to `"right"`
   * and `boolean` fields to `"center"`; everything else to `"left"`.
   */
  align?: LineItemsColumnAlign;
  className?: string | ((line: T) => string | undefined);
  /**
   * Coerce raw values before the dirty-equality compare and before they are
   * emitted into the change-set. Defaults to trimming strings; `number` fields
   * with `decimals` also get rounding. Override for app rules such as money
   * rounding per currency.
   */
  normalize?: (value: unknown, row: T) => unknown;
  /**
   * Dirty-equality. Defaults to `Object.is`, with a 1e-9 epsilon for `number`
   * fields so cosmetic input like `"1"` vs `"1.00"` is not a document change.
   */
  equals?: (a: unknown, b: unknown, row: T) => boolean;
  /** Resting column width in pixels. Auto-sized when omitted. */
  width?: number;
  /**
   * Widens the column to this pixel width while the pointer is anywhere in it,
   * with a short transition. For dense columns whose content is normally
   * truncated. A `flex` column is frozen at its current width during the
   * expansion so the table grows instead of the flex column collapsing.
   */
  hoverExpandWidth?: number;
  /**
   * Freeze the column to the left or right edge so it stays visible during
   * horizontal scroll. Stacked pinned columns have their sticky offsets
   * measured from the rendered layout, so `width` is not required — though
   * setting it keeps pinned columns from resizing as row content changes.
   */
  pin?: "left" | "right";
  /**
   * When `true`, this column absorbs leftover horizontal space. Set it on the
   * column with the longest content (a description, typically). Without it, a
   * trailing spacer column absorbs the leftover instead so declared widths
   * stay pixel-exact.
   */
  flex?: boolean;
};

export type UseLineItemsOptions<T extends LineItemsRowData> = {
  /** Column schema. Build with `createLineItemHelper<T>().field({ … })`. */
  fields: LineItemsField<T>[];
  /** Uncontrolled seed rows, also used as the dirty-tracking baseline. */
  data?: readonly T[];
  /** Controlled rows. When set, `data` is ignored. */
  lines?: readonly T[];
  onLinesChange?: (next: T[]) => void;
  /** Defaults to `"edit"`. */
  mode?: LineItemsMode;
  /** Defaults to `"sort"`. Pass `"manual"` to enable drag-reordering. */
  ordering?: LineItemsOrderingMode;
  /** Enables the row selection checkbox column. */
  selection?: boolean;
  /** Receives edits to `commit: "metadata"` fields, which bypass the change-set. */
  onMetadataCommit?: (event: LineItemsMetadataCommit<T>) => void;
};

export type UseLineItemsReturn<T extends LineItemsRowData> = {
  /** Document order with the active search filter applied. */
  lines: T[];
  /** Full document order, ignoring the search filter. */
  allLines: T[];
  fields: LineItemsField<T>[];
  mode: LineItemsMode;
  ordering: LineItemsOrderingMode;
  /** `true` when current state diverges from the baseline. */
  isDirty: boolean;
  filter: string;
  selectionEnabled: boolean;
  selectedIds: string[];
  /** Active sort, or `null` when in document order. Always `null` under manual ordering. */
  sortState: LineItemsSortState | null;

  setMode: (mode: LineItemsMode) => void;
  setFilter: (query: string) => void;
  /** Cycles the column through ascending, descending, then unsorted. */
  toggleSort: (columnId: string) => void;
  /** Inserts one line and returns its new `lineRef`. */
  addLine: (data: Partial<Omit<T, "lineRef">>, opts?: { afterLineRef?: string | null }) => string;
  /**
   * Inserts several lines in a single render, returning the new `lineRef`s in
   * input order. Prefer this over looping `addLine` — a bulk picker adding N
   * rows should produce one render and N `add` ops, not N renders.
   */
  addLines: (
    items: ReadonlyArray<Partial<Omit<T, "lineRef">>>,
    opts?: { afterLineRef?: string | null },
  ) => string[];
  removeLine: (lineRef: string) => void;
  updateField: <K extends keyof T>(lineRef: string, key: K, value: T[K]) => void;
  /** Batched updates — one render for a whole paste or fill-drag. */
  updateLines: (patches: { lineRef: string; patch: Partial<T> }[]) => void;
  /** Moves a line after `afterLineRef`, or to the head when `null`. Manual ordering only. */
  reorderLine: (lineRef: string, afterLineRef: string | null) => void;
  toggleSelect: (lineRef: string) => void;
  /** Selects every row currently passing the search filter. */
  selectAllVisible: () => void;
  clearSelection: () => void;
  bulkUpdate: (patch: Partial<T>) => void;
  bulkRemove: () => void;
  duplicateLastLine: (derive?: (prev: T, newRef: string) => T) => string | undefined;
  /** Snaps the baseline forward to current state. Call after a successful save. */
  reset: () => void;
  /** Discards every uncommitted edit, insert, and removal back to the baseline. */
  revert: () => void;
  getChangeSet: () => LineItemsChangeSet;
};
