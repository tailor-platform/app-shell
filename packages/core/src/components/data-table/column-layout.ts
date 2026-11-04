import type { Column } from "./types";
import {
  computePinPlacements,
  pinCellProps,
  resolvePin,
  type PinPlacement,
} from "@/components/internals/table-core/pin-layout";

function resolveAlign<TRow extends Record<string, unknown>>(
  column: Column<TRow>,
): "left" | "right" {
  return column.align ?? (column.type === "number" || column.type === "money" ? "right" : "left");
}
const SELECTION_WIDTH = 52;
const ACTIONS_WIDTH = 50;
const EXPAND_WIDTH = 44;
const SELECTION_KEY = "__datatable_selection__";
const ACTIONS_KEY = "__datatable_actions__";
const EXPAND_KEY = "__datatable_expand__";
type ColumnWidths = Record<string, number>;
interface PinLayout<TRow extends Record<string, unknown>> {
  ordered: Column<TRow>[];
  keys: Map<Column<TRow>, string>;
  placements: Map<Column<TRow>, PinPlacement>;
  selection?: PinPlacement;
  expand?: PinPlacement;
  actions?: PinPlacement;
}
function columnKeyAt<TRow extends Record<string, unknown>>(
  column: Column<TRow>,
  index: number,
): string {
  return column.id ?? column.label ?? String(index);
}
function buildColumnKeys<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
): Map<Column<TRow>, string> {
  return new Map(columns.map((column, index) => [column, columnKeyAt(column, index)]));
}
function resolveWidth(id: string, declared: number | undefined, widths: ColumnWidths): number {
  const measured = widths[id];
  return measured && measured > 0 ? measured : (declared ?? 0);
}

/** DT resolves definitions/user overrides; the core only computes resolved geometry. */
function computePinLayout<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
  pinnedColumns: Record<string, "left" | "right" | "none">,
  options: {
    hasSelection: boolean;
    hasExpand: boolean;
    hasRowActions: boolean;
    widths: ColumnWidths;
    columnKeys: Map<Column<TRow>, string>;
  },
): PinLayout<TRow> {
  const { hasSelection, hasExpand, hasRowActions, widths, columnKeys } = options;
  const keys = new Map(columns.map((column) => [column, columnKeys.get(column)!]));
  const sideOf = (column: Column<TRow>) => resolvePin(pinnedColumns[keys.get(column)!], column.pin);
  const ordered = [
    ...columns.filter((column) => sideOf(column) === "left"),
    ...columns.filter((column) => sideOf(column) === undefined),
    ...columns.filter((column) => sideOf(column) === "right"),
  ];
  const geometry = computePinPlacements([
    ...(hasSelection
      ? [
          {
            id: SELECTION_KEY,
            pin: "left" as const,
            width: resolveWidth(SELECTION_KEY, SELECTION_WIDTH, widths),
          },
        ]
      : []),
    ...(hasExpand
      ? [
          {
            id: EXPAND_KEY,
            pin: "left" as const,
            width: resolveWidth(EXPAND_KEY, EXPAND_WIDTH, widths),
          },
        ]
      : []),
    ...ordered.map((column) => ({
      id: keys.get(column)!,
      pin: sideOf(column),
      width: resolveWidth(keys.get(column)!, column.width, widths),
    })),
    ...(hasRowActions
      ? [
          {
            id: ACTIONS_KEY,
            pin: "right" as const,
            width: resolveWidth(ACTIONS_KEY, ACTIONS_WIDTH, widths),
          },
        ]
      : []),
  ]);
  const placements = new Map<Column<TRow>, PinPlacement>();
  for (const column of ordered) {
    const placement = geometry.get(keys.get(column)!);
    if (placement) placements.set(column, placement);
  }
  return {
    ordered,
    keys,
    placements,
    selection: geometry.get(SELECTION_KEY),
    expand: geometry.get(EXPAND_KEY),
    actions: geometry.get(ACTIONS_KEY),
  };
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
