import type { CSSProperties } from "react";

import { defaultAlignForField } from "./field";
import type { LineItemsColumnAlign, LineItemsField, LineItemsRowData } from "./types";

/** Widths measured from the rendered header, keyed by column id. */
export type ColumnWidths = Record<string, number | undefined>;

export type PinSide = "left" | "right";

export type PinPlacement = {
  side: PinSide;
  offset: number;
  /** The outermost cell of its pinned group — the one that draws the freeze seam. */
  isBoundary: boolean;
};

/** Fixed-width utility columns the grid owns rather than the field schema. */
export const GRIP_COLUMN_ID = "__grip";
export const SELECTION_COLUMN_ID = "__selection";
export const EXPAND_COLUMN_ID = "__expand";
export const ACTIONS_COLUMN_ID = "__actions";
export const SPACER_COLUMN_ID = "__spacer";

export const GRIP_COLUMN_WIDTH = 36;
export const SELECTION_COLUMN_WIDTH = 44;
/** Matches DataTable's expand column. */
export const EXPAND_COLUMN_WIDTH = 44;
export const ACTIONS_COLUMN_WIDTH = 56;

export type LayoutColumn<T extends LineItemsRowData> = {
  id: string;
  field: LineItemsField<T>;
  align: LineItemsColumnAlign;
  width: number | undefined;
  flex: boolean;
  placement: PinPlacement | undefined;
};

/**
 * Floor applied to columns that declare no `width`, so `table-layout: fixed`
 * scrolls the grid horizontally instead of crushing them to nothing.
 */
export const FLEX_COLUMN_MIN_WIDTH = 200;
export const AUTO_COLUMN_MIN_WIDTH = 120;

export type ColumnLayout<T extends LineItemsRowData> = {
  /** Field columns in render order: left-pinned, unpinned, right-pinned. */
  columns: LayoutColumn<T>[];
  /**
   * Narrowest the table may render before it starts scrolling. Without it, a
   * schema wider than its container squeezes unsized columns to a few pixels.
   */
  minTableWidth: number;
  /** Ids of the editable grid's columns in render order, for keyboard and range math. */
  gridColumnIds: string[];
  grip: PinPlacement | undefined;
  selection: PinPlacement | undefined;
  expand: PinPlacement | undefined;
  actions: PinPlacement | undefined;
  /**
   * True when no column claims `flex` and every column declares a width — the
   * grid then renders a trailing spacer so declared widths stay pixel-exact
   * instead of being stretched to fill the container.
   */
  needsSpacer: boolean;
};

function resolveWidth(id: string, declared: number | undefined, widths: ColumnWidths): number {
  return widths[id] ?? declared ?? 0;
}

/**
 * Groups columns by pin side and computes cumulative sticky offsets, mirroring
 * `computePinLayout` in `data-table.tsx`. Offsets prefer measured widths over
 * declared ones, so a pinned column does not need an explicit `width` to stack
 * correctly.
 */
export function computeColumnLayout<T extends LineItemsRowData>(
  fields: LineItemsField<T>[],
  opts: {
    widths: ColumnWidths;
    hasGrip: boolean;
    hasSelection: boolean;
    hasExpand?: boolean;
    hasActions: boolean;
    actionsWidth?: number;
  },
): ColumnLayout<T> {
  const {
    widths,
    hasGrip,
    hasSelection,
    hasExpand = false,
    hasActions,
    actionsWidth = ACTIONS_COLUMN_WIDTH,
  } = opts;

  const left: LineItemsField<T>[] = [];
  const middle: LineItemsField<T>[] = [];
  const right: LineItemsField<T>[] = [];

  for (const field of fields) {
    if (field.pin === "left") left.push(field);
    else if (field.pin === "right") right.push(field);
    else middle.push(field);
  }

  const placements = new Map<LineItemsField<T>, PinPlacement>();

  let leftOffset = 0;
  let selection: PinPlacement | undefined;
  let grip: PinPlacement | undefined;
  let expand: PinPlacement | undefined;

  // Utility columns lead, in order: selection, grip, expand. The last one
  // before any left-pinned field draws the freeze seam.
  if (hasSelection) {
    selection = {
      side: "left",
      offset: 0,
      isBoundary: !hasGrip && !hasExpand && left.length === 0,
    };
    leftOffset += resolveWidth(SELECTION_COLUMN_ID, SELECTION_COLUMN_WIDTH, widths);
  }
  if (hasGrip) {
    grip = { side: "left", offset: leftOffset, isBoundary: !hasExpand && left.length === 0 };
    leftOffset += resolveWidth(GRIP_COLUMN_ID, GRIP_COLUMN_WIDTH, widths);
  }
  if (hasExpand) {
    expand = { side: "left", offset: leftOffset, isBoundary: left.length === 0 };
    leftOffset += resolveWidth(EXPAND_COLUMN_ID, EXPAND_COLUMN_WIDTH, widths);
  }
  left.forEach((field, i) => {
    placements.set(field, {
      side: "left",
      offset: leftOffset,
      isBoundary: i === left.length - 1,
    });
    leftOffset += resolveWidth(field.key, field.width, widths);
  });

  let rightOffset = 0;
  let actions: PinPlacement | undefined;

  if (hasActions) {
    actions = { side: "right", offset: 0, isBoundary: right.length === 0 };
    rightOffset += resolveWidth(ACTIONS_COLUMN_ID, actionsWidth, widths);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const field = right[i]!;
    placements.set(field, { side: "right", offset: rightOffset, isBoundary: i === 0 });
    rightOffset += resolveWidth(field.key, field.width, widths);
  }

  const ordered = [...left, ...middle, ...right];
  const columns: LayoutColumn<T>[] = ordered.map((field) => ({
    id: field.key,
    field,
    align: defaultAlignForField(field),
    width: field.width,
    flex: field.flex === true,
    placement: placements.get(field),
  }));

  const minTableWidth =
    (hasSelection ? SELECTION_COLUMN_WIDTH : 0) +
    (hasGrip ? GRIP_COLUMN_WIDTH : 0) +
    (hasExpand ? EXPAND_COLUMN_WIDTH : 0) +
    (hasActions ? actionsWidth : 0) +
    columns.reduce((sum, c) => {
      if (typeof c.width === "number") return sum + c.width;
      return sum + (c.flex ? FLEX_COLUMN_MIN_WIDTH : AUTO_COLUMN_MIN_WIDTH);
    }, 0);

  return {
    columns,
    gridColumnIds: columns.map((c) => c.id),
    grip,
    selection,
    expand,
    actions,
    minTableWidth,
    needsSpacer:
      columns.length > 0 &&
      !columns.some((c) => c.flex) &&
      columns.every((c) => typeof c.width === "number"),
  };
}

/** Sticky positioning for a pinned cell, matching DataTable's `pinCellProps`. */
export function pinStyle(placement: PinPlacement | undefined): CSSProperties | undefined {
  if (!placement) return undefined;
  return { position: "sticky", [placement.side]: placement.offset };
}
