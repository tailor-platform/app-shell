import type { RowSelectionOptions, SelectionAction } from "@/components/data-table/types";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import type { ReactNode } from "react";

/**
 * One typed line-change op produced by `getChangeSet()`. The shape is
 * transport-agnostic — apps map it onto GraphQL mutations or REST calls.
 *
 * - `add` → `{ tempId, data, line }`. `data` holds the editable fields (metadata
 *   fields included); `line` is the whole line, for read-only fields the server
 *   still needs, such as a picked product's id. `tempId` is client-only, for
 *   matching results back (see `reset({ idMap })`); the server assigns the id.
 * - `update` → `{ lineId, patch }`; only changed fields appear in `patch`. `lineId`
 *   is the line's id (read from `idKey`) as a string.
 * - `remove` → `{ lineId }`.
 * - `reorder` → `{ lineId, position }`; zero-based final index (manual ordering only).
 */
export type LineItemsLineChange =
  | { action: "add"; tempId: string; data: LineItemsRowPatch; line: LineItemsRowPatch }
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
 * DataTable's `SelectionAction`, plus the modes LineItems offers it in.
 */
export type LineItemsSelectionAction = SelectionAction & {
  /**
   * Modes the action shows in. Defaults to `["edit"]`: amend is for a document
   * past confirmation, where bulk changes should be a deliberate opt-in —
   * `modes: ["edit", "amend"]`.
   */
  modes?: LineItemsMode[];
};

type WithLineItemsActions<O> = O extends unknown
  ? Omit<O, "actions"> & {
      /**
       * Bulk actions, shown at the foot of `LineItems.Table` while lines are
       * selected. Each gets the selected line keys; see `LineItemsSelectionAction`.
       */
      actions?: LineItemsSelectionAction[];
    }
  : never;

/** DataTable's `RowSelectionOptions`, with mode-aware actions. */
export type LineItemsRowSelectionOptions = WithLineItemsActions<RowSelectionOptions>;

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

/**
 * One out-of-band cell edit, emitted for `commit: "metadata"` fields on saved
 * lines. On a new line, metadata fields travel with its `add` op instead.
 */
export type LineItemsMetadataCommit<T extends LineItemsRowData> = {
  /** The saved line's id (read from `idKey`), as a string. */
  lineId: string;
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

/**
 * A line. Saved lines carry their id in `id` (or the field named by
 * `idKey`); new lines leave it unset until the app re-keys them after a save.
 */
export type LineItemsRowData = Record<string, unknown>;

/**
 * What `reset` takes after a save. Omit it only when nothing new was added.
 *
 * - An array: the lines as saved, usually the server's response. Replaces the
 *   lines and the baseline, and picks up values the server computed.
 * - `{ idMap }`: maps each new line's `tempId` (from its `add` op) to the id
 *   the server assigned, for backends that return created ids.
 */
export type LineItemsResetInput<T extends LineItemsRowData> =
  | readonly T[]
  | { idMap: Readonly<Record<string, string | number>> };

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
  /** Accessible name for the editor — column and line. Put it on your input. */
  ariaLabel: string;
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
      /** A fixed list, filtered in the browser — units of measure, statuses. */
      options: ReadonlyArray<LineItemsSelectOption>;
      fetcher?: never;
      getOptionLabel?: never;
      placeholder?: string;
    }
  | {
      kind: "select";
      options?: never;
      /**
       * Loads options from the backend as the user types — a product or SKU
       * lookup over a real catalogue. The same fetcher `Combobox.Async` takes:
       * `(query, { signal }) => Promise<LineItemsSelectOption[]>`, with `query`
       * `null` when the list opens before any typing.
       */
      fetcher: AsyncFetcher<LineItemsSelectOption>;
      /**
       * The label to show for the stored value, which the loaded results
       * usually don't include — e.g. read a product name stored on the line.
       */
      getOptionLabel: (value: string, line: T) => string;
      placeholder?: string;
    }
  | { kind: "boolean" }
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
export type LineItemsField<T extends LineItemsRowData> = LineItemsFieldBase<T> &
  (
    | {
        /**
         * Modes in which an editor replaces `render`. Omitted means read-only.
         * Typical editable line columns pass `["edit"]`.
         */
        editable?: undefined;
        /** Optional on read-only fields; still drives paste parsing and equality. */
        type?: LineItemsFieldType<T>;
      }
    | {
        /**
         * Modes in which an editor replaces `render`. Typical editable line
         * columns pass `["edit"]`.
         */
        editable: LineItemsMode[];
        /** Required when the field is editable: picks the editor, parsing and equality. */
        type: LineItemsFieldType<T>;
      }
  );

type LineItemsFieldBase<T extends LineItemsRowData> = {
  /** Stable column id. For editable fields, use a real key on `T`. */
  key: (keyof T & string) | (string & {});
  label: ReactNode;
  /** Cell content in view mode, and in edit mode whenever no editor is shown. */
  render: (line: T) => ReactNode;
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

/**
 * Who owns the rows. Uncontrolled: the hook, seeded once from `defaultLines`
 * (`onLinesChange` may still observe edits). Controlled: the parent, through
 * `lines` + `onLinesChange` — required together, since `lines` without a
 * handler would silently drop every edit.
 */
type LineItemsRowSource<T extends LineItemsRowData> =
  | {
      /** Uncontrolled seed rows, also used as the dirty-tracking baseline. Read once on mount. */
      defaultLines?: readonly T[];
      lines?: never;
      /** Observes each mutation with the new rows. */
      onLinesChange?: (next: T[]) => void;
    }
  | {
      /** Controlled rows. */
      lines: readonly T[];
      /** Called once per mutation with the new rows; feed them back into `lines`. */
      onLinesChange: (next: T[]) => void;
      defaultLines?: never;
    };

export type UseLineItemsOptions<T extends LineItemsRowData> = LineItemsRowSource<T> & {
  /** Column schema. Build with `createLineItemHelper<T>().field({ … })`. */
  fields: LineItemsField<T>[];
  /**
   * The field holding a saved line's id, the same convention as DataTable's
   * `row.id`. Defaults to `"id"`. New lines leave it unset; LineItems tracks
   * them by a temp key until `reset` brings in the saved id.
   */
  idKey?: keyof T & string;
  /** Defaults to `"edit"`. */
  mode?: LineItemsMode;
  /** Defaults to `"sort"`. Pass `"manual"` to enable drag-reordering. */
  ordering?: LineItemsOrderingMode;
  /**
   * Adds the row-selection checkbox column — the same option as DataTable's
   * `rowSelection`. Pass `{}` for uncontrolled selection, `{ defaultSelectedIds }`
   * to seed it, or `{ selectedIds, onChange }` to control it. Selected ids are
   * line keys (see `getLineKey`). With `actions`, a bulk-action bar sits at the foot of
   * `LineItems.Table` while lines are selected; actions get the selected ids
   * and never clear the selection on their own.
   */
  rowSelection?: LineItemsRowSelectionOptions;
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
  /**
   * `isDirty`, read live: already `false` right after `reset` or `revert`,
   * before React re-renders. For guards that run in the same handler, such as
   * a navigation blocker after `await save(); reset(); navigate(…)`.
   */
  hasUnsavedChanges: () => boolean;
  filter: string;
  selectionEnabled: boolean;
  selectedIds: string[];
  /** The selected lines, in document order. */
  selectedRows: T[];
  /** The bulk actions offered in the current mode. */
  selectionActions: LineItemsSelectionAction[];
  /** Id of the selection action whose request is in flight, or `null`. */
  pendingActionId: string | null;
  /**
   * Tracks a selection action's request: the bar disables its actions while it
   * is pending, without changing selection. The bar calls this for you.
   */
  runSelectionAction: ((action: { id: string }, request: PromiseLike<unknown>) => void) | undefined;
  /** Active sort, or `null` when in document order. Always `null` under manual ordering. */
  sortState: LineItemsSortState | null;

  setMode: (mode: LineItemsMode) => void;
  setFilter: (query: string) => void;
  /** Cycles the column through ascending, descending, then unsorted. */
  toggleSort: (columnId: string) => void;
  /**
   * The key LineItems tracks `line` by, which every method taking a `lineKey`
   * expects: the line's id as a string once saved, or a temp key while new.
   * Lines keep their key through `{ ...line }` copies.
   */
  getLineKey: (line: T) => string;
  /** `true` for a line not saved yet (no id) — e.g. to disable an "Open" link. */
  isNewLine: (line: T) => boolean;
  /**
   * Inserts one line and returns its key. The id field is left unset (any id
   * passed in is dropped), so the line reads as new until `reset` re-keys it.
   */
  addLine: (data: Partial<T>, opts?: { afterLineKey?: string | null }) => string;
  /**
   * Inserts several lines in a single render, returning their keys in
   * input order. Prefer this over looping `addLine` — a bulk picker adding N
   * rows should produce one render and N `add` ops, not N renders.
   */
  addLines: (items: ReadonlyArray<Partial<T>>, opts?: { afterLineKey?: string | null }) => string[];
  removeLine: (lineKey: string) => void;
  /** Removes several lines in one update — for a bulk action's ids. */
  removeLines: (lineKeys: readonly string[]) => void;
  updateField: <K extends keyof T>(lineKey: string, key: K, value: T[K]) => void;
  /** Batched updates — one render for a whole paste or fill-drag. */
  updateLines: (patches: { lineKey: string; patch: Partial<T> }[]) => void;
  /** Moves a line after `afterLineKey`, or to the head when `null`. Manual ordering only. */
  reorderLine: (lineKey: string, afterLineKey: string | null) => void;
  toggleSelect: (lineKey: string) => void;
  /** Selects every row currently passing the search filter. */
  selectAllVisible: () => void;
  clearSelection: () => void;
  bulkUpdate: (patch: Partial<T>) => void;
  bulkRemove: () => void;
  /**
   * Appends a copy of the last line (without its id) and returns its key.
   * `derive` adjusts the copy, e.g. to clear a quantity.
   */
  duplicateLastLine: (derive?: (prev: T) => Partial<T>) => string | undefined;
  /**
   * Snaps the baseline forward after a successful save. Pass the saved lines,
   * or `{ idMap }`, so new lines pick up their server ids — see
   * `LineItemsResetInput`. With no argument, new lines keep their temp keys,
   * and their next edit would be sent as an `update` the server can't match;
   * LineItems warns about that in development.
   */
  reset: (saved?: LineItemsResetInput<T>) => void;
  /** Discards every uncommitted edit, insert, and removal back to the baseline. */
  revert: () => void;
  getChangeSet: () => LineItemsChangeSet;
};
