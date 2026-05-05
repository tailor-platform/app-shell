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

export type LineItemsTableProps = {
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
};

export function LineItemsTable<T extends LineItemsRowData>(props: LineItemsTableProps) {
  const {
    maxBodyHeight = "min(60vh, 480px)",
    className,
    tableContainerClassName,
    renderFullscreenToggle = true,
    enableDragReorder = false,
    emptyMessage = "No lines yet.",
  } = props;

  const root = useLineItemsRoot<T>();
  const { hook, fullscreen } = root;
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

    return cols;
  }, [enableDragReorder, fields, mode, ordering, selectionEnabled]);

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

  /* ---- Per-column resting / hover-expand width ------------------------ */

  const getColumnWidthStyle = React.useCallback(
    (colId: string): React.CSSProperties | undefined => {
      const f = fieldByKey.get(colId);
      if (!f) return undefined;
      const expand = f.hoverExpandWidth;
      const rest = f.width;
      if (expand == null && rest == null) return undefined;
      const target = expand != null && hoveredColumnId === colId ? expand : rest;
      const style: React.CSSProperties = {
        transition: "width 220ms ease-out, min-width 220ms ease-out",
      };
      if (target != null) {
        style.width = target;
        style.minWidth = target;
      }
      return style;
    },
    [fieldByKey, hoveredColumnId],
  );

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
      const tgt = e.target as HTMLElement | null;
      const insideInteractive = !!tgt?.closest?.(
        "input,textarea,button,select,[contenteditable=true]",
      );

      if (e.shiftKey) {
        setSsAnchor((a) => a ?? ssFocusRef.current ?? coord);
        setSsFocus(coord);
        return;
      }

      if (insideInteractive) return;

      setSsAnchor(coord);
      setSsFocus(coord);
      setSsPointerDragActive(true);
      scrollParentRef.current?.focus();
    },
    [fillGestureSource, mode],
  );

  const onCellFocused = React.useCallback(
    (coord: GridCoord) => {
      if (mode === "display") return;
      const cur = ssFocusRef.current;
      if (cur && sameCoord(cur, coord)) return;
      setSsAnchor(coord);
      setSsFocus(coord);
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
      const updates: { lineRef: string; patch: Partial<T> }[] = [];
      const existing = new Map<string, Partial<T>>();

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
      for (const [lineRef, patch] of existing.entries()) updates.push({ lineRef, patch });
      if (updates.length) hook.updateLines(updates);
      if (skipped) toast.info("Some cells were skipped (read-only columns).");
    },
    [mode, ssFocus, orderedLineRefs, schemaColumnIds, fieldByKey, hook],
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

  const tableWidthClass = "astw:w-full astw:caption-bottom astw:text-sm";
  const vItems = rowVirtualizer.getVirtualItems();
  const colCount = Math.max(1, table.getVisibleLeafColumns().length);
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
            <table className={tableWidthClass}>
              <thead className="astw:sticky astw:top-0 astw:z-10 astw:bg-card">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header: Header<T, unknown>) => {
                      const colId = header.column.columnDef.id ?? header.column.id;
                      const widthStyle = getColumnWidthStyle(colId);
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            // Right border between columns; last column drops
                            // it. Inset box-shadow paints the bottom divider so
                            // it survives sticky-header repaint and any
                            // border-collapse weirdness during scroll.
                            "astw:text-foreground astw:h-10 astw:px-2 astw:text-left astw:align-middle astw:font-medium astw:whitespace-nowrap astw:border-r astw:border-border astw:last:border-r-0 astw:[box-shadow:inset_0_-1px_0_var(--border)]",
                            colId.startsWith("__") && "astw:w-px",
                          )}
                          style={widthStyle}
                          onMouseEnter={() => onColumnHoverEnter(colId)}
                          onMouseLeave={() => onColumnHoverLeave(colId)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
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
                        const widthStyle = getColumnWidthStyle(colId);
                        return (
                          <Table.Cell
                            key={cell.id}
                            className="astw:relative astw:p-0 astw:align-middle astw:border-r astw:border-border astw:last:border-r-0 astw:[&:has([role=checkbox])]:pr-0"
                            style={{ height: vi.size, ...widthStyle }}
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
                    </tr>
                  );
                })}
                {padBot > 0 ? (
                  <tr aria-hidden>
                    <td colSpan={colCount} style={{ height: padBot, padding: 0, border: "none" }} />
                  </tr>
                ) : null}
              </tbody>
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
