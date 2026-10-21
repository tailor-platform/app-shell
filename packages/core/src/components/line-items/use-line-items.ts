import * as React from "react";
import { fieldCommitScope, fieldsToColumnDefs } from "./field";
import {
  buildChangeSet,
  cloneBaseline,
  cloneRow,
  readLineKey,
  withLineKey,
  type LineItemsBaseline,
  type LineItemsColumnDef,
} from "./internals";
import type {
  LineItemsCellError,
  LineItemsChangeSet,
  LineItemsMetadataCommit,
  LineItemsMode,
  LineItemsResetInput,
  LineItemsRowData,
  LineItemsSortState,
  UseLineItemsOptions,
  UseLineItemsReturn,
} from "./types";
import { useIdSet } from "./use-id-set";
import { usePendingAction } from "./use-pending-action";

type RowState<T extends LineItemsRowData> = {
  byKey: Record<string, T>;
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

/** Stable defaults, so a table without these never changes identity. */
const EMPTY_ACTIONS: never[] = [];
const EMPTY_ERRORS: LineItemsCellError[] = [];

/**
 * The single source of truth for a line-items document: row order and lookup,
 * the dirty-tracking baseline behind `isDirty` and `getChangeSet()`, selection
 * and filter state, and every mutation.
 *
 * Pair with `<LineItems.Root value={lineItems}>` to render, or drive the
 * mutations directly from your own controls.
 */
export function useLineItems<T extends LineItemsRowData>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  const {
    fields,
    defaultLines,
    lines: controlledLines,
    onLinesChange,
    idKey = "id" as keyof T & string,
    mode: modeProp = "edit",
    ordering = "sort",
    rowSelection,
    rowExpansion,
    onMetadataCommit,
  } = options;
  const selection = rowSelection !== undefined;
  const allSelectionActions = rowSelection?.actions ?? EMPTY_ACTIONS;

  const controlled = controlledLines !== undefined;

  const [initial] = React.useState(() =>
    seedLines(controlled ? controlledLines : (defaultLines ?? []), idKey),
  );
  const [rows, setRows] = React.useState<RowState<T>>(initial.rows);
  const [dirty, setDirty] = React.useState<DirtyState<T>>(() => initial.dirty);

  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;
  const dirtyRef = React.useRef(dirty);
  dirtyRef.current = dirty;

  /**
   * Set by every local mutation so the notify effect below can tell a real edit
   * apart from the initial mount or a sync from the `lines` prop, neither of
   * which should echo back to the parent.
   */
  const pendingNotify = React.useRef(false);

  /** The `lines` array last seen or emitted, so the parent's echo is skipped. */
  const lastSynced = React.useRef<readonly T[] | undefined>(controlledLines);

  /**
   * Follows a controlled `lines` prop. The parent's echo of our own emit is
   * skipped. Other updates are adopted: when the same lines come back with new
   * values (prices recalculated after a currency change, values the server
   * normalised), they replace the current values and the baseline stays put,
   * so local edits keep diffing correctly. When the set of lines changes (a
   * different document, or saved lines re-keyed with their server ids), the
   * baseline moves to the new lines.
   */
  React.useEffect(() => {
    if (!controlled || controlledLines === lastSynced.current) return;
    lastSynced.current = controlledLines;
    // A sync is not a local edit, so it must not echo back to the parent.
    pendingNotify.current = false;
    const next = seedLines(controlledLines, idKey);
    setRows(next.rows);
    if (!sameKeys(next.rows.order, rowsRef.current.order)) setDirty(next.dirty);
  }, [controlled, controlledLines, idKey]);

  const [mode, setModeState] = React.useState<LineItemsMode>(modeProp);
  React.useEffect(() => {
    setModeState(modeProp);
  }, [modeProp]);

  const selectionActions = React.useMemo(
    () => allSelectionActions.filter((action) => (action.modes ?? ["edit"]).includes(mode)),
    [allSelectionActions, mode],
  );

  const [filter, setFilterState] = React.useState("");
  const [sortState, setSortState] = React.useState<LineItemsSortState | null>(null);
  // Selection follows DataTable's `rowSelection`: controlled through
  // `selectedIds` + `onChange`, or uncontrolled from `defaultSelectedIds`.
  const [selectedSet, setSelectedSet] = useIdSet({
    ids: rowSelection?.selectedIds,
    defaultIds: rowSelection?.defaultSelectedIds,
    onChange: rowSelection?.onChange,
  });

  // Expansion follows DataTable's `rowExpansion` the same way. Ids that no
  // longer name a line just sit inert, as in DataTable.
  const [expandedSet, setExpandedSet] = useIdSet({
    ids: rowExpansion?.expandedIds,
    defaultIds: undefined,
    onChange: rowExpansion?.onChange,
  });

  /** Drops keys that no longer name a line, and renames re-keyed ones. */
  const reconcileSelection = React.useCallback(
    (byKey: Record<string, T>, rename?: ReadonlyMap<string, string>) => {
      setSelectedSet((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<string>();
        let changed = false;
        for (const key of prev) {
          const to = rename?.get(key) ?? key;
          if (to !== key) changed = true;
          if (byKey[to]) next.add(to);
          else changed = true;
        }
        return changed ? next : prev;
      });
    },
    [setSelectedSet],
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

  const metadataKeysRef = React.useRef(metadataKeys);
  metadataKeysRef.current = metadataKeys;
  const fieldsRef = React.useRef(fields);
  fieldsRef.current = fields;
  /** Lines whose metadata fields were edited here: validated like changed lines. */
  const metadataEdited = React.useRef(new Set<string>());

  // A metadata field with no handler would drop its edits silently: they're
  // kept out of the change-set and nothing else receives them.
  const warnedNoMetadataHandler = React.useRef(false);
  React.useEffect(() => {
    if (warnedNoMetadataHandler.current || metadataKeys.size === 0 || onMetadataCommit) return;
    warnedNoMetadataHandler.current = true;
    console.warn(
      `[LineItems] ${[...metadataKeys].join(", ")} use commit: "metadata", but useLineItems has no onMetadataCommit. Edits to saved lines in those fields go nowhere.`,
    );
  }, [metadataKeys, onMetadataCommit]);

  /**
   * Whether there are unsaved changes right now. Mutations set it straight
   * away and `reset` / `revert` clear it straight away, so a handler that
   * saves, resets and navigates in one go reads the new value before React
   * re-renders. Each render brings it back in line with the change-set.
   */
  const dirtyNow = React.useRef(false);

  const markEdited = React.useCallback(() => {
    pendingNotify.current = true;
    dirtyNow.current = true;
  }, []);

  const addLines = React.useCallback(
    (items: ReadonlyArray<Partial<T>>, opts?: { afterLineKey?: string | null }): string[] => {
      if (items.length === 0) return [];
      const newKeys = items.map(() => newLineKey());
      markEdited();

      setRows((prev) => {
        const byKey = { ...prev.byKey };
        items.forEach((partial, i) => {
          const key = newKeys[i]!;
          // A new line has no id until the server assigns one. Dropping any id
          // passed in (say, from a duplicated line) keeps it from posing as an
          // existing line.
          const { [idKey]: _id, ...data } = partial as Record<string, unknown>;
          byKey[key] = withLineKey(data as T, key);
        });
        return { byKey, order: insertAfter(prev.order, newKeys, opts?.afterLineKey) };
      });

      setDirty((prev) => {
        const inserted = new Set(prev.inserted);
        for (const key of newKeys) inserted.add(key);
        return { ...prev, inserted };
      });

      return newKeys;
    },
    [idKey, markEdited],
  );

  const addLine = React.useCallback(
    (partial: Partial<T>, opts?: { afterLineKey?: string | null }): string =>
      addLines([partial], opts)[0]!,
    [addLines],
  );

  const removeLines = React.useCallback(
    (keys: readonly string[]) => {
      if (keys.length === 0) return;
      const doomed = new Set(keys);
      markEdited();

      setRows((prev) => {
        const byKey = { ...prev.byKey };
        for (const key of doomed) delete byKey[key];
        return { byKey, order: prev.order.filter((key) => !doomed.has(key)) };
      });

      setDirty((prev) => {
        const inserted = new Set(prev.inserted);
        const removed = new Set(prev.removed);
        for (const key of doomed) {
          inserted.delete(key);
          if (prev.baseline.rows[key]) removed.add(key);
        }
        return { ...prev, inserted, removed };
      });

      setSelectedSet((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const key of doomed) next.delete(key);
        return next.size === prev.size ? prev : next;
      });
    },
    [markEdited, setSelectedSet],
  );

  const removeLine = React.useCallback((lineKey: string) => removeLines([lineKey]), [removeLines]);

  const updateLines = React.useCallback(
    (patches: { lineKey: string; patch: Partial<T> }[]) => {
      if (patches.length === 0) return;
      markEdited();

      if (metadataKeysRef.current.size > 0) {
        for (const { lineKey, patch } of patches) {
          if (Object.keys(patch).some((key) => metadataKeysRef.current.has(key))) {
            metadataEdited.current.add(lineKey);
          }
        }
      }

      if (metadataKeysRef.current.size > 0 && onMetadataCommitRef.current) {
        const current = rowsRef.current;
        for (const { lineKey, patch } of patches) {
          const row = current.byKey[lineKey];
          // A new line has no id to save against yet; its metadata fields
          // travel with its `add` op instead.
          if (!row || !hasId(row, idKey)) continue;
          const metaPatch: Record<string, unknown> = {};
          const previous: Record<string, unknown> = {};
          const next = { ...row, ...patch } as T;
          for (const key of Object.keys(patch)) {
            if (!metadataKeysRef.current.has(key)) continue;
            // An invalid value stays in the cell, flagged, but isn't saved.
            const validate = fieldsRef.current.find((f) => f.key === key)?.validate;
            if (validate?.((next as Record<string, unknown>)[key], next)) continue;
            metaPatch[key] = (patch as Record<string, unknown>)[key];
            previous[key] = (row as Record<string, unknown>)[key];
          }
          if (Object.keys(metaPatch).length === 0) continue;
          onMetadataCommitRef.current({
            lineId: lineKey,
            patch: metaPatch,
            previous,
            row: next,
          } satisfies LineItemsMetadataCommit<T>);
        }
      }

      setRows((prev) => {
        const byKey = { ...prev.byKey };
        let touched = false;
        for (const { lineKey, patch } of patches) {
          const cur = byKey[lineKey];
          if (!cur) continue;
          byKey[lineKey] = { ...cur, ...patch } as T;
          touched = true;
        }
        if (!touched) return prev;
        return { byKey, order: prev.order };
      });
    },
    [idKey, markEdited],
  );

  const updateField = React.useCallback(
    <K extends keyof T>(lineKey: string, key: K, value: T[K]) => {
      updateLines([{ lineKey, patch: { [key]: value } as unknown as Partial<T> }]);
    },
    [updateLines],
  );

  const reorderLine = React.useCallback(
    (lineKey: string, afterLineKey: string | null) => {
      if (ordering !== "manual" || lineKey === afterLineKey) return;
      markEdited();
      setRows((prev) => {
        if (!prev.byKey[lineKey]) return prev;
        const without = prev.order.filter((key) => key !== lineKey);
        return { byKey: prev.byKey, order: insertAfter(without, [lineKey], afterLineKey) };
      });
    },
    [markEdited, ordering],
  );

  const duplicateLastLine = React.useCallback(
    (derive?: (prev: T) => Partial<T>): string | undefined => {
      const current = rowsRef.current;
      const last = current.order.at(-1);
      const src = last ? current.byKey[last] : undefined;
      if (!src) return undefined;
      const copy = cloneRow(src);
      return addLine(derive ? { ...copy, ...derive(cloneRow(src)) } : copy);
    },
    [addLine],
  );

  const reset = React.useCallback(
    (saved?: LineItemsResetInput<T>) => {
      dirtyNow.current = false;
      metadataEdited.current = new Set<string>();
      const current = rowsRef.current;
      const pendingNew = dirtyRef.current.inserted;

      if (saved === undefined) {
        if (pendingNew.size > 0) {
          console.warn(
            `[LineItems] reset() was called with ${pendingNew.size} new line(s) and no saved lines, so they keep temporary keys and a later edit would send an update the server can't match. Pass the saved lines, reset(savedLines), or reset({ idMap }).`,
          );
        }
        setDirty({
          baseline: cloneBaseline<T>(current.order, current.byKey),
          inserted: new Set<string>(),
          removed: new Set<string>(),
        });
        return;
      }

      if (isLineArray(saved)) {
        const next = seedLines(saved, idKey);
        pendingNotify.current = true;
        setRows(next.rows);
        setDirty(next.dirty);
        reconcileSelection(next.rows.byKey);
        return;
      }

      // Re-key each new line with the id the server assigned it.
      const rename = new Map<string, string>();
      const byKey: Record<string, T> = {};
      const order = current.order.map((key) => {
        const row = current.byKey[key]!;
        const serverId = pendingNew.has(key) ? saved.idMap[key] : undefined;
        if (serverId === undefined || serverId === null || serverId === "") {
          byKey[key] = row;
          return key;
        }
        const nextKey = String(serverId);
        byKey[nextKey] = withLineKey({ ...row, [idKey]: serverId } as T, nextKey);
        rename.set(key, nextKey);
        return nextKey;
      });
      const stillNew = new Set([...pendingNew].filter((key) => !rename.has(key) && byKey[key]));
      if (stillNew.size > 0) {
        console.warn(
          `[LineItems] reset({ idMap }) has no id for ${stillNew.size} new line(s); they stay new and will be sent as adds again.`,
        );
      }
      if (rename.size > 0) {
        pendingNotify.current = true;
        setRows({ byKey, order });
      }
      setDirty({
        baseline: cloneBaseline<T>(
          order.filter((key) => !stillNew.has(key)),
          byKey,
        ),
        inserted: stillNew,
        removed: new Set<string>(),
      });
      reconcileSelection(byKey, rename);
    },
    [idKey, reconcileSelection],
  );

  const revert = React.useCallback(() => {
    dirtyNow.current = false;
    const { baseline } = dirtyRef.current;
    const current = rowsRef.current;
    const order = [...baseline.order];
    const byKey: Record<string, T> = {};
    for (const key of order) {
      const row = baseline.rows[key];
      if (!row) continue;
      const restored = cloneRow(row) as Record<string, unknown>;
      // Metadata fields saved out-of-band already, so Discard leaves them be.
      const live = current.byKey[key] as Record<string, unknown> | undefined;
      if (live) for (const field of metadataKeysRef.current) restored[field] = live[field];
      byKey[key] = restored as T;
    }
    pendingNotify.current = true;
    setRows({ byKey, order });
    setDirty((prev) => ({
      ...prev,
      inserted: new Set<string>(),
      removed: new Set<string>(),
    }));
    reconcileSelection(byKey);
  }, [reconcileSelection]);

  const changeSet = React.useMemo(
    (): LineItemsChangeSet =>
      buildChangeSet(
        columns,
        dirty.baseline,
        rows.order,
        rows.byKey,
        dirty.removed,
        dirty.inserted,
        ordering,
      ),
    [columns, dirty, ordering, rows],
  );
  dirtyNow.current = !changeSet.isEmpty;

  /**
   * Runs each field's `validate` over new and changed lines — the ones the
   * change-set would submit. Saved data the user didn't touch never blocks.
   */
  const errors = React.useMemo((): LineItemsCellError[] => {
    const validated = fields.filter((f) => typeof f.validate === "function");
    if (validated.length === 0 || mode === "view") return EMPTY_ERRORS;
    const touched = new Set<string>(metadataEdited.current);
    for (const change of changeSet.lineChanges) {
      if (change.action === "add") touched.add(change.tempId);
      else if (change.action === "update") touched.add(change.lineId);
    }
    const found: LineItemsCellError[] = [];
    for (const lineKey of rows.order) {
      if (!touched.has(lineKey)) continue;
      const line = rows.byKey[lineKey];
      if (!line) continue;
      for (const field of validated) {
        const message = field.validate!((line as Record<string, unknown>)[field.key], line);
        if (message) found.push({ lineKey, fieldKey: field.key, message });
      }
    }
    return found.length === 0 ? EMPTY_ERRORS : found;
  }, [changeSet, fields, mode, rows]);

  const errorIndex = React.useMemo(() => {
    const index = new Map<string, string>();
    for (const e of errors) index.set(`${e.lineKey}\u0000${e.fieldKey}`, e.message);
    return index;
  }, [errors]);
  const getCellError = React.useCallback(
    (lineKey: string, fieldKey: string) => errorIndex.get(`${lineKey}\u0000${fieldKey}`),
    [errorIndex],
  );

  const getChangeSet = React.useCallback((): LineItemsChangeSet => changeSet, [changeSet]);
  const hasUnsavedChanges = React.useCallback(() => dirtyNow.current, []);

  const allLines = React.useMemo(
    (): T[] => rows.order.map((key) => rows.byKey[key]).filter(Boolean) as T[],
    [rows],
  );

  React.useEffect(() => {
    if (!pendingNotify.current) return;
    pendingNotify.current = false;
    // The parent will echo these rows back through `lines`; remember them so
    // the echo is not mistaken for an update from the parent.
    lastSynced.current = allLines;
    onLinesChangeRef.current?.(allLines);
  }, [allLines]);

  const getLineKey = React.useCallback(
    (line: T): string => readLineKey(line) ?? (hasId(line, idKey) ? String(line[idKey]) : ""),
    [idKey],
  );
  const isNewLine = React.useCallback((line: T): boolean => !hasId(line, idKey), [idKey]);

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
        : rows.order.filter((key) => selectedSet.has(key) && rows.byKey[key]),
    [rows, selectedSet],
  );

  const toggleSelect = React.useCallback(
    (lineKey: string) => {
      if (!selection) return;
      setSelectedSet((prev) => {
        const next = new Set(prev);
        if (!next.delete(lineKey)) next.add(lineKey);
        return next;
      });
    },
    [selection, setSelectedSet],
  );

  const visibleKeys = React.useMemo(() => lines.map(getLineKey), [getLineKey, lines]);

  const selectAllVisible = React.useCallback(() => {
    if (!selection) return;
    setSelectedSet(() => new Set(visibleKeys));
  }, [selection, setSelectedSet, visibleKeys]);

  const clearSelection = React.useCallback(() => {
    setSelectedSet((prev) => (prev.size === 0 ? prev : new Set<string>()));
  }, [setSelectedSet]);

  const bulkUpdate = React.useCallback(
    (patch: Partial<T>) => {
      if (selectedIds.length === 0) return;
      updateLines(selectedIds.map((lineKey) => ({ lineKey, patch })));
    },
    [selectedIds, updateLines],
  );

  const bulkRemove = React.useCallback(() => {
    removeLines(selectedIds);
  }, [removeLines, selectedIds]);

  const selectedRows = React.useMemo(
    () => selectedIds.map((key) => rows.byKey[key] as T),
    [rows, selectedIds],
  );

  const { pendingActionId, runSelectionAction } = usePendingAction(selection);

  const canExpand = rowExpansion?.canExpand;
  const isRowExpanded = React.useCallback(
    (lineKey: string) => {
      if (!rowExpansion || !expandedSet.has(lineKey)) return false;
      const line = rows.byKey[lineKey];
      // Gated both ways, as in DataTable: a stale id never opens a panel.
      return line !== undefined && (canExpand?.(line) ?? true);
    },
    [canExpand, expandedSet, rowExpansion, rows],
  );
  const toggleRowExpansion = React.useCallback(
    (lineKey: string) => {
      setExpandedSet((prev) => {
        const next = new Set(prev);
        if (!next.delete(lineKey)) next.add(lineKey);
        return next;
      });
    },
    [setExpandedSet],
  );
  const collapseAllRows = React.useCallback(() => {
    setExpandedSet((prev) => (prev.size === 0 ? prev : new Set<string>()));
  }, [setExpandedSet]);
  const expandedIds = React.useMemo(() => [...expandedSet], [expandedSet]);

  const setMode = React.useCallback((m: LineItemsMode) => setModeState(m), []);
  const setFilter = React.useCallback((q: string) => setFilterState(q), []);

  return {
    lines,
    allLines,
    fields,
    mode,
    ordering,
    isDirty: !changeSet.isEmpty,
    hasUnsavedChanges,
    errors,
    getCellError,
    filter,
    selectionEnabled: selection,
    selectedIds,
    selectedRows,
    selectionActions,
    pendingActionId,
    runSelectionAction,
    sortState: ordering === "sort" ? sortState : null,
    rowExpansion,
    expandedIds,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,

    getLineKey,
    isNewLine,
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

export function newLineKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `line-${Math.random().toString(36).slice(2, 11)}`;
}

/** Whether `line` carries a saved id in `idKey`. */
function hasId<T extends LineItemsRowData>(line: T, idKey: keyof T & string): boolean {
  const id = line[idKey];
  return id !== undefined && id !== null && id !== "";
}

function isLineArray<T extends LineItemsRowData>(
  saved: LineItemsResetInput<T>,
): saved is readonly T[] {
  return Array.isArray(saved);
}

/**
 * Splices `keys` into `order`: appended when `after` is `undefined`, prepended
 * when `null`, otherwise placed directly after that key.
 */
function insertAfter(
  order: readonly string[],
  keys: readonly string[],
  after: string | null | undefined,
): string[] {
  const next = [...order];
  if (after === undefined) {
    next.push(...keys);
  } else if (after === null) {
    next.unshift(...keys);
  } else {
    const at = next.indexOf(after);
    if (at === -1) next.push(...keys);
    else next.splice(at + 1, 0, ...keys);
  }
  return next;
}

/**
 * Keys incoming lines and builds a fresh baseline from them. A line with an
 * id is saved and keyed by it; a line without one is new — it keeps the temp
 * key it already carries (a parent echoing our own lines back) or gets one,
 * and starts out as an insert, outside the baseline.
 */
function seedLines<T extends LineItemsRowData>(
  input: readonly T[],
  idKey: keyof T & string,
): { rows: RowState<T>; dirty: DirtyState<T> } {
  const byKey: Record<string, T> = {};
  const order: string[] = [];
  const inserted = new Set<string>();
  for (const line of input) {
    const saved = hasId(line, idKey);
    let key = saved ? String(line[idKey]) : (readLineKey(line) ?? newLineKey());
    if (byKey[key]) {
      console.warn(`[LineItems] Two lines share the key "${key}"; the second gets a new key.`);
      key = newLineKey();
    }
    byKey[key] = withLineKey(line, key);
    order.push(key);
    if (!saved) inserted.add(key);
  }
  return {
    rows: { byKey, order },
    dirty: {
      baseline: cloneBaseline<T>(
        order.filter((key) => !inserted.has(key)),
        byKey,
      ),
      inserted,
      removed: new Set<string>(),
    },
  };
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((key) => set.has(key));
}
