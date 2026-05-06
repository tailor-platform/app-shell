import * as React from "react";

import { fieldsToColumnDefs } from "./field";
import {
  buildChangeSet,
  cloneBaseline,
  cloneRow,
  isChangeSetEmpty,
  type LineItemsBaseline,
  type LineItemsColumnDef,
} from "./internals";
import type {
  LineItemsChangeSet,
  LineItemsMetadataCommit,
  LineItemsMode,
  LineItemsOrderingMode,
  LineItemsRowData,
  UseLineItemsOptions,
  UseLineItemsReturn,
} from "./types";

/* ======================================================================== */
/* Public hook                                                               */
/* ======================================================================== */

/**
 * The single source of truth for a line-items document. Owns:
 *   - canonical row order + keyed lookup,
 *   - dirty-tracking baseline (drives `isDirty` + `getChangeSet`),
 *   - row selection + filter state,
 *   - all imperative mutations (`addLine`, `updateField`, `bulkUpdate`, ...).
 *
 * Pair with `<LineItems.Root value={lineItems}>` and the compound subcomponents
 * to render. Hosts can also call mutations directly (e.g. wire a custom
 * `<Combobox>` to `lineItems.addLine` for an inline catalogue picker).
 */
export function useLineItems<T extends LineItemsRowData>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  const {
    fields,
    data,
    lines: controlledLinesProp,
    onLinesChange,
    mode: modeProp = "edit",
    ordering: orderingProp = "sort",
    selection = false,
    onMetadataCommit,
  } = options;

  const controlled = controlledLinesProp !== undefined;

  /* ---- Canonical row state ---------------------------------------------- */

  const [uncontrolledSeed, setUncontrolledSeed] = React.useState<T[]>(() =>
    sanitizeInitial(data ?? []),
  );

  /** Source of truth depending on controlled vs uncontrolled. */
  const activeSeed = controlled ? sanitizeInitial(controlledLinesProp ?? []) : uncontrolledSeed;

  const [byRef, setByRef] = React.useState<Record<string, T>>(
    () => packLines(activeSeed).byRefInit,
  );
  const [order, setOrder] = React.useState<string[]>(() => packLines(activeSeed).orderInit);

  const baseline = React.useRef<LineItemsBaseline<T>>(
    cloneBaseline<T>(packLines(activeSeed).orderInit, packLines(activeSeed).byRefInit),
  );
  const insertedRefsRef = React.useRef(new Set<string>());
  const removedBaselineRefsRef = React.useRef(new Set<string>());

  const [rerenderNonce, bump] = React.useReducer((n: number) => n + 1, 0);

  /* ---- Sync controlled lines into local state when prop ref changes ----- */

  const prevControlledSerialized = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!controlled) return undefined;
    const key = serializeRows(controlledLinesProp ?? []);
    if (prevControlledSerialized.current === key) return undefined;
    prevControlledSerialized.current = key;
    const init = packLines(sanitizeInitial(controlledLinesProp ?? []));
    setByRef(init.byRefInit);
    setOrder(init.orderInit);
    insertedRefsRef.current = new Set();
    removedBaselineRefsRef.current = new Set();
    baseline.current = cloneBaseline<T>(init.orderInit, init.byRefInit);
    bump();
    return undefined;
  }, [controlled, controlledLinesProp]);

  /* ---- Other reactive state --------------------------------------------- */

  const [mode, setModeState] = React.useState<LineItemsMode>(modeProp);
  React.useEffect(() => {
    setModeState(modeProp);
  }, [modeProp]);

  const ordering: LineItemsOrderingMode = orderingProp;

  const [filter, setFilterState] = React.useState("");
  const [selectedSet, setSelectedSet] = React.useState<Set<string>>(() => new Set());

  /* ---- Internal column defs (memoized on `fields`) ---------------------- */

  const columns = React.useMemo<LineItemsColumnDef<T>[]>(
    () => fieldsToColumnDefs(fields),
    [fields],
  );

  /* ---- Helpers shared across mutations ---------------------------------- */

  const pushParent = React.useCallback(
    (nextByRef: Record<string, T>, nextOrder: string[]) => {
      const rows = nextOrder.map((id) => nextByRef[id]).filter(Boolean) as T[];
      if (!controlled) setUncontrolledSeed(rows);
      onLinesChange?.(rows);
      bump();
    },
    [controlled, onLinesChange],
  );

  const replaceAll = React.useCallback(
    (nextByRef: Record<string, T>, nextOrder: string[]) => {
      setByRef(nextByRef);
      setOrder(nextOrder);
      pushParent(nextByRef, nextOrder);
    },
    [pushParent],
  );

  /* ---- Imperative API --------------------------------------------------- */

  const addLine = React.useCallback(
    (partial: Partial<Omit<T, "lineRef">>, opts?: { afterLineRef?: string | null }): string => {
      const id = newLineRef();
      const template = { ...(partial as Record<string, unknown>), lineRef: id } as T;
      insertedRefsRef.current.add(id);
      const nextOrder = [...order];
      const after = opts?.afterLineRef;
      if (after === undefined) nextOrder.push(id);
      else if (after === null) nextOrder.unshift(id);
      else {
        const pos = nextOrder.indexOf(after);
        nextOrder.splice(pos === -1 ? nextOrder.length : pos + 1, 0, id);
      }
      replaceAll({ ...byRef, [id]: template }, nextOrder);
      return id;
    },
    [byRef, order, replaceAll],
  );

  const addLines = React.useCallback(
    (
      items: ReadonlyArray<Partial<Omit<T, "lineRef">>>,
      opts?: { afterLineRef?: string | null },
    ): string[] => {
      if (items.length === 0) return [];
      const newRefs: string[] = [];
      const nextByRef = { ...byRef };
      const inserted: string[] = [];
      for (const partial of items) {
        const id = newLineRef();
        const tmpl = { ...(partial as Record<string, unknown>), lineRef: id } as T;
        nextByRef[id] = tmpl;
        insertedRefsRef.current.add(id);
        newRefs.push(id);
        inserted.push(id);
      }
      const after = opts?.afterLineRef;
      const nextOrder = [...order];
      if (after === undefined) nextOrder.push(...inserted);
      else if (after === null) nextOrder.unshift(...inserted);
      else {
        const idx = nextOrder.indexOf(after);
        if (idx === -1) nextOrder.push(...inserted);
        else nextOrder.splice(idx + 1, 0, ...inserted);
      }
      replaceAll(nextByRef, nextOrder);
      return newRefs;
    },
    [byRef, order, replaceAll],
  );

  const removeLine = React.useCallback(
    (lineRef: string) => {
      if (baseline.current.rows[lineRef]) removedBaselineRefsRef.current.add(lineRef);
      insertedRefsRef.current.delete(lineRef);

      const nextBy = { ...byRef };
      delete nextBy[lineRef];
      const nextOrder = order.filter((id) => id !== lineRef);
      // Drop selection for removed rows.
      setSelectedSet((prev) => {
        if (!prev.has(lineRef)) return prev;
        const next = new Set(prev);
        next.delete(lineRef);
        return next;
      });
      replaceAll(nextBy, nextOrder);
    },
    [byRef, order, replaceAll],
  );

  const updateField = React.useCallback(
    <K extends keyof T>(lineRef: string, key: K, value: T[K]) => {
      const cur = byRef[lineRef];
      if (!cur) return;
      const next: T = { ...cur, [key]: value } as T;
      const fld = fields.find((f) => f.key === (key as unknown as string));
      const isMetadata = fld && fld.commit === "metadata";
      if (isMetadata && onMetadataCommit) {
        const prev = (baseline.current.rows[lineRef] ?? cur) as T;
        const event: LineItemsMetadataCommit<T> = {
          lineRef,
          patch: { [key as string]: value },
          previous: { [key as string]: (prev as Record<string, unknown>)[key as string] },
          row: next,
        };
        onMetadataCommit(event);
      }
      replaceAll({ ...byRef, [lineRef]: next }, order);
    },
    [byRef, fields, onMetadataCommit, order, replaceAll],
  );

  const updateLines = React.useCallback(
    (patches: { lineRef: string; patch: Partial<T> }[]) => {
      if (patches.length === 0) return;
      let next = { ...byRef };
      for (const u of patches) {
        const cur = next[u.lineRef];
        if (!cur) continue;
        next = { ...next, [u.lineRef]: { ...cur, ...u.patch } as T };
      }
      replaceAll(next, order);
    },
    [byRef, order, replaceAll],
  );

  const reorderLine = React.useCallback(
    (lineRef: string, afterLineRef: string | null) => {
      if (ordering !== "manual") return;
      const next = order.filter((id) => id !== lineRef);
      if (afterLineRef === null) next.unshift(lineRef);
      else {
        const pos = next.indexOf(afterLineRef);
        next.splice(pos === -1 ? next.length : pos + 1, 0, lineRef);
      }
      replaceAll(byRef, next);
    },
    [byRef, order, ordering, replaceAll],
  );

  const reset = React.useCallback(() => {
    baseline.current = cloneBaseline<T>(order, byRef);
    insertedRefsRef.current = new Set();
    removedBaselineRefsRef.current = new Set();
    bump();
  }, [byRef, order]);

  /**
   * Restore current row state to the dirty-tracking baseline (the seed data,
   * or whatever was last accepted via `reset()`). Used to implement Discard:
   * forgets every uncommitted edit, insertion, and removal in one shot.
   */
  const revert = React.useCallback(() => {
    const nextOrder = [...baseline.current.order];
    const nextByRef: Record<string, T> = {};
    for (const id of nextOrder) {
      const row = baseline.current.rows[id];
      if (row) nextByRef[id] = { ...row } as T;
    }
    insertedRefsRef.current = new Set();
    removedBaselineRefsRef.current = new Set();
    setSelectedSet((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      for (const id of prev) if (nextByRef[id]) next.add(id);
      return next.size === prev.size ? prev : next;
    });
    replaceAll(nextByRef, nextOrder);
  }, [replaceAll]);

  const getChangeSet = React.useCallback((): LineItemsChangeSet => {
    // Read `rerenderNonce` so callers re-derive `isDirty` after `reset()`,
    // which only mutates refs (baseline, inserted/removed sets).
    void rerenderNonce;
    return buildChangeSet(
      columns,
      baseline.current,
      order,
      byRef,
      removedBaselineRefsRef.current,
      insertedRefsRef.current,
      ordering,
    );
  }, [byRef, columns, order, ordering, rerenderNonce]);

  /* ---- Derived: dirty bit ---------------------------------------------- */

  const isDirty = React.useMemo(() => !isChangeSetEmpty(getChangeSet()), [getChangeSet]);

  /* ---- Lines (filtered + unfiltered) ------------------------------------ */

  const allLines = React.useMemo(
    (): T[] => order.map((id) => byRef[id]).filter(Boolean) as T[],
    [byRef, order],
  );

  const lines = React.useMemo((): T[] => {
    const q = filter.trim();
    if (q === "") return allLines;
    const searchableFields = fields.filter((f) => typeof f.search === "function");
    if (searchableFields.length === 0) return allLines;
    return allLines.filter((row) =>
      searchableFields.some((f) => (f.search as (l: T, q: string) => boolean)(row, q)),
    );
  }, [allLines, fields, filter]);

  /* ---- Selection -------------------------------------------------------- */

  const visibleSet = React.useMemo(() => {
    return new Set(lines.map((l) => l.lineRef));
  }, [lines]);

  const selectedIds = React.useMemo(() => {
    if (selectedSet.size === 0) return [] as string[];
    return order.filter((id) => selectedSet.has(id) && byRef[id]);
  }, [byRef, order, selectedSet]);

  const toggleSelect = React.useCallback(
    (lineRef: string) => {
      if (!selection) return;
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (next.has(lineRef)) next.delete(lineRef);
        else next.add(lineRef);
        return next;
      });
    },
    [selection],
  );

  const selectAllVisible = React.useCallback(() => {
    if (!selection) return;
    setSelectedSet(new Set(visibleSet));
  }, [selection, visibleSet]);

  const clearSelection = React.useCallback(() => {
    setSelectedSet((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const bulkUpdate = React.useCallback(
    (patch: Partial<T>) => {
      if (selectedIds.length === 0) return;
      const updates = selectedIds.map((lineRef) => ({ lineRef, patch }));
      updateLines(updates);
    },
    [selectedIds, updateLines],
  );

  const bulkRemove = React.useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    let nextBy = { ...byRef };
    let nextOrder = order;
    for (const id of ids) {
      if (baseline.current.rows[id]) removedBaselineRefsRef.current.add(id);
      insertedRefsRef.current.delete(id);
      delete nextBy[id];
      nextOrder = nextOrder.filter((x) => x !== id);
    }
    setSelectedSet(new Set());
    replaceAll(nextBy, nextOrder);
  }, [byRef, order, replaceAll, selectedIds]);

  /* ---- Misc ------------------------------------------------------------- */

  const duplicateLastLine = React.useCallback(
    (derive?: (prev: T, newRef: string) => T): string | undefined => {
      const last = order.at(-1);
      if (!last) return undefined;
      const src = byRef[last];
      if (!src) return undefined;
      const id = newLineRef();
      const row = (derive ?? defaultDerive)(cloneRow(src), id);
      insertedRefsRef.current.add(id);
      const nextOrder = [...order, id];
      replaceAll({ ...byRef, [id]: row }, nextOrder);
      return id;
    },
    [byRef, order, replaceAll],
  );

  const setMode = React.useCallback((m: LineItemsMode) => setModeState(m), []);
  const setFilter = React.useCallback((q: string) => setFilterState(q), []);

  const ret: UseLineItemsReturn<T> = {
    lines,
    allLines,
    fields,
    mode,
    ordering,
    isDirty,
    filter,
    selectionEnabled: selection,
    selectedIds,

    setMode,
    setFilter,
    addLine,
    addLines,
    removeLine,
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

  attachInternals(ret, {
    columns,
    baselineRef: baseline,
    insertedRefsRef,
    removedBaselineRefsRef,
  });

  return ret;
}

/* ======================================================================== */
/* Helpers                                                                   */
/* ======================================================================== */

export function newLineRef(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `line-${Math.random().toString(36).slice(2, 11)}`;
}

function defaultDerive<T extends LineItemsRowData>(prev: T, newRef: string): T {
  return { ...prev, lineRef: newRef };
}

function sanitizeInitial<T extends LineItemsRowData>(rows: readonly T[]): T[] {
  return rows.map((r) => {
    const ref =
      typeof (r as { lineRef?: string }).lineRef === "string" &&
      String((r as { lineRef: string }).lineRef).length > 0
        ? (r as { lineRef: string }).lineRef
        : newLineRef();
    return { ...r, lineRef: ref };
  }) as T[];
}

function packLines<T extends LineItemsRowData>(
  rows: readonly T[],
): { byRefInit: Record<string, T>; orderInit: string[] } {
  const byRefInit: Record<string, T> = {};
  const orderInit: string[] = [];
  for (const r of rows) {
    byRefInit[r.lineRef] = r;
    orderInit.push(r.lineRef);
  }
  return { byRefInit, orderInit };
}

function serializeRows<T extends LineItemsRowData>(rows: readonly T[]): string {
  try {
    const refs = rows.map((r) => r.lineRef);
    return (
      JSON.stringify(
        // oxlint-disable-next-line unicorn/no-array-sort -- ES2020 bundle; avoid `toSorted` (ES2023-only)
        refs.slice().sort((a, b) => (a === b ? 0 : a > b ? 1 : -1)),
      ) + rows.length.toString()
    );
  } catch {
    return `${rows.length}`;
  }
}

/* ======================================================================== */
/* Internal accessor for the table layer                                    */
/* ======================================================================== */

/**
 * Internal: the rendering layer (compound `<LineItems.Table />`) needs a few
 * pieces of mutable state from the hook (the baseline, inserted/removed sets,
 * and internal column defs) that aren't part of the public surface. We
 * surface them via a hidden symbol so the hook return shape stays clean.
 */
export const LINE_ITEMS_INTERNALS = Symbol.for("@tailor/line-items/internals");

export type LineItemsHookInternals<T extends LineItemsRowData> = {
  columns: LineItemsColumnDef<T>[];
  baselineRef: React.MutableRefObject<LineItemsBaseline<T>>;
  insertedRefsRef: React.MutableRefObject<Set<string>>;
  removedBaselineRefsRef: React.MutableRefObject<Set<string>>;
};

/** Attach internals to the public hook return value (called from `useLineItems`). */
export function attachInternals<T extends LineItemsRowData>(
  ret: UseLineItemsReturn<T>,
  internals: LineItemsHookInternals<T>,
): UseLineItemsReturn<T> {
  (ret as unknown as Record<symbol, unknown>)[LINE_ITEMS_INTERNALS] = internals;
  return ret;
}

export function getInternals<T extends LineItemsRowData>(
  hook: UseLineItemsReturn<T>,
): LineItemsHookInternals<T> | null {
  const value = (hook as unknown as Record<symbol, unknown>)[LINE_ITEMS_INTERNALS];
  return (value as LineItemsHookInternals<T>) ?? null;
}
