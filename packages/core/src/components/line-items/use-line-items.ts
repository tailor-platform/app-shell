import * as React from "react";
import { fieldCommitScope, fieldsToColumnDefs } from "./field";
import {
  buildChangeSet,
  cloneBaseline,
  cloneRow,
  type LineItemsBaseline,
  type LineItemsColumnDef,
} from "./internals";
import type {
  LineItemsChangeSet,
  LineItemsMetadataCommit,
  LineItemsMode,
  LineItemsRowData,
  LineItemsSortState,
  UseLineItemsOptions,
  UseLineItemsReturn,
} from "./types";
import { usePendingAction } from "./use-pending-action";

type RowState<T extends LineItemsRowData> = {
  byRef: Record<string, T>;
  order: string[];
};

/**
 * Dirty-tracking state. `inserted` and `removed` track lines added or deleted
 * since the baseline, which lets the change-set engine tell an insert apart
 * from an edit of a persisted line.
 */
type DirtyState<T extends LineItemsRowData> = {
  baseline: LineItemsBaseline<T>;
  inserted: ReadonlySet<string>;
  removed: ReadonlySet<string>;
};

/**
 * The single source of truth for a line-items document: row order and lookup,
 * the dirty-tracking baseline behind `isDirty` and `getChangeSet()`, selection
 * and filter state, and every mutation.
 *
 * Pair with `<LineItems.Root value={lineItems}>` to render, or drive the
 * mutations directly from your own controls.
 */
/** Stable default, so a table without bulk actions never changes identity. */
const EMPTY_ACTIONS: never[] = [];

export function useLineItems<T extends LineItemsRowData>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  const {
    fields,
    defaultLines,
    lines: controlledLines,
    onLinesChange,
    mode: modeProp = "edit",
    ordering = "sort",
    rowSelection,
    onMetadataCommit,
  } = options;
  const selection = rowSelection !== undefined;
  const selectionActions = rowSelection?.actions ?? EMPTY_ACTIONS;

  const controlled = controlledLines !== undefined;
  const seed = controlled ? controlledLines : defaultLines;

  const [rows, setRows] = React.useState<RowState<T>>(() => packLines(sanitizeRows(seed ?? [])));
  const [dirty, setDirty] = React.useState<DirtyState<T>>(() => ({
    baseline: cloneBaseline<T>(rows.order, rows.byRef),
    inserted: new Set<string>(),
    removed: new Set<string>(),
  }));

  /**
   * Re-seeds from a controlled `lines` prop only when its set of `lineRef`s
   * changes, not on every value change — a parent re-rendering with equal rows
   * must not clobber in-flight local edits.
   */
  const seededRefs = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!controlled) return;
    const key = serializeRefs(controlledLines ?? []);
    if (seededRefs.current === key) return;
    seededRefs.current = key;
    // A re-seed is not a local edit, so it must not echo back to the parent.
    pendingNotify.current = false;
    const next = packLines(sanitizeRows(controlledLines ?? []));
    setRows(next);
    setDirty({
      baseline: cloneBaseline<T>(next.order, next.byRef),
      inserted: new Set<string>(),
      removed: new Set<string>(),
    });
  }, [controlled, controlledLines]);

  const [mode, setModeState] = React.useState<LineItemsMode>(modeProp);
  React.useEffect(() => {
    setModeState(modeProp);
  }, [modeProp]);

  const [filter, setFilterState] = React.useState("");
  const [sortState, setSortState] = React.useState<LineItemsSortState | null>(null);
  // Selection follows DataTable's `rowSelection`: controlled through
  // `selectedIds` + `onChange`, or uncontrolled from `defaultSelectedIds`.
  const controlledSelectedIds = rowSelection?.selectedIds;
  const [uncontrolledSelected, setUncontrolledSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(rowSelection?.defaultSelectedIds ?? []),
  );
  const selectedSet = React.useMemo<ReadonlySet<string>>(
    () => (controlledSelectedIds ? new Set(controlledSelectedIds) : uncontrolledSelected),
    [controlledSelectedIds, uncontrolledSelected],
  );
  const selectedSetRef = React.useRef(selectedSet);
  selectedSetRef.current = selectedSet;
  const onSelectionChangeRef = React.useRef(rowSelection?.onChange);
  onSelectionChangeRef.current = rowSelection?.onChange;
  const isSelectionControlled = controlledSelectedIds !== undefined;
  const isSelectionControlledRef = React.useRef(isSelectionControlled);
  isSelectionControlledRef.current = isSelectionControlled;

  /**
   * Applies a selection change and reports it. Derives from the latest value
   * (a ref, so commands issued back-to-back in one tick compose) and is a
   * no-op when the updater returns the same set.
   */
  const setSelectedSet = React.useCallback(
    (update: (prev: ReadonlySet<string>) => ReadonlySet<string>) => {
      const prev = selectedSetRef.current;
      const next = update(prev);
      if (next === prev) return;
      selectedSetRef.current = next;
      if (!isSelectionControlledRef.current) setUncontrolledSelected(next);
      onSelectionChangeRef.current?.([...next]);
    },
    [],
  );

  const columns = React.useMemo<LineItemsColumnDef<T>[]>(
    () => fieldsToColumnDefs(fields),
    [fields],
  );

  const onLinesChangeRef = React.useRef(onLinesChange);
  React.useEffect(() => {
    onLinesChangeRef.current = onLinesChange;
  }, [onLinesChange]);

  const onMetadataCommitRef = React.useRef(onMetadataCommit);
  React.useEffect(() => {
    onMetadataCommitRef.current = onMetadataCommit;
  }, [onMetadataCommit]);

  /** Keys whose edits bypass the change-set and are reported out-of-band instead. */
  const metadataKeys = React.useMemo(() => {
    const keys = new Set<string>();
    for (const f of fields) {
      if ((f.editable?.length ?? 0) > 0 && fieldCommitScope(f) === "metadata") keys.add(f.key);
    }
    return keys;
  }, [fields]);

  /**
   * Set by every local mutation so the notify effect below can tell a real edit
   * apart from the initial mount or a re-seed from the `lines` prop, neither of
   * which should echo back to the parent.
   */
  const pendingNotify = React.useRef(false);

  const metadataKeysRef = React.useRef(metadataKeys);
  metadataKeysRef.current = metadataKeys;

  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  const addLines = React.useCallback(
    (
      items: ReadonlyArray<Partial<Omit<T, "lineRef">>>,
      opts?: { afterLineRef?: string | null },
    ): string[] => {
      if (items.length === 0) return [];
      const newRefs = items.map(() => newLineRef());
      pendingNotify.current = true;

      setRows((prev) => {
        const byRef = { ...prev.byRef };
        items.forEach((partial, i) => {
          const id = newRefs[i]!;
          byRef[id] = { ...(partial as Record<string, unknown>), lineRef: id } as T;
        });
        return { byRef, order: insertAfter(prev.order, newRefs, opts?.afterLineRef) };
      });

      setDirty((prev) => {
        const inserted = new Set(prev.inserted);
        for (const id of newRefs) inserted.add(id);
        return { ...prev, inserted };
      });

      return newRefs;
    },
    [],
  );

  const addLine = React.useCallback(
    (partial: Partial<Omit<T, "lineRef">>, opts?: { afterLineRef?: string | null }): string =>
      addLines([partial], opts)[0]!,
    [addLines],
  );

  const removeLines = React.useCallback(
    (refs: readonly string[]) => {
      if (refs.length === 0) return;
      const doomed = new Set(refs);
      pendingNotify.current = true;

      setRows((prev) => {
        const byRef = { ...prev.byRef };
        for (const id of doomed) delete byRef[id];
        return { byRef, order: prev.order.filter((id) => !doomed.has(id)) };
      });

      setDirty((prev) => {
        const inserted = new Set(prev.inserted);
        const removed = new Set(prev.removed);
        for (const id of doomed) {
          inserted.delete(id);
          if (prev.baseline.rows[id]) removed.add(id);
        }
        return { ...prev, inserted, removed };
      });

      setSelectedSet((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of doomed) next.delete(id);
        return next.size === prev.size ? prev : next;
      });
    },
    [setSelectedSet],
  );

  const removeLine = React.useCallback((lineRef: string) => removeLines([lineRef]), [removeLines]);

  const updateLines = React.useCallback((patches: { lineRef: string; patch: Partial<T> }[]) => {
    if (patches.length === 0) return;
    pendingNotify.current = true;

    if (metadataKeysRef.current.size > 0 && onMetadataCommitRef.current) {
      const current = rowsRef.current;
      for (const { lineRef, patch } of patches) {
        const row = current.byRef[lineRef];
        if (!row) continue;
        const metaPatch: Record<string, unknown> = {};
        const previous: Record<string, unknown> = {};
        for (const key of Object.keys(patch)) {
          if (!metadataKeysRef.current.has(key)) continue;
          metaPatch[key] = (patch as Record<string, unknown>)[key];
          previous[key] = (row as Record<string, unknown>)[key];
        }
        if (Object.keys(metaPatch).length === 0) continue;
        onMetadataCommitRef.current({
          lineRef,
          patch: metaPatch,
          previous,
          row: { ...row, ...patch } as T,
        } satisfies LineItemsMetadataCommit<T>);
      }
    }

    setRows((prev) => {
      const byRef = { ...prev.byRef };
      let touched = false;
      for (const { lineRef, patch } of patches) {
        const cur = byRef[lineRef];
        if (!cur) continue;
        byRef[lineRef] = { ...cur, ...patch } as T;
        touched = true;
      }
      if (!touched) return prev;
      return { byRef, order: prev.order };
    });
  }, []);

  const updateField = React.useCallback(
    <K extends keyof T>(lineRef: string, key: K, value: T[K]) => {
      updateLines([{ lineRef, patch: { [key]: value } as unknown as Partial<T> }]);
    },
    [updateLines],
  );

  const reorderLine = React.useCallback(
    (lineRef: string, afterLineRef: string | null) => {
      if (ordering !== "manual") return;
      pendingNotify.current = true;
      setRows((prev) => {
        if (!prev.byRef[lineRef]) return prev;
        const without = prev.order.filter((id) => id !== lineRef);
        return { byRef: prev.byRef, order: insertAfter(without, [lineRef], afterLineRef) };
      });
    },
    [ordering],
  );

  const duplicateLastLine = React.useCallback(
    (derive?: (prev: T, newRef: string) => T): string | undefined => {
      const last = rows.order.at(-1);
      const src = last ? rows.byRef[last] : undefined;
      if (!src) return undefined;
      const id = newLineRef();
      const row = derive ? derive(cloneRow(src), id) : { ...cloneRow(src), lineRef: id };
      pendingNotify.current = true;

      setRows((prev) => ({ byRef: { ...prev.byRef, [id]: row }, order: [...prev.order, id] }));
      setDirty((prev) => ({ ...prev, inserted: new Set(prev.inserted).add(id) }));
      return id;
    },
    [rows],
  );

  const reset = React.useCallback(() => {
    setDirty({
      baseline: cloneBaseline<T>(rows.order, rows.byRef),
      inserted: new Set<string>(),
      removed: new Set<string>(),
    });
  }, [rows]);

  const revert = React.useCallback(() => {
    const order = [...dirty.baseline.order];
    const byRef: Record<string, T> = {};
    for (const id of order) {
      const row = dirty.baseline.rows[id];
      if (row) byRef[id] = cloneRow(row);
    }
    pendingNotify.current = true;
    setRows({ byRef, order });
    setDirty((prev) => ({
      ...prev,
      inserted: new Set<string>(),
      removed: new Set<string>(),
    }));
    setSelectedSet((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) if (byRef[id]) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [dirty.baseline, setSelectedSet]);

  const changeSet = React.useMemo(
    (): LineItemsChangeSet =>
      buildChangeSet(
        columns,
        dirty.baseline,
        rows.order,
        rows.byRef,
        dirty.removed,
        dirty.inserted,
        ordering,
      ),
    [columns, dirty, ordering, rows],
  );

  const getChangeSet = React.useCallback((): LineItemsChangeSet => changeSet, [changeSet]);

  const allLines = React.useMemo(
    (): T[] => rows.order.map((id) => rows.byRef[id]).filter(Boolean) as T[],
    [rows],
  );

  React.useEffect(() => {
    if (!pendingNotify.current) return;
    pendingNotify.current = false;
    // The parent will echo these rows back through `lines`; record them as
    // already seeded so the echo is not mistaken for new data, which would
    // reset the baseline and drop the edit from the change-set.
    seededRefs.current = serializeRefs(allLines);
    onLinesChangeRef.current?.(allLines);
  }, [allLines]);

  const filteredLines = React.useMemo((): T[] => {
    const query = filter.trim();
    if (query === "") return allLines;
    const searchable = fields.filter((f) => typeof f.search === "function");
    if (searchable.length === 0) return allLines;
    return allLines.filter((row) => searchable.some((f) => f.search!(row, query)));
  }, [allLines, fields, filter]);

  const lines = React.useMemo((): T[] => {
    if (!sortState) return filteredLines;
    const comparator = fields.find((f) => f.key === sortState.columnId)?.sort?.comparator;
    if (!comparator) return filteredLines;
    // Inverting the comparator rather than reversing keeps the sort stable, so
    // rows the comparator considers equal stay in document order either way.
    const direction = sortState.direction === "desc" ? -1 : 1;
    return filteredLines.toSorted((a, b) => direction * comparator(a, b));
  }, [fields, filteredLines, sortState]);

  /**
   * Cycles ascending, descending, then back to document order. Manual ordering
   * owns row order outright, so sorting is inert there.
   */
  const toggleSort = React.useCallback(
    (columnId: string) => {
      if (ordering !== "sort") return;
      setSortState((prev) => {
        if (prev?.columnId !== columnId) return { columnId, direction: "asc" };
        if (prev.direction === "asc") return { columnId, direction: "desc" };
        return null;
      });
    },
    [ordering],
  );

  const selectedIds = React.useMemo(
    () =>
      selectedSet.size === 0
        ? []
        : rows.order.filter((id) => selectedSet.has(id) && rows.byRef[id]),
    [rows, selectedSet],
  );

  const toggleSelect = React.useCallback(
    (lineRef: string) => {
      if (!selection) return;
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (!next.delete(lineRef)) next.add(lineRef);
        return next;
      });
    },
    [selection, setSelectedSet],
  );

  const visibleRefs = React.useMemo(() => lines.map((l) => l.lineRef), [lines]);

  const selectAllVisible = React.useCallback(() => {
    if (!selection) return;
    setSelectedSet(() => new Set(visibleRefs));
  }, [selection, setSelectedSet, visibleRefs]);

  const clearSelection = React.useCallback(() => {
    setSelectedSet((prev) => (prev.size === 0 ? prev : new Set<string>()));
  }, [setSelectedSet]);

  const bulkUpdate = React.useCallback(
    (patch: Partial<T>) => {
      if (selectedIds.length === 0) return;
      updateLines(selectedIds.map((lineRef) => ({ lineRef, patch })));
    },
    [selectedIds, updateLines],
  );

  const bulkRemove = React.useCallback(() => {
    removeLines(selectedIds);
  }, [removeLines, selectedIds]);

  const selectedRows = React.useMemo(
    () => selectedIds.map((id) => rows.byRef[id] as T),
    [rows, selectedIds],
  );

  const { pendingActionId, runSelectionAction } = usePendingAction(selection);

  const setMode = React.useCallback((m: LineItemsMode) => setModeState(m), []);
  const setFilter = React.useCallback((q: string) => setFilterState(q), []);

  return {
    lines,
    allLines,
    fields,
    mode,
    ordering,
    isDirty: !changeSet.isEmpty,
    filter,
    selectionEnabled: selection,
    selectedIds,
    selectedRows,
    selectionActions,
    pendingActionId,
    runSelectionAction,
    sortState: ordering === "sort" ? sortState : null,

    setMode,
    setFilter,
    toggleSort,
    addLine,
    addLines,
    removeLine,
    removeLines,
    updateField,
    updateLines,
    reorderLine,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    bulkUpdate,
    bulkRemove,
    duplicateLastLine,
    reset,
    revert,
    getChangeSet,
  };
}

export function newLineRef(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `line-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Splices `ids` into `order`: appended when `after` is `undefined`, prepended
 * when `null`, otherwise placed directly after that ref.
 */
function insertAfter(
  order: readonly string[],
  ids: readonly string[],
  after: string | null | undefined,
): string[] {
  const next = [...order];
  if (after === undefined) {
    next.push(...ids);
  } else if (after === null) {
    next.unshift(...ids);
  } else {
    const at = next.indexOf(after);
    if (at === -1) next.push(...ids);
    else next.splice(at + 1, 0, ...ids);
  }
  return next;
}

/** Backfills a generated `lineRef` for any row that arrives without one. */
function sanitizeRows<T extends LineItemsRowData>(rows: readonly T[]): T[] {
  return rows.map((row) => {
    const ref =
      typeof row.lineRef === "string" && row.lineRef.length > 0 ? row.lineRef : newLineRef();
    return { ...row, lineRef: ref };
  });
}

function packLines<T extends LineItemsRowData>(rows: readonly T[]): RowState<T> {
  const byRef: Record<string, T> = {};
  const order: string[] = [];
  for (const row of rows) {
    byRef[row.lineRef] = row;
    order.push(row.lineRef);
  }
  return { byRef, order };
}

function serializeRefs<T extends LineItemsRowData>(rows: readonly T[]): string {
  return `${rows.length}:${rows.map((r) => r.lineRef).join(",")}`;
}
