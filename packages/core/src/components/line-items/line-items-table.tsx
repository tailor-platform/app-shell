/* eslint-disable jsx-a11y/no-static-element-interactions */
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Table } from "@/components/table";

import { fieldAllowsPaste } from "./field";
import { LineItemsFieldCell } from "./line-items-default-cell";
import {
  LineItemsGridProvider,
  type LineItemsGridContextValue,
  type SpreadsheetFillPreview,
} from "./line-items-grid-context";
import { LineItemsFullscreenToggle } from "./line-items-parts";
import { useLineItemsRoot } from "./line-items-root";
import { getInternals } from "./use-line-items";
import {
  coordsToRowsMatrix,
  moveSelectionCoord,
  parseClipboardTsv,
  rectangularCells,
  sameCoord,
  serializeMatrixTsv,
  type GridCoord,
} from "./spreadsheet-logic";
import type { LineItemsColumnAlign, LineItemsField, LineItemsRowData } from "./types";

const alignClass: Record<LineItemsColumnAlign, string> = {
  left: "astw:text-left",
  center: "astw:text-center",
  right: "astw:text-right astw:tabular-nums",
};

export type LineItemsTableProps<T extends LineItemsRowData = LineItemsRowData> = {
  /** Max body height before vertical scroll kicks in. Defaults to `min(60vh, 480px)`. */
  maxBodyHeight?: React.CSSProperties["maxHeight"];
  className?: string;
  tableContainerClassName?: string;
  /** Render the built-in expand button in the table's top-right. Default `true`. */
  renderFullscreenToggle?: boolean;
  /** Enable manual drag-to-reorder rows (only when the hook's `ordering` is `"manual"`). */
  enableDragReorder?: boolean;
  /** Empty-state copy when there are no rows. */
  emptyMessage?: React.ReactNode;
  /**
   * Optional render-prop for a trailing per-row actions column (delete, view,
   * attach, etc.). The cell is automatically pinned to the right edge so the
   * actions stay visible during horizontal scroll. The actions cell is NOT
   * part of the spreadsheet selection grid (no fill, no copy/paste).
   */
  rowActions?: (line: T) => React.ReactNode;
  /** Width in px of the row-actions trailing column. Default `80`. */
  rowActionsWidth?: number;
};

export function LineItemsTable<T extends LineItemsRowData>(props: LineItemsTableProps<T>) {
  const {
    maxBodyHeight = "min(60vh, 480px)",
    className,
    tableContainerClassName,
    renderFullscreenToggle = true,
    enableDragReorder = false,
    emptyMessage = "No lines yet.",
    rowActions,
    /**
     * Default 64 — fits two `size-7` icon buttons + a small horizontal gap
     * snugly. Bump for more icons or wider buttons; lower for one icon.
     */
    rowActionsWidth = 64,
  } = props;

  const root = useLineItemsRoot<T>();
  const { hook, fullscreen, totalsRowFn } = root;
  const { fields, mode, ordering } = hook;

  const internals = getInternals(hook);
  if (!internals) {
    throw new Error(
      "<LineItems.Table> could not read internal hook state. Make sure `value` was produced by `useLineItems()`.",
    );
  }

  // `useLineItems` returns a fresh object every render, so we keep a ref to the
  // current value. Cells / column renderers / event handlers read the latest
  // hook via `hookRef.current` instead of capturing it in deps — otherwise the
  // tanstack column array would be rebuilt on every keystroke and re-mount
  // every input, dropping focus after a single character.
  const hookRef = React.useRef(hook);
  hookRef.current = hook;
  const selectionEnabled = hook.selectionEnabled;

  /* ---- Cell-selection state ------------------------------------------- */

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [hoveredColumnId, setHoveredColumnId] = React.useState<string | null>(null);
  const [ssAnchor, setSsAnchor] = React.useState<GridCoord | null>(null);
  const [ssFocus, setSsFocus] = React.useState<GridCoord | null>(null);
  const [ssPointerDragActive, setSsPointerDragActive] = React.useState(false);
  const [fillGestureSource, setFillGestureSource] = React.useState<GridCoord | null>(null);
  const [fillHoverLineRef, setFillHoverLineRef] = React.useState<string | null>(null);

  const scrollParentRef = React.useRef<HTMLDivElement>(null);
  const rowElRefs = React.useRef(new Map<string, HTMLTableRowElement | null>());

  /* ---- Schema ids + Tanstack column defs ------------------------------ */

  const schemaColumnIds = React.useMemo(() => fields.map((f) => f.key), [fields]);
  const fieldByKey = React.useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  /** Filtered visible rows from the hook (after search). */
  const data = hook.lines;

  const tanCols = React.useMemo((): ColumnDef<T>[] => {
    const cols: ColumnDef<T>[] = [];

    if (selectionEnabled && mode !== "display") {
      cols.push({
        id: "__select",
        header: () => {
          const live = hookRef.current;
          const allSelected =
            live.lines.length > 0 && live.selectedIds.length === live.lines.length;
          return (
            <div className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allSelected}
              onChange={(e) => {
                if (e.target.checked) hookRef.current.selectAllVisible();
                else hookRef.current.clearSelection();
              }}
              className="astw:size-4"
            />
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
            <input
              type="checkbox"
              aria-label="Select row"
              checked={hookRef.current.selectedIds.includes(row.original.lineRef)}
              onChange={() => hookRef.current.toggleSelect(row.original.lineRef)}
              className="astw:size-4"
            />
          </div>
        ),
        size: 36,
      });
    }

    if (enableDragReorder && ordering === "manual" && mode !== "display") {
      cols.push({
        id: "__drag",
        header: "",
        cell: ({ row }) => (
          <div className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-center">
            <span
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/line-ref", row.original.lineRef);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="astw:inline-flex astw:cursor-grab astw:text-muted-foreground"
              aria-label="Drag to reorder"
            >
              <GripVerticalIcon className="astw:size-4" />
            </span>
          </div>
        ),
        size: 28,
      });
    }

    for (const field of fields) {
      const f = field as LineItemsField<T>;
      cols.push({
        id: f.key,
        accessorKey: f.key as string,
        header: ({ column }) => (
          <button
            type="button"
            className={cn(
              "astw:inline-flex astw:items-center astw:gap-1 astw:bg-transparent astw:p-0 astw:font-medium",
              column.getCanSort() && "astw:cursor-pointer",
              alignClass[f.align ?? "left"],
            )}
            onClick={column.getToggleSortingHandler()}
            disabled={!column.getCanSort()}
          >
            {f.label}
            {column.getIsSorted() === "asc" ? (
              <ArrowUpIcon className="astw:size-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDownIcon className="astw:size-3" />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <LineItemsFieldCell field={f} lineRef={row.original.lineRef} row={row.original} />
        ),
        enableSorting: ordering === "sort" && !!f.sort,
        sortingFn:
          ordering !== "sort" || !f.sort
            ? "alphanumeric"
            : (a, b) => f.sort!.comparator(a.original as T, b.original as T),
      });
    }

    if (rowActions) {
      cols.push({
        id: "__actions",
        header: "",
        cell: ({ row }) => (
          <div className="astw:flex astw:h-full astw:w-full astw:items-center astw:justify-end astw:gap-1 astw:px-2">
            {rowActions(row.original)}
          </div>
        ),
        size: rowActionsWidth,
      });
    }

    return cols;
  }, [enableDragReorder, fields, mode, ordering, selectionEnabled, rowActions, rowActionsWidth]);

  const table = useReactTable({
    data,
    columns: tanCols,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    ...(ordering === "sort" ? { getSortedRowModel: getSortedRowModel() } : {}),
    getRowId: (row) => row.lineRef,
  });

  const allRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  const orderedLineRefs = React.useMemo(() => allRows.map((r) => r.original.lineRef), [allRows]);

  const onColumnHoverEnter = React.useCallback(
    (colId: string) => {
      const f = fieldByKey.get(colId);
      if (f?.hoverExpandWidth != null) setHoveredColumnId(colId);
    },
    [fieldByKey],
  );

  const onColumnHoverLeave = React.useCallback((colId: string) => {
    setHoveredColumnId((cur) => (cur === colId ? null : cur));
  }, []);

  /* ---- Special-column widths --------------------------------------------
     Pinned widths for the bookkeeping columns we add ourselves
     (__select / __drag / __actions). Combined with `table-fixed` and the
     `<colgroup>` rendering below, every consumer of the component gets the
     identical first-column look — without these, browser auto-layout
     redistributed leftover horizontal space per page so the same `width: 40`
     rendered at slightly different sizes across demos. */
  const SELECT_COL_WIDTH = 40;
  const DRAG_COL_WIDTH = 28;

  /* ---- Pinned columns (left + right offsets) -------------------------- */

  /**
   * Compute the pixel offset for each pinned column. Order:
   *   - Left side: __select (if visible, 36px) → __drag (28px) →
   *     fields with `pinned: "left"` in declared order.
   *   - Right side: fields with `pinned: "right"` in declared order, with the
   *     inserted "__actions" column (when `rowActions` is set) pinned right
   *     after them.
   *
   * Pinned data fields require a `width` so we know the offset of the next
   * pinned column. Unpinned fields are unaffected.
   */
  const pinOffsets = React.useMemo(() => {
    const offsets = new Map<string, { side: "left" | "right"; offset: number }>();
    const selectVisible = selectionEnabled && mode !== "display";
    const dragVisible = enableDragReorder && ordering === "manual" && mode !== "display";

    let leftAcc = 0;
    if (selectVisible) {
      offsets.set("__select", { side: "left", offset: leftAcc });
      leftAcc += SELECT_COL_WIDTH;
    }
    if (dragVisible) {
      offsets.set("__drag", { side: "left", offset: leftAcc });
      leftAcc += DRAG_COL_WIDTH;
    }
    for (const f of fields) {
      if (f.pinned === "left") {
        offsets.set(f.key, { side: "left", offset: leftAcc });
        leftAcc += f.width ?? 0;
      }
    }

    let rightAcc = 0;
    // Walk right-to-left so the rightmost pinned column has offset 0.
    if (rowActions) {
      offsets.set("__actions", { side: "right", offset: rightAcc });
      rightAcc += rowActionsWidth;
    }
    const rightFields = fields.filter((f) => f.pinned === "right").toReversed();
    for (const f of rightFields) {
      offsets.set(f.key, { side: "right", offset: rightAcc });
      rightAcc += f.width ?? 0;
    }
    return offsets;
  }, [enableDragReorder, fields, mode, ordering, rowActions, rowActionsWidth, selectionEnabled]);

  const getPinStyle = React.useCallback(
    (colId: string): React.CSSProperties | undefined => {
      const pin = pinOffsets.get(colId);
      if (!pin) return undefined;
      return {
        position: "sticky",
        [pin.side]: pin.offset,
        zIndex: 5,
        backgroundColor: "var(--card)",
      } as React.CSSProperties;
    },
    [pinOffsets],
  );

  const ssFocusRef = React.useRef<GridCoord | null>(null);
  React.useEffect(() => {
    ssFocusRef.current = ssFocus;
  }, [ssFocus]);

  const allRowsRef = React.useRef<typeof allRows>(allRows);
  allRowsRef.current = allRows;

  /* ---- Selection rectangle + fill preview ----------------------------- */

  const selectionCoordsMemo = React.useMemo(() => {
    if (!ssAnchor || !ssFocus) return [] as GridCoord[];
    return rectangularCells(orderedLineRefs, schemaColumnIds, ssAnchor, ssFocus);
  }, [ssAnchor, ssFocus, orderedLineRefs, schemaColumnIds]);

  const fillPreview = React.useMemo<SpreadsheetFillPreview | null>(() => {
    if (!fillGestureSource || !fillHoverLineRef) return null;
    return { from: fillGestureSource, toLineRef: fillHoverLineRef };
  }, [fillGestureSource, fillHoverLineRef]);

  const isInFillPreview = React.useCallback(
    (coord: GridCoord) => {
      if (!fillPreview) return false;
      if (coord.columnId !== fillPreview.from.columnId) return false;
      const ri0 = orderedLineRefs.indexOf(fillPreview.from.lineRef);
      const ri1 = orderedLineRefs.indexOf(fillPreview.toLineRef);
      const ri = orderedLineRefs.indexOf(coord.lineRef);
      if (ri0 < 0 || ri1 < 0 || ri < 0) return false;
      return ri >= Math.min(ri0, ri1) && ri <= Math.max(ri0, ri1);
    },
    [fillPreview, orderedLineRefs],
  );

  const isPrimaryCell = React.useCallback(
    (coord: GridCoord) => sameCoord(coord, ssFocus),
    [ssFocus],
  );

  const isInSelection = React.useCallback(
    (coord: GridCoord) =>
      selectionCoordsMemo.some((c) => c.lineRef === coord.lineRef && c.columnId === coord.columnId),
    [selectionCoordsMemo],
  );

  /* ---- Scroll active cell into view (only when focus *changes*) ------- */

  const prevSsFocusRef = React.useRef<GridCoord | null>(null);
  React.useEffect(() => {
    if (!ssFocus) {
      prevSsFocusRef.current = ssFocus;
      return undefined;
    }
    const prev = prevSsFocusRef.current;
    if (prev && sameCoord(prev, ssFocus)) return undefined;
    prevSsFocusRef.current = ssFocus;
    const idx = allRowsRef.current.findIndex((r) => r.original.lineRef === ssFocus.lineRef);
    if (idx >= 0) {
      rowVirtualizer.scrollToIndex(idx, { align: "auto" });
      queueMicrotask(() =>
        rowElRefs.current.get(ssFocus.lineRef)?.scrollIntoView?.({ block: "nearest" }),
      );
    }
    return undefined;
  }, [ssFocus, rowVirtualizer]);

  /* ---- Pointer drag (drag-select) ------------------------------------- */

  React.useEffect(() => {
    if (!ssPointerDragActive) return undefined;
    const onMove = (e: PointerEvent) => {
      const cell = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest('[data-slot="line-items-grid-cell"]');
      const lr = cell?.getAttribute("data-line-ref");
      const cid = cell?.getAttribute("data-column-id");
      if (lr && cid) setSsFocus({ lineRef: lr, columnId: cid });
    };
    const onUp = () => setSsPointerDragActive(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ssPointerDragActive]);

  /* ---- Fill drag gesture ---------------------------------------------- */

  const fillHoverSyncRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    fillHoverSyncRef.current = fillHoverLineRef;
  }, [fillHoverLineRef]);

  const fillGestureRef = React.useRef<GridCoord | null>(null);
  React.useEffect(() => {
    fillGestureRef.current = fillGestureSource;
  }, [fillGestureSource]);

  React.useEffect(() => {
    if (!fillGestureSource) return undefined;
    const source = fillGestureSource;
    fillHoverSyncRef.current = source.lineRef;

    const onMove = (e: PointerEvent) => {
      const tr = document.elementFromPoint(e.clientX, e.clientY)?.closest("tr[data-line-ref]");
      const lr = tr?.getAttribute("data-line-ref");
      if (lr) {
        fillHoverSyncRef.current = lr;
        setFillHoverLineRef(lr);
      }
    };
    const finish = () => {
      const gesture = fillGestureRef.current;
      const endLine = fillHoverSyncRef.current ?? source.lineRef;
      setFillGestureSource(null);
      setFillHoverLineRef(null);
      if (!gesture) return;
      const field = fieldByKey.get(gesture.columnId);
      if (!field) return;
      const accessor = field.key as keyof T;
      const srcRow = hook.allLines.find((r) => r.lineRef === gesture.lineRef);
      if (!srcRow) return;
      const v = srcRow[accessor];
      const ri0 = orderedLineRefs.indexOf(gesture.lineRef);
      const ri1 = orderedLineRefs.indexOf(endLine);
      if (ri0 < 0 || ri1 < 0) return;
      const updates: { lineRef: string; patch: Partial<T> }[] = [];
      for (let i = Math.min(ri0, ri1); i <= Math.max(ri0, ri1); i++) {
        const lineRef = orderedLineRefs[i];
        if (!lineRef) continue;
        updates.push({ lineRef, patch: { [accessor]: v } as Partial<T> });
      }
      if (updates.length) hook.updateLines(updates);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [fillGestureSource, fieldByKey, hook, orderedLineRefs]);

  /* ---- Focus a cell input by coord (queueMicrotask to allow re-render) - */

  const focusSsInput = React.useCallback((coord: GridCoord | null) => {
    if (!coord) return;
    queueMicrotask(() => {
      const scrollEl = scrollParentRef.current;
      const escapeSelector =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape
          : (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const sel = `[data-slot="line-items-grid-cell"][data-line-ref="${escapeSelector(coord.lineRef)}"][data-column-id="${escapeSelector(coord.columnId)}"] input`;
      (scrollEl?.querySelector(sel) as HTMLElement | null)?.focus();
    });
  }, []);

  /* ---- Keyboard nav (from input or grid root) ------------------------- */

  const navigateFromEdit = React.useCallback(
    (kind: "tab" | "shift-tab" | "enter-down") => {
      const cur = ssFocusRef.current;
      if (!cur) {
        queueMicrotask(() => scrollParentRef.current?.focus());
        return;
      }
      let next: GridCoord | null = null;
      if (kind === "enter-down") {
        next = moveSelectionCoord("ArrowDown", cur, orderedLineRefs, schemaColumnIds) ?? cur;
      } else if (kind === "tab") {
        const r = moveSelectionCoord("ArrowRight", cur, orderedLineRefs, schemaColumnIds);
        if (r && !sameCoord(r, cur)) next = r;
        else {
          const down = moveSelectionCoord("ArrowDown", cur, orderedLineRefs, schemaColumnIds);
          const firstCol = schemaColumnIds[0];
          next = down && firstCol ? { lineRef: down.lineRef, columnId: firstCol } : cur;
        }
      } else if (kind === "shift-tab") {
        const l = moveSelectionCoord("ArrowLeft", cur, orderedLineRefs, schemaColumnIds);
        if (l && !sameCoord(l, cur)) next = l;
        else {
          const up = moveSelectionCoord("ArrowUp", cur, orderedLineRefs, schemaColumnIds);
          const lastCol = schemaColumnIds[schemaColumnIds.length - 1];
          next = up && lastCol ? { lineRef: up.lineRef, columnId: lastCol } : cur;
        }
      }
      if (next && !sameCoord(next, cur)) {
        setSsAnchor(next);
        setSsFocus(next);
        queueMicrotask(() => focusSsInput(next));
      }
    },
    [focusSsInput, orderedLineRefs, schemaColumnIds],
  );

  const navigateArrowFromInput = React.useCallback(
    (arrowKey: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shiftExtend: boolean) => {
      const cur = ssFocusRef.current;
      if (!cur || !schemaColumnIds.length) return;
      const next = moveSelectionCoord(arrowKey, cur, orderedLineRefs, schemaColumnIds);
      if (!next || sameCoord(next, cur)) return;
      if (shiftExtend) setSsAnchor((a) => a ?? cur);
      else setSsAnchor(next);
      setSsFocus(next);
      queueMicrotask(() => focusSsInput(next));
    },
    [focusSsInput, orderedLineRefs, schemaColumnIds],
  );

  const onCellPointerDown = React.useCallback(
    (coord: GridCoord, e: React.PointerEvent) => {
      if (mode === "display") return;
      if (fillGestureSource) return;
      if (e.button !== 0) return;

      // Shift-click: extend the existing rectangle to the clicked cell.
      // Anchor stays where it was (collapses to current focus on first shift).
      if (e.shiftKey) {
        // Stop the browser from extending its native text selection across
        // any editable inputs that happen to sit between the previous focus
        // anchor and this click — otherwise the OS highlight paints a
        // black/white run through cells the user didn't actually select.
        e.preventDefault();
        if (typeof document !== "undefined") {
          const ae = document.activeElement as HTMLElement | null;
          // Blur any currently-focused editor first; without this the browser
          // re-extends its selection from inside that input even after we
          // clear ranges.
          if (
            ae &&
            ae !== document.body &&
            ae.matches?.("input,textarea,select,[contenteditable=true]")
          ) {
            ae.blur();
          }
        }
        if (typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
        setSsAnchor((a) => a ?? ssFocusRef.current ?? coord);
        setSsFocus(coord);
        scrollParentRef.current?.focus();
        return;
      }

      // Normal click: collapse the selection to a single cell. We do this
      // unconditionally — even when the click lands on an <input> inside the
      // cell — because `onCellFocused` no longer resets the anchor after a
      // shift-click (that fix lives in onCellFocused), so we need to do the
      // collapse here.
      setSsAnchor(coord);
      setSsFocus(coord);

      // Activate drag-select only when the click started on the cell shell
      // itself (not inside an input/button) — otherwise we'd fight the input's
      // native text-selection drag.
      const tgt = e.target as HTMLElement | null;
      const insideInteractive = !!tgt?.closest?.(
        "input,textarea,button,select,[contenteditable=true]",
      );
      if (!insideInteractive) {
        setSsPointerDragActive(true);
        scrollParentRef.current?.focus();
      }
    },
    [fillGestureSource, mode],
  );

  const onCellFocused = React.useCallback(
    (coord: GridCoord) => {
      if (mode === "display") return;
      const cur = ssFocusRef.current;
      if (cur && sameCoord(cur, coord)) return;
      // Only update FOCUS here; the anchor is owned by `onCellPointerDown`
      // (which preserves it on shift-click) and the keyboard nav handlers
      // (which set both anchor + focus together). Overwriting the anchor on
      // every focus event would collapse a shift-click range as soon as the
      // newly-focused input fired its native focus event.
      setSsFocus(coord);
      // Initialize anchor if it was previously null (e.g. first focus on the
      // table without going through pointerdown).
      setSsAnchor((a) => a ?? coord);
    },
    [mode],
  );

  const onFillGripPointerDown = React.useCallback(
    (coord: GridCoord, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const field = fieldByKey.get(coord.columnId);
      if (!field) return;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setFillGestureSource(coord);
      setFillHoverLineRef(coord.lineRef);
    },
    [fieldByKey],
  );

  /* ---- Grid root keyboard / clipboard --------------------------------- */

  const onGridKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (mode === "display") return;
      const scrollEl = scrollParentRef.current;
      const ae = document.activeElement;
      if (!scrollEl || !ae || !scrollEl.contains(ae)) return;
      if (ae !== scrollEl && ae.matches("input,textarea,button,select,[contenteditable=true]"))
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        const cur = ssFocusRef.current;
        if (!cur || !schemaColumnIds.length) return;
        e.preventDefault();
        const next = moveSelectionCoord(e.key, cur, orderedLineRefs, schemaColumnIds);
        if (!next || sameCoord(next, cur)) return;
        if (e.shiftKey) setSsAnchor((a) => a ?? cur);
        else setSsAnchor(next);
        setSsFocus(next);
        queueMicrotask(() => focusSsInput(next));
      }
    },
    [focusSsInput, mode, orderedLineRefs, schemaColumnIds],
  );

  const onGridCopy = React.useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae.matches?.("input,textarea,select,[contenteditable=true]")) {
        const inGridCell = ae.closest?.("[data-slot='line-items-grid-cell']");
        if (!inGridCell) return;
      }
      const coords = selectionCoordsMemo;
      if (!coords.length) return;
      e.preventDefault();
      const clip = coordsToRowsMatrix(orderedLineRefs, schemaColumnIds, coords, (lr, cid) => {
        const f = fieldByKey.get(cid);
        const accessor = (f?.key ?? cid) as keyof T;
        const rowData = hook.allLines.find((r) => r.lineRef === lr);
        return rowData ? String(rowData[accessor] ?? "") : "";
      });
      e.clipboardData.setData("text/plain", serializeMatrixTsv(clip));
    },
    [selectionCoordsMemo, orderedLineRefs, schemaColumnIds, fieldByKey, hook.allLines],
  );

  const onGridPaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (mode === "display" || !ssFocus) return;
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae && ae.matches?.("input,textarea,select,[contenteditable=true]")) {
        const inGridCell = ae.closest?.("[data-slot='line-items-grid-cell']");
        if (!inGridCell) return;
      }
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain") ?? "";
      const gridParsed = parseClipboardTsv(text);
      if (!gridParsed.length || !orderedLineRefs.length) return;

      const startRi = orderedLineRefs.indexOf(ssFocus.lineRef);
      const startCi = schemaColumnIds.indexOf(ssFocus.columnId);
      if (startRi < 0 || startCi < 0) return;

      let skipped = 0;
      const existing = new Map<string, Partial<T>>();

      // Single-source broadcast: when the clipboard holds exactly one cell and
      // the active selection covers more than one cell, fan the single value
      // out to every selected cell (Excel / Sheets behaviour).
      const isSingleSource =
        gridParsed.length === 1 && (gridParsed[0]?.length ?? 0) === 1;
      if (isSingleSource && selectionCoordsMemo.length > 1) {
        const raw = gridParsed[0]![0]!;
        for (const { lineRef, columnId } of selectionCoordsMemo) {
          const field = fieldByKey.get(columnId);
          if (!field || !fieldAllowsPaste(field, mode)) {
            skipped++;
            continue;
          }
          const parsed = coerceForField(field, raw);
          const prev = existing.get(lineRef) ?? {};
          (prev as Record<string, unknown>)[field.key] = parsed as never;
          existing.set(lineRef, prev);
        }
      } else {
        for (let r = 0; r < gridParsed.length; r++) {
          const rowLineRef = orderedLineRefs[startRi + r];
          if (!rowLineRef) break;
          const rowObj = hook.allLines.find((row) => row.lineRef === rowLineRef);
          if (!rowObj) continue;
          const line = gridParsed[r]!;
          const rowPatch: Partial<T> = {};
          let rowHas = false;
          for (let c = 0; c < line.length; c++) {
            const colId = schemaColumnIds[startCi + c];
            if (!colId) break;
            const field = fieldByKey.get(colId);
            if (!field || !fieldAllowsPaste(field, mode)) {
              skipped++;
              continue;
            }
            const raw = line[c];
            const parsed = coerceForField(field, raw);
            (rowPatch as Record<string, unknown>)[field.key] = parsed as never;
            rowHas = true;
          }
          if (!rowHas) continue;
          const prev = existing.get(rowLineRef) ?? {};
          existing.set(rowLineRef, { ...prev, ...rowPatch });
        }
      }

      const updates: { lineRef: string; patch: Partial<T> }[] = [];
      for (const [lineRef, patch] of existing.entries()) updates.push({ lineRef, patch });
      if (updates.length) hook.updateLines(updates);
      if (skipped) toast.info("Some cells were skipped (read-only columns).");
    },
    [mode, ssFocus, orderedLineRefs, schemaColumnIds, fieldByKey, hook, selectionCoordsMemo],
  );

  /* ---- Drag-reorder (drop on row / drop on grid background) ----------- */

  const handleDropOnRow = (afterLineRef: string | null, e: React.DragEvent) => {
    e.preventDefault();
    if (!enableDragReorder || ordering !== "manual") return;
    const dragged = e.dataTransfer.getData("text/line-ref");
    if (!dragged || dragged === afterLineRef) return;
    hook.reorderLine(dragged, afterLineRef);
  };

  const lastOrderRef = data.length ? (data[data.length - 1]?.lineRef ?? null) : null;

  /* ---- Grid context (for cells) --------------------------------------- */

  const gridCtx = React.useMemo<LineItemsGridContextValue<T>>(
    () => ({
      hookRef,
      mode,
      schemaColumnIds,
      orderedLineRefs,
      anchor: ssAnchor,
      focus: ssFocus,
      fillPreview,
      onCellPointerDown,
      onCellFocused,
      navigateFromEdit,
      navigateArrowFromInput,
      onFillGripPointerDown,
      isPrimaryCell,
      isInSelection,
      isInFillPreview,
    }),
    // `hookRef` is a stable ref object; intentionally excluded from deps. Excluding
    // the per-render `hook` snapshot here is critical — putting it in deps would
    // bust this memo on every keystroke, fan a new context value through every
    // visible cell, and re-mount cell inputs (which is what was dropping focus
    // after the first character).
    [
      mode,
      schemaColumnIds,
      orderedLineRefs,
      ssAnchor,
      ssFocus,
      fillPreview,
      onCellPointerDown,
      onCellFocused,
      navigateFromEdit,
      navigateArrowFromInput,
      onFillGripPointerDown,
      isPrimaryCell,
      isInSelection,
      isInFillPreview,
    ],
  );

  /* ---- Render --------------------------------------------------------- */

  // `table-fixed` is critical: with `auto` layout the browser distributes any
  // leftover horizontal space across columns based on content, which makes the
  // 40px checkbox column drift to slightly different widths per page (the
  // user reported this). `fixed` honors the explicit per-column widths we set
  // via `<colgroup>` below, plus the inline width styles on every <th>.
  const tableWidthClass = "astw:w-full astw:table-fixed astw:caption-bottom astw:text-sm";

  /*
    Compute a `min-width` for the table so the flex column never collapses at
    narrow viewports. We sum every column's declared width (including the flex
    column's `width` or a `240` fallback). At wide viewports the table is at
    container width (so the flex column absorbs leftover); at narrow viewports
    the table grows beyond the container and horizontal scroll absorbs the
    overflow — instead of squeezing the flex column to nothing.
  */
  const FLEX_FALLBACK_WIDTH = 240;
  const tableMinWidth = React.useMemo(() => {
    let total = 0;
    if (selectionEnabled && mode !== "display") total += SELECT_COL_WIDTH;
    if (enableDragReorder && ordering === "manual" && mode !== "display")
      total += DRAG_COL_WIDTH;
    for (const f of fields) {
      if (f.flex) {
        total += f.width ?? FLEX_FALLBACK_WIDTH;
      } else {
        total += f.width ?? FLEX_FALLBACK_WIDTH;
      }
    }
    if (rowActions) total += rowActionsWidth;
    return total;
  }, [enableDragReorder, fields, mode, ordering, rowActions, rowActionsWidth, selectionEnabled]);
  const vItems = rowVirtualizer.getVirtualItems();
  // True when no field absorbs leftover horizontal space; in that case the
  // table renders a trailing spacer `<col>` + matching cells. Same condition
  // is recomputed in the colgroup IIFE above — keep them in sync.
  const renderTrailingSpacer = !fields.some((f) => f.flex || f.width == null);
  const colCount = Math.max(
    1,
    table.getVisibleLeafColumns().length + (renderTrailingSpacer ? 1 : 0),
  );
  const padTop = vItems.length ? vItems[0]!.start : 0;
  const padBot = vItems.length ? rowVirtualizer.getTotalSize() - vItems[vItems.length - 1]!.end : 0;

  return (
    <div
      className={cn(
        "astw:relative astw:w-full astw:overflow-hidden astw:rounded-md astw:border astw:bg-card",
        // No `shadow-2xl` — when the table is hosted inside a Card the card
        // provides the visible frame, and a second drop shadow on the table
        // body bleeds through to the area below (e.g. the add-product row).
        fullscreen && "astw:flex astw:min-h-0 astw:flex-1 astw:flex-col",
        tableContainerClassName,
        className,
      )}
    >
      {renderFullscreenToggle ? (
        <div className="astw:absolute astw:top-1 astw:right-1 astw:z-20">
          <LineItemsFullscreenToggle />
        </div>
      ) : null}

      <LineItemsGridProvider
        value={gridCtx as unknown as LineItemsGridContextValue<LineItemsRowData>}
      >
        <div
          ref={scrollParentRef}
          data-slot="line-items-scroll"
          aria-colcount={mode !== "display" ? schemaColumnIds.length : undefined}
          aria-rowcount={mode !== "display" ? orderedLineRefs.length : undefined}
          role={mode !== "display" ? "grid" : undefined}
          tabIndex={mode !== "display" ? 0 : undefined}
          aria-multiselectable={mode !== "display" ? true : undefined}
          style={{
            maxHeight: fullscreen ? undefined : maxBodyHeight,
            overflowY: "auto",
            overflowX: "auto",
          }}
          className={cn(
            "astw:relative astw:w-full astw:outline-none",
            // Slim, semi-transparent scrollbars (4px webkit, "thin" firefox).
            "astw:[scrollbar-color:rgba(0,0,0,0.4)_transparent] astw:[scrollbar-width:thin]",
            "astw:[&::-webkit-scrollbar]:h-1 astw:[&::-webkit-scrollbar]:w-1 astw:[&::-webkit-scrollbar]:bg-transparent",
            "astw:[&::-webkit-scrollbar-track]:bg-transparent",
            "astw:[&::-webkit-scrollbar-thumb]:rounded-full astw:[&::-webkit-scrollbar-thumb]:bg-black/40",
            "astw:[&::-webkit-scrollbar-corner]:bg-transparent",
            fullscreen && "astw:min-h-0 astw:flex-1",
          )}
          onKeyDown={mode !== "display" ? onGridKeyDown : undefined}
          onCopy={onGridCopy}
          onPaste={mode !== "display" ? onGridPaste : undefined}
          onDragOver={(e) => {
            if (!enableDragReorder || ordering !== "manual") return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (!enableDragReorder || ordering !== "manual") return;
            if ((e.target as HTMLElement).closest("tr[data-line-ref]")) return;
            handleDropOnRow(lastOrderRef, e);
          }}
        >
          {data.length === 0 ? (
            <div className="astw:text-muted-foreground astw:px-3 astw:py-6 astw:text-center astw:text-sm">
              {emptyMessage}
            </div>
          ) : (
            <table className={tableWidthClass} style={{ minWidth: tableMinWidth }}>
              {/*
                `<colgroup>` pins each column to the width we want. This is the
                most authoritative way to set column widths in HTML tables — the
                browser respects `<col>` widths over per-cell widths, and
                combined with `table-fixed` above guarantees the special
                columns (checkbox / drag / actions) render at the same pixel
                width on every page.

                Field columns without an explicit `width` get an unset `<col>`
                so they share remaining space proportionally.
              */}
              {(() => {
                /*
                  Determine which data column absorbs leftover horizontal space.
                  Priority:
                    1. A field with `flex: true` (explicit opt-in).
                    2. Any field without an explicit `width` (legacy behavior).
                    3. None — render a trailing spacer column that absorbs
                       leftover so every real column stays at its declared
                       width pixel-exact across pages.

                  When a column is hover-expanded, the flex column is FROZEN
                  at its declared `width` (or `FLEX_FALLBACK_WIDTH` if none was
                  declared). That way the table grows beyond the container and
                  horizontal scroll absorbs the slack — instead of squeezing
                  the flex column to nothing on small viewports.
                */
                const explicitFlex = fields.find((f) => f.flex);
                const hasFlexField =
                  !!explicitFlex || fields.some((f) => f.width == null && !f.flex);
                const flexFieldKey = explicitFlex?.key ?? null;
                const isHovering = hoveredColumnId != null;
                const flexFrozen = isHovering;
                return (
                  <colgroup>
                    {table.getVisibleLeafColumns().map((col) => {
                      const colId = col.id;
                      // Special bookkeeping columns get pinned widths.
                      if (colId === "__select")
                        return (
                          <col key={colId} width={SELECT_COL_WIDTH} style={{ width: SELECT_COL_WIDTH }} />
                        );
                      if (colId === "__drag")
                        return <col key={colId} width={DRAG_COL_WIDTH} style={{ width: DRAG_COL_WIDTH }} />;
                      if (colId === "__actions")
                        return (
                          <col key={colId} width={rowActionsWidth} style={{ width: rowActionsWidth }} />
                        );
                      const f = fieldByKey.get(colId);
                      if (!f) return <col key={colId} />;
                      // Flex column: unsized normally; frozen to its declared
                      // width during hover-expand of any other column so the
                      // table grows rather than the flex column shrinking.
                      if (flexFieldKey === colId) {
                        if (flexFrozen) {
                          const frozen = f.width ?? FLEX_FALLBACK_WIDTH;
                          return (
                            <col
                              key={colId}
                              width={frozen}
                              style={{ width: frozen, transition: "width 220ms ease-out" }}
                            />
                          );
                        }
                        return <col key={colId} />;
                      }
                      // Hovered column gets hoverExpandWidth; otherwise the
                      // declared width (unsized if absent).
                      const isHovered = hoveredColumnId === colId;
                      const target =
                        isHovered && f.hoverExpandWidth != null ? f.hoverExpandWidth : f.width;
                      if (target == null) return <col key={colId} />;
                      return (
                        <col
                          key={colId}
                          width={target}
                          style={{ width: target, transition: "width 220ms ease-out" }}
                        />
                      );
                    })}
                    {/*
                      Spacer is only needed when no field is meant to absorb
                      leftover horizontal space. Without it, browsers
                      redistribute the leftover inconsistently per page when
                      every column has an explicit width.
                    */}
                    {!hasFlexField ? <col data-slot="line-items-spacer-col" /> : null}
                  </colgroup>
                );
              })()}
              <thead className="astw:sticky astw:top-0 astw:z-10 astw:bg-card">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header: Header<T, unknown>) => {
                      const colId = header.column.columnDef.id ?? header.column.id;
                      const pinStyle = getPinStyle(colId);
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            // Right border between columns; last real column
                            // drops it (the trailing spacer takes over).
                            // Inset box-shadow paints the bottom divider so it
                            // survives sticky-header repaint and any
                            // border-collapse weirdness during scroll.
                            "astw:text-foreground astw:h-10 astw:text-left astw:align-middle astw:font-medium astw:whitespace-nowrap astw:border-r astw:border-border astw:[box-shadow:inset_0_-1px_0_var(--border)]",
                            // Special columns (checkbox / drag / actions)
                            // drop the inner padding so their content can
                            // center pixel-perfect against the cell box —
                            // matching the body cells which use `p-0`.
                            colId.startsWith("__")
                              ? "astw:px-0"
                              : "astw:px-2",
                          )}
                          style={pinStyle}
                          onMouseEnter={() => onColumnHoverEnter(colId)}
                          onMouseLeave={() => onColumnHoverLeave(colId)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
                    {/* Spacer header (matches the trailing <col /> above). */}
                    {renderTrailingSpacer ? (
                      <th
                        aria-hidden
                        data-slot="line-items-spacer-th"
                        className="astw:h-10 astw:[box-shadow:inset_0_-1px_0_var(--border)]"
                      />
                    ) : null}
                  </tr>
                ))}
              </thead>
              <tbody>
                {padTop > 0 ? (
                  <tr aria-hidden>
                    <td colSpan={colCount} style={{ height: padTop, padding: 0, border: "none" }} />
                  </tr>
                ) : null}
                {vItems.map((vi) => {
                  const row = allRows[vi.index] as Row<T> | undefined;
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      data-slot="table-row"
                      data-line-ref={row.original.lineRef}
                      ref={(el) => {
                        rowElRefs.current.set(row.original.lineRef, el);
                      }}
                      className={cn(
                        "astw:data-[state=selected]:bg-muted astw:border-b astw:border-border",
                      )}
                      style={{ height: vi.size }}
                      onDragOver={(e) => {
                        if (!enableDragReorder || ordering !== "manual") return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDropOnRow(row.original.lineRef, e);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const colId = cell.column.id;
                        const pinStyle = getPinStyle(colId);
                        return (
                          <Table.Cell
                            key={cell.id}
                            className="astw:relative astw:p-0 astw:align-middle astw:border-r astw:border-border astw:[&:has([role=checkbox])]:pr-0"
                            style={{ height: vi.size, ...pinStyle }}
                            onMouseEnter={() => onColumnHoverEnter(colId)}
                            onMouseLeave={() => onColumnHoverLeave(colId)}
                          >
                            {/*
                              Cell content renders directly inside the <td> as a relative flex box.
                              No absolute-positioned wrapper → the cell box, the input, and the
                              selection overlay all share identical bounds. Selection rectangle is
                              painted via an inset box-shadow on the shell so it matches edges
                              pixel-for-pixel without any layout displacement.
                            */}
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Table.Cell>
                        );
                      })}
                      {/* Trailing spacer cell — matches the trailing <col /> in colgroup. */}
                      {renderTrailingSpacer ? (
                        <td aria-hidden data-slot="line-items-spacer-td" style={{ padding: 0 }} />
                      ) : null}
                    </tr>
                  );
                })}
                {padBot > 0 ? (
                  <tr aria-hidden>
                    <td colSpan={colCount} style={{ height: padBot, padding: 0, border: "none" }} />
                  </tr>
                ) : null}
              </tbody>
              {totalsRowFn ? (
                <tfoot
                  data-slot="line-items-totals"
                  className="astw:sticky astw:bottom-0 astw:z-10 astw:bg-muted/50 astw:font-medium"
                >
                  <tr>
                    {table.getVisibleLeafColumns().map((col) => {
                      const colId = col.id;
                      const pinStyle = getPinStyle(colId);
                      const totalsMap = totalsRowFn(hook.allLines);
                      const value = totalsMap[colId];
                      const f = fieldByKey.get(colId);
                      const align = f ? alignClass[f.align ?? "left"] : "astw:text-left";
                      return (
                        <td
                          key={colId}
                          className={cn(
                            "astw:px-2 astw:py-2 astw:text-sm astw:border-t astw:border-border astw:[box-shadow:inset_0_1px_0_var(--border)]",
                            align,
                          )}
                          style={{ ...pinStyle, backgroundColor: "var(--muted)" }}
                        >
                          {value ?? null}
                        </td>
                      );
                    })}
                    {/* Trailing spacer matches the colgroup spacer. */}
                    {renderTrailingSpacer ? (
                      <td
                        aria-hidden
                        data-slot="line-items-spacer-td"
                        style={{ backgroundColor: "var(--muted)" }}
                      />
                    ) : null}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          )}
        </div>
      </LineItemsGridProvider>
    </div>
  );
}
LineItemsTable.displayName = "LineItems.Table";

/* ======================================================================== */
/* Helpers                                                                   */
/* ======================================================================== */

/** Coerce a TSV string into the field's typed value (mirrors the input parser). */
function coerceForField<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  raw: string | undefined,
): unknown {
  if (raw === undefined) return raw;
  if (field.type?.kind === "number") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isNaN(n) ? raw : n;
  }
  /* text + select: commit trimmed string (select options validated in UI, not here) */
  return raw.trim();
}
