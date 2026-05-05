import * as React from "react";

/* ======================================================================== */
/* Domain primitives                                                         */
/* ======================================================================== */

/** Discriminated line change operations (transport-agnostic; apps map to GraphQL/REST). */
export type LineItemsLineChangeAction = "add" | "update" | "remove" | "move";

export type LineItemsRowPatch = Record<string, unknown>;

export type LineItemsLineChange =
  | {
      action: "add";
      lineRef: string;
      /** `null` inserts at the start of the document order. */
      insertAfterLineRef: string | null;
      patch: LineItemsRowPatch;
    }
  | { action: "update"; lineRef: string; patch: LineItemsRowPatch }
  | { action: "remove"; lineRef: string }
  | {
      action: "move";
      lineRef: string;
      /** `null` moves to the front. */
      afterLineRef: string | null;
    };

export type LineItemsChangeSet = {
  lineChanges: LineItemsLineChange[];
};

export type LineItemsMode = "display" | "edit" | "amend";
export type LineItemsOrderingMode = "sort" | "manual";
export type LineItemsColumnAlign = "left" | "center" | "right";

/** Every row exposes a stable `lineRef` (server id when present, else a generated temp id). */
export type LineItemsRowData = Record<string, unknown> & { lineRef: string };

/** Per-cell delta emitted by metadata-scoped fields (see `LineItemsField.commit`). */
export type LineItemsMetadataCommit<TRow extends LineItemsRowData> = {
  lineRef: string;
  patch: LineItemsRowPatch;
  previous: LineItemsRowPatch;
  row: TRow;
};

/* ======================================================================== */
/* Field schema                                                              */
/* ======================================================================== */

/** One option for `kind: "select"` fields (SKU pickers, UoM, etc.). */
export type LineItemsSelectOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Drives input type, formatting, normalization, and equality for an editable field.
 * Required when the field is editable; omit for read-only / computed fields.
 */
export type LineItemsFieldType =
  | { kind: "text" }
  | { kind: "number"; decimals?: number }
  | {
      kind: "select";
      options: ReadonlyArray<LineItemsSelectOption>;
      placeholder?: string;
    };

/**
 * Describes how cell mutations are propagated:
 *   - "document" (default): bundled into the document change-set (see `getChangeSet()`).
 *   - "metadata": per-cell deltas that bypass the change-set (e.g. journal-entry notes
 *     that update on commit even while the rest of the document is in `amend` mode).
 */
export type LineItemsFieldCommit = "document" | "metadata";

/**
 * One column in the line-items table.
 *
 * The `key` property doubles as the column id AND the property name on `T` for
 * editable fields. Computed/derived columns (e.g. a "total" column) just pick a
 * unique string for `key` and omit `editable` / `type`.
 *
 * Build with `createLineItemHelper<T>().field({ ... })` for full TypeScript
 * inference of `key`, `render`, and `sort.comparator`.
 */
export type LineItemsField<T extends LineItemsRowData> = {
  /** Stable column id. For editable fields use a real key on `T`. */
  // eslint-disable-next-line @typescript-eslint/ban-types -- the `string & {}` wrapper preserves keyof inference
  key: (keyof T & string) | (string & {});
  /** Header content (string or any React node). */
  label: React.ReactNode;
  /** Cell content for read-only display AND when no editor is shown. */
  render: (line: T) => React.ReactNode;
  /**
   * Modes in which an editable input replaces `render`. Empty/omitted -> read-only.
   * For typical PO/SO line columns this is `["edit"]`. Notes and similar metadata
   * use `["edit", "amend"]` together with `commit: "metadata"`.
   */
  editable?: LineItemsMode[];
  /** Required when the field is editable; drives input type and equality semantics. */
  type?: LineItemsFieldType;
  /** "document" (default) bundles into the change-set; "metadata" emits per-cell deltas. */
  commit?: LineItemsFieldCommit;
  /** Adds a sort affordance to the column header; called when the user clicks it. */
  sort?: { comparator: (a: T, b: T) => number };
  /** Returns `true` if `line` matches the current search query. */
  search?: (line: T, query: string) => boolean;
  align?: LineItemsColumnAlign;
  className?: string | ((line: T) => string | undefined);
  /** Resting column width in pixels. Honored when set; otherwise auto-sized. */
  width?: number;
  /**
   * If set, the column widens to this pixel value while the user hovers any cell
   * (header or body) in the column, with a subtle CSS transition. Useful for
   * dense columns that show truncated content (e.g. a SKU + product label).
   */
  hoverExpandWidth?: number;
};

/* ======================================================================== */
/* Hook surface                                                              */
/* ======================================================================== */

export type UseLineItemsOptions<T extends LineItemsRowData> = {
  /** Column / field schema. Build with `createLineItemHelper<T>().field({...})`. */
  fields: LineItemsField<T>[];
  /** Uncontrolled seed (used as the dirty-tracking baseline). */
  data?: readonly T[];
  /** Controlled lines + change handler. When set, `data` is ignored. */
  lines?: readonly T[];
  onLinesChange?: (next: T[]) => void;
  /** Default `"edit"`. */
  mode?: LineItemsMode;
  /** Default `"sort"`. */
  ordering?: LineItemsOrderingMode;
  /** Enable bulk row checkbox selection. */
  selection?: boolean;
  /** Per-cell delta callback for `commit: "metadata"` fields. */
  onMetadataCommit?: (event: LineItemsMetadataCommit<T>) => void;
};

export type UseLineItemsReturn<T extends LineItemsRowData> = {
  /* ---- Reactive state ---- */
  /** Filtered (search-applied) document order. */
  lines: T[];
  /** Unfiltered document order. */
  allLines: T[];
  fields: LineItemsField<T>[];
  mode: LineItemsMode;
  ordering: LineItemsOrderingMode;
  /** True when the current state diverges from the baseline. */
  isDirty: boolean;
  filter: string;
  /** Whether bulk row selection is enabled (mirrors `UseLineItemsOptions.selection`). */
  selectionEnabled: boolean;
  selectedIds: string[];

  /* ---- Imperative ---- */
  setMode: (m: LineItemsMode) => void;
  setFilter: (q: string) => void;
  /** Insert a new logical line. Returns the new lineRef. */
  addLine: (data: Partial<Omit<T, "lineRef">>, opts?: { afterLineRef?: string | null }) => string;
  removeLine: (lineRef: string) => void;
  /** Single-cell typed update. */
  updateField: <K extends keyof T>(lineRef: string, key: K, value: T[K]) => void;
  /** Batched updates (used by paste/fill and for a single re-render). */
  updateLines: (patches: { lineRef: string; patch: Partial<T> }[]) => void;
  /** Order-only reorder; only meaningful with `ordering: "manual"`. */
  reorderLine: (lineRef: string, afterLineRef: string | null) => void;
  toggleSelect: (lineRef: string) => void;
  /** Select every currently-visible (filtered) row. */
  selectAllVisible: () => void;
  clearSelection: () => void;
  /** Apply `patch` to every selected row. */
  bulkUpdate: (patch: Partial<T>) => void;
  /** Remove every selected row. */
  bulkRemove: () => void;
  duplicateLastLine: (derive?: (prev: T, newRef: string) => T) => string | undefined;
  /** Snap the baseline to the current state (typically called after a successful save). */
  reset: () => void;
  /**
   * Revert current row state back to the dirty-tracking baseline — discards
   * every uncommitted edit/insert/remove in one shot. Use this for "Discard
   * changes" UI; pair with `reset()` after a successful save.
   */
  revert: () => void;
  getChangeSet: () => LineItemsChangeSet;
};
