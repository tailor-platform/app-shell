import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { Column } from "./types";

// Resolve the effective horizontal alignment for a column. Numeric `type`
// values default to `"right"` so digits line up along their decimal place;
// everything else defaults to `"left"`. Explicit `col.align` always wins.
function resolveAlign<TRow extends Record<string, unknown>>(col: Column<TRow>): "left" | "right" {
  if (col.align) return col.align;
  if (col.type === "number" || col.type === "money") return "right";
  return "left";
}

// Fallback widths of the built-in selection / row-actions columns, used as the
// innermost anchors before the real widths are measured.
const SELECTION_WIDTH = 52;
const ACTIONS_WIDTH = 50;
const EXPAND_WIDTH = 44;
// Keys for the built-in selection / row-actions columns in the measured-width map.
const SELECTION_KEY = "__datatable_selection__";
const ACTIONS_KEY = "__datatable_actions__";
const EXPAND_KEY = "__datatable_expand__";

type PinSide = "left" | "right";
type ColumnWidths = Record<string, number>;

interface PinPlacement {
  side: PinSide;
  /** Distance from the pinned edge, in px. */
  offset: number;
  /** True for the cell at the freeze seam — it draws the divider border. */
  isBoundary: boolean;
}

interface PinLayout<TRow extends Record<string, unknown>> {
  /** Visible columns reordered into `[left-pinned, unpinned, right-pinned]`. */
  ordered: Column<TRow>[];
  /** Render key per column (data-col-key + React key), keyed by column reference. */
  keys: Map<Column<TRow>, string>;
  /** Sticky placement per pinned column (keyed by column reference). */
  placements: Map<Column<TRow>, PinPlacement>;
  /** Placement for the built-in selection column, when pinned. */
  selection?: PinPlacement;
  /** Placement for the built-in expand column, when present. */
  expand?: PinPlacement;
  /** Placement for the built-in row-actions column, when pinned. */
  actions?: PinPlacement;
}

function columnKeyAt<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  index: number,
): string {
  return col.id ?? col.label ?? String(index);
}

/** Rendered width for a column key: the measured value wins once > 0, else the
 *  declared width, else 0. */
function resolveWidth(key: string, declared: number | undefined, widths: ColumnWidths): number {
  const measured = widths[key];
  return measured && measured > 0 ? measured : (declared ?? 0);
}

/**
 * Resolve a column's effective pin: the per-user override wins over the static
 * default. `"none"` is an explicit unpin (overrides a pinned default).
 */
function resolvePin(
  stored: "left" | "right" | "none" | undefined,
  defaultPin: PinSide | undefined,
): PinSide | undefined {
  if (stored === "none") return undefined;
  return stored ?? defaultPin;
}

/**
 * Definition-order `col → key` map — the single source of truth for a column's
 * identity, matching how `useDataTable` / `ColumnSettings` store order,
 * visibility, and pin state. Built from the **full** column list so a key never
 * depends on the column's position in the filtered/reordered *visible* array: a
 * column with neither `id` nor `label` falls back to `String(index)`, and keying
 * it off its visible index would silently detach its stored pin/visibility once
 * a sibling is hidden or moved. Keyed by reference — `visibleColumns` reuses
 * these same column objects.
 */
function buildColumnKeys<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
): Map<Column<TRow>, string> {
  const keys = new Map<Column<TRow>, string>();
  columns.forEach((col, index) => keys.set(col, columnKeyAt(col, index)));
  return keys;
}

/**
 * Group the visible columns by pin side and compute cumulative sticky offsets.
 * The selection and expand columns (when present) auto-pin to the left edge and
 * row-actions (if present) auto-pins to the right edge, with user-pinned columns
 * stacking outward from them.
 *
 * `columnKeys` is the definition-order key map (see {@link buildColumnKeys});
 * `columns` here is the visible/reordered subset, so keys are resolved by
 * reference from that map rather than from each column's position in it.
 */
function computePinLayout<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
  pinnedColumns: Record<string, "left" | "right" | "none">,
  opts: {
    hasSelection: boolean;
    hasExpand: boolean;
    hasRowActions: boolean;
    widths: ColumnWidths;
    columnKeys: Map<Column<TRow>, string>;
  },
): PinLayout<TRow> {
  const { hasSelection, hasExpand, hasRowActions, widths, columnKeys } = opts;

  const keyOf = (col: Column<TRow>): string => columnKeys.get(col) as string;

  const keys = new Map<Column<TRow>, string>();
  columns.forEach((col) => keys.set(col, keyOf(col)));

  const left: Column<TRow>[] = [];
  const middle: Column<TRow>[] = [];
  const right: Column<TRow>[] = [];

  columns.forEach((col) => {
    const pin = resolvePin(pinnedColumns[keyOf(col)], col.pin);
    if (pin === "left") left.push(col);
    else if (pin === "right") right.push(col);
    else middle.push(col);
  });

  const placements = new Map<Column<TRow>, PinPlacement>();

  // Left group, visually [selection?, expand?, ...left]; offsets accumulate
  // rightward using the measured (or declared) width of each preceding pinned
  // column. `isBoundary` marks the outermost cell of the group — the one that
  // draws the freeze seam — so it moves to `expand` as soon as that column exists.
  let leftOffset = 0;
  let selection: PinPlacement | undefined;
  let expand: PinPlacement | undefined;
  if (hasSelection) {
    selection = { side: "left", offset: 0, isBoundary: !hasExpand && left.length === 0 };
    leftOffset = resolveWidth(SELECTION_KEY, SELECTION_WIDTH, widths);
  }
  if (hasExpand) {
    expand = { side: "left", offset: leftOffset, isBoundary: left.length === 0 };
    leftOffset += resolveWidth(EXPAND_KEY, EXPAND_WIDTH, widths);
  }
  left.forEach((col, i) => {
    placements.set(col, { side: "left", offset: leftOffset, isBoundary: i === left.length - 1 });
    leftOffset += resolveWidth(keys.get(col) as string, col.width, widths);
  });

  // Right group, visually [...right, actions?]; offsets accumulate leftward.
  let rightOffset = 0;
  let actions: PinPlacement | undefined;
  if (hasRowActions) {
    actions = { side: "right", offset: 0, isBoundary: right.length === 0 };
    rightOffset = resolveWidth(ACTIONS_KEY, ACTIONS_WIDTH, widths);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const col = right[i];
    placements.set(col, { side: "right", offset: rightOffset, isBoundary: i === 0 });
    rightOffset += resolveWidth(keys.get(col) as string, col.width, widths);
  }

  return { ordered: [...left, ...middle, ...right], keys, placements, selection, expand, actions };
}

/**
 * Merge sticky positioning + background + boundary-divider styles onto a cell's
 * existing style/className. Pinned body cells stay opaque across hover/selected
 * states so scrolled content never bleeds through them.
 */
function pinCellProps(
  placement: PinPlacement | undefined,
  base: { style?: CSSProperties; className?: string },
  variant: "header" | "body" | "footer",
): { style?: CSSProperties; className?: string } {
  if (!placement) return base;
  const style: CSSProperties = {
    ...base.style,
    position: "sticky",
    [placement.side]: placement.offset,
  };
  const className = cn(
    base.className,
    // Below the sticky header/footer (z-10) but above non-pinned scrolling cells.
    "astw:z-[1]",
    variant !== "body"
      ? // Opaque pinned cells cover the section's inset-shadow divider; redraw
        // it on the cell because collapsed borders disappear on sticky sections.
        cn(
          "astw:bg-card astw:before:pointer-events-none astw:before:absolute astw:before:inset-x-0 astw:before:h-px astw:before:bg-border astw:before:content-['']",
          variant === "header" ? "astw:before:bottom-0" : "astw:before:top-0",
        )
      : cn(
          "astw:bg-card astw:transition-colors",
          // Match the row's hover/selected fade timing; without the cell-level
          // transition, sticky pinned cells snap while the rest of the row fades.
          "astw:group-hover:[background-color:color-mix(in_srgb,var(--muted)_50%,var(--card))]",
          "astw:group-aria-selected:bg-muted",
        ),
    // Freeze-seam shadow via a pseudo-element gradient. A real `box-shadow` is
    // dropped by browsers on cells under `border-collapse: collapse` (the table's
    // model), so we paint a gradient just outside the boundary edge instead — it
    // sits above the scrolling cells and reads as depth. Hidden at rest; revealed
    // only while content is scrolled under that edge (data attributes set on the
    // scroll container by DataTable.Table).
    placement.isBoundary &&
      placement.side === "left" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:right-0 astw:after:w-1 astw:after:translate-x-full astw:after:bg-gradient-to-r astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-left]_&]:after:opacity-100",
    placement.isBoundary &&
      placement.side === "right" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:left-0 astw:after:w-1 astw:after:-translate-x-full astw:after:bg-gradient-to-l astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-right]_&]:after:opacity-100",
  );
  return { style, className };
}

export {
  resolveAlign,
  SELECTION_WIDTH,
  ACTIONS_WIDTH,
  EXPAND_WIDTH,
  SELECTION_KEY,
  ACTIONS_KEY,
  EXPAND_KEY,
  columnKeyAt,
  resolvePin,
  buildColumnKeys,
  computePinLayout,
  pinCellProps,
  type ColumnWidths,
  type PinLayout,
};
