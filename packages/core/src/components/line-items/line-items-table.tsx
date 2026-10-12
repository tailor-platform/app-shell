import * as React from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp, GripVertical } from "lucide-react";

import { Checkbox } from "@/components/checkbox";
import { cn } from "@/lib/utils";
import {
  ACTIONS_COLUMN_ID,
  ACTIONS_COLUMN_WIDTH,
  computeColumnLayout,
  GRIP_COLUMN_ID,
  GRIP_COLUMN_WIDTH,
  pinStyle,
  SELECTION_COLUMN_ID,
  SELECTION_COLUMN_WIDTH,
  SPACER_COLUMN_ID,
  type ColumnWidths,
  type PinPlacement,
} from "./column-layout";
import {
  fieldAllowsFill,
  fieldIsAmendLocked,
  fieldIsEditableInMode,
  fieldsToColumnDefs,
} from "./field";
import { normalizeField } from "./internals";
import { LineItemsCell, type ArrowKey, type CellNavigation } from "./line-items-cell";
import { useLineItemsContext } from "./line-items-context";
import { LineItemsSkeletonRow } from "./line-items-skeleton-row";
import {
  coordsToRowsMatrix,
  parseClipboardTsv,
  serializeMatrixTsv,
  type GridCoord,
} from "./spreadsheet-logic";
import { coordKey, useGridSelection } from "./use-grid-selection";
import { useRowVirtualizer } from "./use-row-virtualizer";
import type { LineItemsRowData } from "./types";

export type LineItemsTableProps<T extends LineItemsRowData> = {
  /** Uniform row height in pixels, which the virtualizer's math depends on. */
  rowHeight?: number;
  /** Height of the scroll viewport. Ignored in fullscreen, which fills the overlay. */
  maxBodyHeight?: React.CSSProperties["maxHeight"];
  /** Set `false` to mount every row (short documents, print, tests). */
  virtualized?: boolean;
  /** Trailing pinned column of per-row controls. */
  rowActions?: (row: T) => React.ReactNode;
  rowActionsWidth?: number;
  /**
   * Sticky footer row, rendered in a `<tfoot>` of the same table so its cells
   * stay aligned with the columns above. Prefer `<LineItems.TotalsRow>`, which
   * handles column alignment and pinning for you.
   */
  totalsRow?: (lines: T[]) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  /** Swaps the body for skeleton rows while an initial fetch is in flight. */
  loading?: boolean;
  skeletonRowCount?: number;
  className?: string;
  tableContainerClassName?: string;
};

const headCellClasses =
  "astw:h-10 astw:bg-card astw:px-2 astw:text-left astw:align-middle astw:text-xs astw:font-medium astw:text-muted-foreground astw:whitespace-nowrap astw:overflow-hidden astw:text-ellipsis astw:border-b astw:border-r astw:border-border";

const bodyCellClasses =
  "astw:relative astw:h-9 astw:p-0 astw:align-middle astw:text-sm astw:whitespace-nowrap astw:overflow-hidden astw:text-ellipsis astw:border-b astw:border-r astw:border-border";

const alignClasses = {
  left: "astw:text-left",
  center: "astw:text-center",
  right: "astw:text-right",
} as const;

const ariaSortValues = { asc: "ascending", desc: "descending" } as const;
const sortIcons = { asc: ChevronUp, desc: ChevronDown } as const;

/**
 * Pinned cells stay opaque so scrolled content never shows through them, which
 * means they cannot inherit the row's background — they have to repaint it, or
 * a selected row goes un-tinted under the frozen columns.
 */
function pinClasses(
  placement: PinPlacement | undefined,
  opts?: { selected?: boolean },
): string | undefined {
  if (!placement) return undefined;
  return cn(
    "astw:z-[1]",
    opts?.selected ? "astw:bg-muted" : "astw:bg-card",
    placement.isBoundary &&
      (placement.side === "left"
        ? "astw:shadow-[inset_-1px_0_0_0_var(--border)]"
        : "astw:shadow-[inset_1px_0_0_0_var(--border)]"),
  );
}

/** Thin scrollbars, so a dense grid is not framed by chunky OS gutters. */
const SCROLLBAR_STYLES = `
[data-slot="line-items-table-scroll"]{scrollbar-width:thin;scrollbar-color:rgba(128,128,128,0.4) transparent}
[data-slot="line-items-table-scroll"]::-webkit-scrollbar{width:8px;height:8px}
[data-slot="line-items-table-scroll"]::-webkit-scrollbar-track,
[data-slot="line-items-table-scroll"]::-webkit-scrollbar-corner{background:transparent}
[data-slot="line-items-table-scroll"]::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.4);border-radius:4px}
`;

/**
 * The editable grid.
 *
 * Rows are windowed by a hand-rolled virtualizer (spacer rows above and below
 * stand in for unmounted ones), so a thousand-line document mounts only the
 * visible slice. Every editable cell in that slice mounts its own editor, which
 * is what makes the grid read as a spreadsheet at rest.
 */
export function LineItemsTable<T extends LineItemsRowData>({
  rowHeight = 36,
  maxBodyHeight = "min(60vh, 480px)",
  virtualized = true,
  rowActions,
  rowActionsWidth = ACTIONS_COLUMN_WIDTH,
  totalsRow,
  emptyMessage,
  loading = false,
  skeletonRowCount = 12,
  className,
  tableContainerClassName,
}: LineItemsTableProps<T>) {
  const { lineItems, fullscreen, totalsRenderer } = useLineItemsContext<T>("Table");
  const { lines, fields, mode, ordering, selectionEnabled, selectedIds, sortState } = lineItems;

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [widths, setWidths] = React.useState<ColumnWidths>({});
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null);

  const canReorder = ordering === "manual" && mode === "edit";
  const showSelection = selectionEnabled && mode !== "view";

  const layout = React.useMemo(
    () =>
      computeColumnLayout(fields, {
        widths,
        hasGrip: canReorder,
        hasSelection: showSelection,
        hasActions: Boolean(rowActions),
        actionsWidth: rowActionsWidth,
      }),
    [canReorder, fields, rowActions, rowActionsWidth, showSelection, widths],
  );

  const columnDefs = React.useMemo(() => fieldsToColumnDefs(fields), [fields]);
  const orderedLineRefs = React.useMemo(() => lines.map((l) => l.lineRef), [lines]);

  /**
   * Every schema column takes part in selection and copy, so a computed column
   * can be read out; paste and fill still refuse to write read-only ones.
   */
  const gridColumnIds = React.useMemo(() => layout.columns.map((c) => c.id), [layout.columns]);

  const grid = useGridSelection(orderedLineRefs, gridColumnIds);

  const virtualWindow = useRowVirtualizer(scrollRef, {
    rowCount: lines.length,
    rowHeight,
    enabled: virtualized && !loading,
  });

  const visibleLines = lines.slice(virtualWindow.startIndex, virtualWindow.endIndex);
  const headRefs = React.useRef(new Map<string, HTMLTableCellElement | null>());

  /**
   * Measures rendered header widths so pinned columns stack without every one
   * declaring a `width`. Skipped while a column is hover-expanded, so the
   * expansion does not get baked into the measured layout.
   */
  React.useEffect(() => {
    if (hoveredColumnId) return;
    const measured: ColumnWidths = {};
    let changed = false;
    for (const [id, el] of headRefs.current) {
      if (!el) continue;
      const w = Math.round(el.getBoundingClientRect().width);
      if (w <= 0) continue;
      measured[id] = w;
      if (widths[id] !== w) changed = true;
    }
    if (changed) setWidths((prev) => ({ ...prev, ...measured }));
  }, [hoveredColumnId, layout.columns, lines.length, widths]);

  const lineByRef = React.useMemo(() => {
    const map = new Map<string, T>();
    for (const l of lines) map.set(l.lineRef, l);
    return map;
  }, [lines]);

  const fieldById = React.useMemo(() => {
    const map = new Map<string, (typeof fields)[number]>();
    for (const f of fields) map.set(f.key, f);
    return map;
  }, [fields]);

  const displayValueOf = React.useCallback(
    (lineRef: string, columnId: string): string => {
      const row = lineByRef.get(lineRef);
      if (!row) return "";
      const raw = (row as Record<string, unknown>)[columnId];
      return raw === null || raw === undefined ? "" : String(raw);
    },
    [lineByRef],
  );

  const commitCell = React.useCallback(
    (coord: GridCoord, value: unknown) => {
      const row = lineByRef.get(coord.lineRef);
      if (!row) return;
      const normalized = normalizeField(columnDefs, coord.columnId, value, row);
      lineItems.updateLines([
        { lineRef: coord.lineRef, patch: { [coord.columnId]: normalized } as Partial<T> },
      ]);
    },
    [columnDefs, lineByRef, lineItems],
  );

  /** Keeps the active cell in view without stealing focus or animating. */
  const scrollActiveIntoView = React.useCallback(
    (coord: GridCoord) => {
      const container = scrollRef.current;
      if (!container) return;
      const index = orderedLineRefs.indexOf(coord.lineRef);
      if (index < 0) return;
      const top = index * rowHeight;
      const bottom = top + rowHeight;
      if (top < container.scrollTop) container.scrollTop = top;
      else if (bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = bottom - container.clientHeight;
      }
    },
    [orderedLineRefs, rowHeight],
  );

  /** Moves DOM focus to a cell's editor, so navigation lands in the next input. */
  const focusCellEditor = React.useCallback((coord: GridCoord) => {
    const container = scrollRef.current;
    if (!container) return;
    const cell = container.querySelector<HTMLElement>(
      `[data-line-ref="${CSS.escape(coord.lineRef)}"][data-column-id="${CSS.escape(coord.columnId)}"]`,
    );
    cell?.querySelector<HTMLElement>("[data-slot=line-items-cell-editor]")?.focus();
  }, []);

  const moveActive = React.useCallback(
    (key: ArrowKey, shift?: boolean) => {
      const next = grid.moveActive(key, { shift });
      if (!next) return;
      scrollActiveIntoView(next);
      if (!shift) focusCellEditor(next);
    },
    [focusCellEditor, grid, scrollActiveIntoView],
  );

  /**
   * Enter and Tab wrap at the row edges, so tabbing straight through a document
   * never dead-ends: Tab past the last column lands on the next row's first
   * column, and Shift+Tab past the first wraps back up to the previous row's last.
   */
  const navigateFromEdit = React.useCallback(
    (to: CellNavigation, from: GridCoord) => {
      const rowIndex = orderedLineRefs.indexOf(from.lineRef);
      const colIndex = gridColumnIds.indexOf(from.columnId);
      if (rowIndex < 0 || colIndex < 0) return;

      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (to === "enter-down") nextRow = Math.min(orderedLineRefs.length - 1, rowIndex + 1);
      else if (to === "enter-up") nextRow = Math.max(0, rowIndex - 1);
      else if (to === "tab") {
        if (colIndex === gridColumnIds.length - 1) {
          if (rowIndex === orderedLineRefs.length - 1) return;
          nextRow = rowIndex + 1;
          nextCol = 0;
        } else nextCol = colIndex + 1;
      } else if (to === "shift-tab") {
        if (colIndex === 0) {
          if (rowIndex === 0) return;
          nextRow = rowIndex - 1;
          nextCol = gridColumnIds.length - 1;
        } else nextCol = colIndex - 1;
      }

      const lineRef = orderedLineRefs[nextRow];
      const columnId = gridColumnIds[nextCol];
      if (!lineRef || !columnId) return;

      const coord = { lineRef, columnId };
      grid.setActive(coord);
      scrollActiveIntoView(coord);
      focusCellEditor(coord);
    },
    [focusCellEditor, gridColumnIds, grid, orderedLineRefs, scrollActiveIntoView],
  );

  /* ---- Fill gesture ----------------------------------------------------- */

  const [fillSource, setFillSource] = React.useState<GridCoord | null>(null);
  const [fillHoverLineRef, setFillHoverLineRef] = React.useState<string | null>(null);

  const isInFillPreview = React.useCallback(
    (coord: GridCoord): boolean => {
      if (!fillSource || !fillHoverLineRef) return false;
      if (coord.columnId !== fillSource.columnId) return false;
      const a = orderedLineRefs.indexOf(fillSource.lineRef);
      const b = orderedLineRefs.indexOf(fillHoverLineRef);
      const i = orderedLineRefs.indexOf(coord.lineRef);
      if (a < 0 || b < 0 || i < 0) return false;
      return i >= Math.min(a, b) && i <= Math.max(a, b);
    },
    [fillHoverLineRef, fillSource, orderedLineRefs],
  );

  /**
   * Tracks the pointer against rendered cells while a fill is in progress and
   * broadcasts the source value across the painted range on release.
   */
  React.useEffect(() => {
    if (!fillSource) return;

    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest<HTMLElement>("[data-slot=line-items-grid-cell]");
      const lineRef = cell?.dataset.lineRef;
      if (lineRef) setFillHoverLineRef(lineRef);
    };

    const onUp = () => {
      const targetRef = fillHoverLineRef;
      const source = fillSource;
      setFillSource(null);
      setFillHoverLineRef(null);
      if (!targetRef || targetRef === source.lineRef) return;

      const field = fieldById.get(source.columnId);
      const sourceRow = lineByRef.get(source.lineRef);
      if (!field || !sourceRow || !fieldAllowsFill(field, mode)) return;

      const a = orderedLineRefs.indexOf(source.lineRef);
      const b = orderedLineRefs.indexOf(targetRef);
      if (a < 0 || b < 0) return;

      const value = (sourceRow as Record<string, unknown>)[source.columnId];
      const patches: { lineRef: string; patch: Partial<T> }[] = [];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        const ref = orderedLineRefs[i];
        if (!ref || ref === source.lineRef) continue;
        const row = lineByRef.get(ref);
        if (!row) continue;
        patches.push({
          lineRef: ref,
          patch: {
            [source.columnId]: normalizeField(columnDefs, source.columnId, value, row),
          } as Partial<T>,
        });
      }
      if (patches.length > 0) lineItems.updateLines(patches);
    };

    globalThis.addEventListener("pointermove", onMove);
    globalThis.addEventListener("pointerup", onUp);
    return () => {
      globalThis.removeEventListener("pointermove", onMove);
      globalThis.removeEventListener("pointerup", onUp);
    };
  }, [
    columnDefs,
    fieldById,
    fillHoverLineRef,
    fillSource,
    lineByRef,
    lineItems,
    mode,
    orderedLineRefs,
  ]);

  /* ---- Clipboard -------------------------------------------------------- */

  const handleCopy = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (grid.selected.size <= 1) return;
      const coords: GridCoord[] = [];
      for (const lineRef of orderedLineRefs) {
        for (const columnId of gridColumnIds) {
          if (grid.selected.has(coordKey(lineRef, columnId))) coords.push({ lineRef, columnId });
        }
      }
      if (coords.length === 0) return;
      const matrix = coordsToRowsMatrix(orderedLineRefs, gridColumnIds, coords, displayValueOf);
      if (matrix.length === 0) return;
      event.preventDefault();
      event.clipboardData.setData("text/plain", serializeMatrixTsv(matrix));
    },
    [displayValueOf, grid.selected, gridColumnIds, orderedLineRefs],
  );

  /**
   * Pastes a TSV block anchored at the active cell. A single copied value is
   * broadcast across the whole selection (Excel's behavior); a larger block is
   * written as a rectangle. Read-only columns in range are skipped.
   */
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (!grid.active || mode === "view") return;
      const text = event.clipboardData.getData("text/plain");
      const matrix = parseClipboardTsv(text);
      if (matrix.length === 0) return;
      event.preventDefault();

      const patches = new Map<string, Record<string, unknown>>();
      const put = (lineRef: string, columnId: string, raw: string) => {
        const field = fieldById.get(columnId);
        const row = lineByRef.get(lineRef);
        if (!field || !row || !fieldIsEditableInMode(field, mode)) return;
        const patch = patches.get(lineRef) ?? {};
        patch[columnId] = normalizeField(columnDefs, columnId, raw, row);
        patches.set(lineRef, patch);
      };

      const single = matrix.length === 1 && matrix[0]?.length === 1;
      if (single && grid.selected.size > 1) {
        const raw = matrix[0]![0]!;
        for (const lineRef of orderedLineRefs) {
          for (const columnId of gridColumnIds) {
            if (grid.selected.has(coordKey(lineRef, columnId))) put(lineRef, columnId, raw);
          }
        }
      } else {
        const startRow = orderedLineRefs.indexOf(grid.active.lineRef);
        const startCol = gridColumnIds.indexOf(grid.active.columnId);
        if (startRow < 0 || startCol < 0) return;
        matrix.forEach((cells, r) => {
          const lineRef = orderedLineRefs[startRow + r];
          if (!lineRef) return;
          cells.forEach((raw, c) => {
            const columnId = gridColumnIds[startCol + c];
            if (columnId) put(lineRef, columnId, raw);
          });
        });
      }

      if (patches.size === 0) return;
      lineItems.updateLines(
        [...patches].map(([lineRef, patch]) => ({ lineRef, patch: patch as Partial<T> })),
      );
    },
    [
      columnDefs,
      fieldById,
      grid.active,
      grid.selected,
      gridColumnIds,
      lineByRef,
      lineItems,
      mode,
      orderedLineRefs,
    ],
  );

  const handleGridKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      // An open editor owns its own keys; it forwards navigation explicitly.
      if (target.dataset?.slot === "line-items-cell-editor") return;
      if (!grid.active) return;

      const key = event.key;
      if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        moveActive(key, event.shiftKey);
        return;
      }
      if (key === "Escape") grid.clearSelection();
    },
    [grid, moveActive],
  );

  /* ---- Row reordering --------------------------------------------------- */

  const [dragRef, setDragRef] = React.useState<string | null>(null);
  const [dropBefore, setDropBefore] = React.useState<string | null>(null);
  const [liftedRef, setLiftedRef] = React.useState<string | null>(null);

  const moveLine = React.useCallback(
    (lineRef: string, beforeLineRef: string | null) => {
      const others = orderedLineRefs.filter((id) => id !== lineRef);
      const at = beforeLineRef ? others.indexOf(beforeLineRef) : others.length;
      lineItems.reorderLine(lineRef, at <= 0 ? null : (others[at - 1] ?? null));
    },
    [lineItems, orderedLineRefs],
  );

  const endDrag = React.useCallback(() => {
    setDragRef(null);
    setDropBefore(null);
  }, []);

  const nudge = React.useCallback(
    (lineRef: string, delta: -1 | 1) => {
      const index = orderedLineRefs.indexOf(lineRef);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= orderedLineRefs.length) return;
      const others = orderedLineRefs.filter((id) => id !== lineRef);
      lineItems.reorderLine(lineRef, target === 0 ? null : (others[target - 1] ?? null));
    },
    [lineItems, orderedLineRefs],
  );

  const utilityColumnCount = (showSelection ? 1 : 0) + (canReorder ? 1 : 0) + (rowActions ? 1 : 0);
  const columnCount = layout.columns.length + utilityColumnCount;
  const allVisibleSelected =
    lines.length > 0 && lines.every((l) => selectedIds.includes(l.lineRef));

  /**
   * A hover-expanded column takes its extra width from the flex column, which is
   * frozen at its own measured width for the duration so the table grows
   * sideways and scrolls, instead of the flex column collapsing.
   */
  const flexColumnId = layout.columns.find((c) => c.flex)?.id;
  const flexFrozenWidth = hoveredColumnId && flexColumnId ? widths[flexColumnId] : undefined;

  const colWidthStyle = (c: (typeof layout.columns)[number]): React.CSSProperties | undefined => {
    if (c.flex) return flexFrozenWidth ? { width: flexFrozenWidth } : undefined;
    return { width: c.width };
  };

  /**
   * Hover-expanding columns have their width animated imperatively rather than
   * rendered: a `<col>` ignores CSS transitions, so the width is tweened frame
   * by frame. React never writes their width, or a re-render mid-tween would
   * snap the column to its resting size.
   */
  const colRefs = React.useRef(new Map<string, HTMLTableColElement | null>());
  const tweenFrame = React.useRef<number | null>(null);

  const tweenColumnWidth = React.useCallback((columnId: string, to: number) => {
    const el = colRefs.current.get(columnId);
    if (!el) return;
    if (tweenFrame.current !== null) cancelAnimationFrame(tweenFrame.current);

    const from = Number.parseFloat(el.style.width) || to;
    if (from === to) return;

    const started = performance.now();
    const duration = 180;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      el.style.width = `${from + (to - from) * eased}px`;
      tweenFrame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    tweenFrame.current = requestAnimationFrame(step);
  }, []);

  React.useEffect(
    () => () => {
      if (tweenFrame.current !== null) cancelAnimationFrame(tweenFrame.current);
    },
    [],
  );

  const enterColumn = (c: (typeof layout.columns)[number]) => {
    if (!c.field.hoverExpandWidth) return;
    setHoveredColumnId(c.id);
    tweenColumnWidth(c.id, c.field.hoverExpandWidth);
  };

  const leaveColumn = (c: (typeof layout.columns)[number]) => {
    if (!c.field.hoverExpandWidth) return;
    setHoveredColumnId(null);
    tweenColumnWidth(c.id, c.width ?? c.field.hoverExpandWidth);
  };

  return (
    <div
      data-slot="line-items-table"
      className={cn(
        "astw:relative astw:w-full astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:bg-card",
        fullscreen && "astw:flex astw:min-h-0 astw:flex-1 astw:flex-col",
        className,
      )}
    >
      <style>{SCROLLBAR_STYLES}</style>
      <div
        ref={scrollRef}
        data-slot="line-items-table-scroll"
        className={cn(
          "astw:relative astw:w-full astw:overflow-auto",
          fullscreen && "astw:min-h-0 astw:flex-1",
          tableContainerClassName,
        )}
        style={fullscreen ? undefined : { maxHeight: maxBodyHeight }}
      >
        <table
          data-slot="line-items-grid"
          // Deliberately not role="grid": cells are not roving-focusable, and
          // with an editor in every editable cell the native tab order already
          // walks the grid. Claiming grid semantics we do not implement would
          // mislead a screen reader.
          aria-rowcount={lines.length}
          aria-colcount={columnCount}
          className={cn("astw:w-full astw:border-separate astw:border-spacing-0")}
          style={{ tableLayout: "fixed", minWidth: layout.minTableWidth }}
          onKeyDown={handleGridKeyDown}
          onCopy={handleCopy}
          onPaste={handlePaste}
        >
          <colgroup>
            {showSelection ? <col style={{ width: SELECTION_COLUMN_WIDTH }} /> : null}
            {canReorder ? <col style={{ width: GRIP_COLUMN_WIDTH }} /> : null}
            {layout.columns.map((c) => (
              <col
                key={c.id}
                ref={(el) => {
                  colRefs.current.set(c.id, el);
                  // Seed the resting width once; the tween owns it from here.
                  if (el && c.field.hoverExpandWidth && !el.style.width) {
                    el.style.width = `${c.width ?? 0}px`;
                  }
                }}
                style={c.field.hoverExpandWidth ? undefined : colWidthStyle(c)}
              />
            ))}
            {rowActions ? <col style={{ width: rowActionsWidth }} /> : null}
            {layout.needsSpacer ? <col key={SPACER_COLUMN_ID} /> : null}
          </colgroup>

          <thead className="astw:sticky astw:top-0 astw:z-10">
            <tr>
              {showSelection ? (
                <th
                  ref={(el) => void headRefs.current.set(SELECTION_COLUMN_ID, el)}
                  scope="col"
                  className={cn(headCellClasses, "astw:px-0", pinClasses(layout.selection))}
                  style={pinStyle(layout.selection)}
                >
                  <span className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
                    <Checkbox
                      aria-label="Select all lines"
                      checked={allVisibleSelected}
                      indeterminate={selectedIds.length > 0 && !allVisibleSelected}
                      onCheckedChange={() =>
                        allVisibleSelected
                          ? lineItems.clearSelection()
                          : lineItems.selectAllVisible()
                      }
                    />
                  </span>
                </th>
              ) : null}

              {canReorder ? (
                <th
                  ref={(el) => void headRefs.current.set(GRIP_COLUMN_ID, el)}
                  scope="col"
                  className={cn(headCellClasses, "astw:px-0", pinClasses(layout.grip))}
                  style={pinStyle(layout.grip)}
                >
                  <span className="astw:sr-only">Reorder</span>
                </th>
              ) : null}

              {layout.columns.map((c) => {
                const sortable = Boolean(c.field.sort) && ordering === "sort";
                const sorted = sortState?.columnId === c.id ? sortState.direction : undefined;
                const SortIcon = sorted ? sortIcons[sorted] : ChevronsUpDown;
                const sortedState = sorted ? ariaSortValues[sorted] : "none";

                return (
                  <th
                    key={c.id}
                    ref={(el) => void headRefs.current.set(c.id, el)}
                    scope="col"
                    aria-sort={sortable ? sortedState : undefined}
                    onPointerEnter={c.field.hoverExpandWidth ? () => enterColumn(c) : undefined}
                    onPointerLeave={c.field.hoverExpandWidth ? () => leaveColumn(c) : undefined}
                    className={cn(headCellClasses, alignClasses[c.align], pinClasses(c.placement))}
                    style={pinStyle(c.placement)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => lineItems.toggleSort(c.id)}
                        className="astw:inline-flex astw:max-w-full astw:cursor-pointer astw:items-center astw:gap-1 astw:font-medium astw:outline-none astw:hover:text-foreground astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50"
                      >
                        <span className="astw:min-w-0 astw:truncate">{c.field.label}</span>
                        <SortIcon
                          className={cn("astw:size-3.5", !sorted && "astw:opacity-40")}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      c.field.label
                    )}
                  </th>
                );
              })}

              {rowActions ? (
                <th
                  ref={(el) => void headRefs.current.set(ACTIONS_COLUMN_ID, el)}
                  scope="col"
                  className={cn(headCellClasses, "astw:px-0", pinClasses(layout.actions))}
                  style={pinStyle(layout.actions)}
                >
                  <span className="astw:sr-only">Actions</span>
                </th>
              ) : null}

              {layout.needsSpacer ? (
                <th
                  ref={(el) => void headRefs.current.set(SPACER_COLUMN_ID, el)}
                  className={headCellClasses}
                />
              ) : null}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: skeletonRowCount }, (_, i) => (
                  <LineItemsSkeletonRow
                    key={i}
                    rowIndex={i}
                    columnCount={columnCount + (layout.needsSpacer ? 1 : 0)}
                    rowHeight={rowHeight}
                  />
                ))
              : null}

            {!loading && lines.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount + (layout.needsSpacer ? 1 : 0)}
                  className="astw:px-6 astw:py-10 astw:text-center astw:text-sm astw:text-muted-foreground"
                >
                  {emptyMessage ?? "No lines yet."}
                </td>
              </tr>
            ) : null}

            {!loading && virtualWindow.paddingTop > 0 ? (
              <tr aria-hidden="true" style={{ height: virtualWindow.paddingTop }} />
            ) : null}

            {!loading &&
              visibleLines.map((row, i) => {
                const rowIndex = virtualWindow.startIndex + i;
                const isDragging = dragRef === row.lineRef;
                const isLifted = liftedRef === row.lineRef;
                const rowSelected = selectedIds.includes(row.lineRef);
                // Drawn per cell rather than on the row, so it crosses the
                // opaque pinned columns too. Listed last in each `cn` so it
                // wins over a cell's selection ring while a drag is in flight.
                const dropLine =
                  dropBefore === row.lineRef
                    ? "astw:shadow-[inset_0_2px_0_0_var(--color-primary)]"
                    : undefined;

                return (
                  <tr
                    key={row.lineRef}
                    data-slot="line-items-row"
                    data-state={rowSelected ? "selected" : undefined}
                    aria-rowindex={rowIndex + 1}
                    style={{ height: rowHeight }}
                    className={cn(
                      "astw:transition-colors astw:hover:bg-muted/50",
                      rowSelected && "astw:bg-muted",
                      isDragging && "astw:opacity-50",
                      isLifted && "astw:ring-1 astw:ring-ring astw:ring-inset",
                    )}
                    onDragOver={
                      canReorder
                        ? (e) => {
                            if (!dragRef) return;
                            e.preventDefault();
                            setDropBefore(row.lineRef);
                          }
                        : undefined
                    }
                    onDrop={
                      canReorder
                        ? (e) => {
                            if (!dragRef) return;
                            e.preventDefault();
                            moveLine(dragRef, row.lineRef);
                            endDrag();
                          }
                        : undefined
                    }
                  >
                    {showSelection ? (
                      <td
                        className={cn(
                          bodyCellClasses,
                          "astw:px-0",
                          pinClasses(layout.selection, { selected: rowSelected }),
                          dropLine,
                        )}
                        style={pinStyle(layout.selection)}
                      >
                        <span className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
                          <Checkbox
                            aria-label={`Select line ${rowIndex + 1}`}
                            checked={rowSelected}
                            onCheckedChange={() => lineItems.toggleSelect(row.lineRef)}
                          />
                        </span>
                      </td>
                    ) : null}

                    {canReorder ? (
                      <td
                        className={cn(
                          bodyCellClasses,
                          "astw:px-0",
                          pinClasses(layout.grip, { selected: rowSelected }),
                          dropLine,
                        )}
                        style={pinStyle(layout.grip)}
                      >
                        <span className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
                          <button
                            type="button"
                            draggable
                            aria-label={`Drag to reorder line ${rowIndex + 1}`}
                            aria-pressed={isLifted}
                            className="astw:flex astw:size-6 astw:cursor-grab astw:items-center astw:justify-center astw:rounded astw:text-muted-foreground astw:hover:text-foreground astw:focus-visible:ring-[3px] astw:focus-visible:ring-ring/50 astw:focus-visible:outline-none"
                            onDragStart={(e) => {
                              setDragRef(row.lineRef);
                              e.dataTransfer.effectAllowed = "move";
                              // Firefox refuses to start a drag with no payload.
                              e.dataTransfer.setData("text/plain", row.lineRef);
                            }}
                            onDragEnd={endDrag}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setLiftedRef((p) => (p === row.lineRef ? null : row.lineRef));
                                return;
                              }
                              if (e.key === "Escape") {
                                setLiftedRef(null);
                                return;
                              }
                              if (!isLifted) return;
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                nudge(row.lineRef, -1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                nudge(row.lineRef, 1);
                              }
                            }}
                          >
                            <GripVertical className="astw:size-4" aria-hidden="true" />
                          </button>
                        </span>
                      </td>
                    ) : null}

                    {layout.columns.map((c) => {
                      const coord = { lineRef: row.lineRef, columnId: c.id };
                      const editable = fieldIsEditableInMode(c.field, mode);
                      const isActive =
                        grid.active?.lineRef === row.lineRef && grid.active?.columnId === c.id;
                      const isSelected = grid.isSelected(row.lineRef, c.id);
                      const inFill = isInFillPreview(coord);
                      const amendLocked = fieldIsAmendLocked(c.field, mode);
                      const extra =
                        typeof c.field.className === "function"
                          ? c.field.className(row)
                          : c.field.className;

                      return (
                        <td
                          key={c.id}
                          data-slot="line-items-grid-cell"
                          data-line-ref={row.lineRef}
                          data-column-id={c.id}
                          className={cn(
                            bodyCellClasses,
                            alignClasses[c.align],
                            pinClasses(c.placement, { selected: rowSelected }),
                            editable && "astw:cursor-text",
                            // Layered lowest so a selection or fill preview reads over it.
                            amendLocked && "astw:bg-muted/40",
                            isSelected && !isActive && "astw:bg-primary/10",
                            inFill && "astw:bg-primary/15",
                            // An inset ring paints on the cell bounds exactly, where a
                            // border would shift the grid by a pixel.
                            isSelected &&
                              !isActive &&
                              "astw:shadow-[inset_0_0_0_1px_var(--color-ring)]",
                            (isActive || inFill) &&
                              "astw:shadow-[inset_0_0_0_2px_var(--color-primary)]",
                            extra,
                            dropLine,
                          )}
                          style={pinStyle(c.placement)}
                          onPointerEnter={() => {
                            if (c.field.hoverExpandWidth) enterColumn(c);
                            // A fill in progress tracks the row under the pointer.
                            // The window-level handler covers fast drags that
                            // outrun per-cell events; this covers the rest.
                            if (fillSource) setFillHoverLineRef(row.lineRef);
                            else grid.extendSelection(coord);
                          }}
                          onPointerLeave={
                            c.field.hoverExpandWidth ? () => leaveColumn(c) : undefined
                          }
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            const target = e.target as HTMLElement;
                            const interactive = Boolean(
                              target.closest(
                                "input, select, button, textarea, [role=combobox], [data-slot=line-items-fill-grip]",
                              ),
                            );
                            if (e.shiftKey) {
                              e.preventDefault();
                              grid.beginSelection(coord, { shift: true });
                              return;
                            }
                            // Clicking into an editor must place a caret, so only a
                            // press on inert cell chrome starts a range drag.
                            if (interactive) grid.setActive(coord);
                            else grid.beginSelection(coord);
                          }}
                          onPointerUp={grid.endSelection}
                        >
                          <LineItemsCell
                            row={row}
                            field={c.field}
                            mode={mode}
                            align={c.align}
                            editable={editable}
                            showFillGrip={isActive && fieldAllowsFill(c.field, mode)}
                            onCommit={(value) => commitCell(coord, value)}
                            onFocusCell={() => grid.setActive(coord)}
                            onNavigate={(to) => navigateFromEdit(to, coord)}
                            onArrowFromEditor={(key, shift) => moveActive(key, shift)}
                            onFillGripPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFillSource(coord);
                              setFillHoverLineRef(row.lineRef);
                            }}
                          />
                        </td>
                      );
                    })}

                    {rowActions ? (
                      <td
                        className={cn(
                          bodyCellClasses,
                          "astw:px-0",
                          pinClasses(layout.actions, { selected: rowSelected }),
                          dropLine,
                        )}
                        style={pinStyle(layout.actions)}
                      >
                        <span className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
                          {rowActions(row)}
                        </span>
                      </td>
                    ) : null}

                    {layout.needsSpacer ? <td className={cn(bodyCellClasses, dropLine)} /> : null}
                  </tr>
                );
              })}

            {!loading && virtualWindow.paddingBottom > 0 ? (
              <tr aria-hidden="true" style={{ height: virtualWindow.paddingBottom }} />
            ) : null}
          </tbody>

          {totalsRenderer || totalsRow ? (
            <tfoot
              data-slot="line-items-totals"
              className="astw:sticky astw:bottom-0 astw:z-10 astw:bg-card astw:font-medium"
            >
              {totalsRow ? (
                totalsRow(lines)
              ) : (
                <tr style={{ height: rowHeight }}>
                  {showSelection ? (
                    <td
                      className={cn(bodyCellClasses, "astw:px-0", pinClasses(layout.selection))}
                      style={pinStyle(layout.selection)}
                    />
                  ) : null}
                  {canReorder ? (
                    <td
                      className={cn(bodyCellClasses, "astw:px-0", pinClasses(layout.grip))}
                      style={pinStyle(layout.grip)}
                    />
                  ) : null}
                  {layout.columns.map((c) => (
                    <td
                      key={c.id}
                      className={cn(
                        bodyCellClasses,
                        "astw:px-2 astw:bg-card",
                        alignClasses[c.align],
                        pinClasses(c.placement),
                      )}
                      style={pinStyle(c.placement)}
                    >
                      {totalsRenderer?.(lines as LineItemsRowData[])[c.id] ?? null}
                    </td>
                  ))}
                  {rowActions ? (
                    <td
                      className={cn(bodyCellClasses, "astw:px-0", pinClasses(layout.actions))}
                      style={pinStyle(layout.actions)}
                    />
                  ) : null}
                  {layout.needsSpacer ? (
                    <td className={cn(bodyCellClasses, "astw:bg-card")} />
                  ) : null}
                </tr>
              )}
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

LineItemsTable.displayName = "LineItems.Table";
