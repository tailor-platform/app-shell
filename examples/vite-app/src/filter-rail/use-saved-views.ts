// ✅ Reusable Component: capture / restore / persist a DataTable "view".
//
// Nothing here needs an app-shell change. A view is a bundle of state the table
// already exposes, and every field is readable and writable through the
// existing `useDataTable` return value and `CollectionControl` — see the table
// in `types.ts`. What app-shell does *not* provide is the bundle, the name, the
// list, or the storage, which is exactly what this file is.
//
// Storage sits behind a tiny interface on purpose. This ships a localStorage
// implementation — private to one person, one browser — but a backend-backed
// store, shared with the team and carrying a default view for everyone's first
// visit, drops in without touching the capture/apply logic below.

import { useCallback, useMemo, useState } from "react";
import type { Filter, UseDataTableReturn } from "@tailor-platform/app-shell";
import type { SavedView, SavedViewBinding, ViewState } from "./types";

// ─── Capture ─────────────────────────────────────────────────────────────────

/** Read the table's current state into a saveable bundle. */
export function captureView(
  table: UseDataTableReturn<never>,
  allColumnIds: readonly string[],
): ViewState {
  return {
    filters: table.control?.filters ?? [],
    sort: table.sortStates,
    pageSize: table.pageSize,
    columnOrder: table.columnOrder,
    hidden: allColumnIds.filter((id) => !table.isColumnVisible(id)),
    pinned: Object.fromEntries(allColumnIds.map((id) => [id, table.pinnedColumns[id] ?? "none"])),
  };
}

// ─── Apply ───────────────────────────────────────────────────────────────────

/**
 * Put the table into `state`.
 *
 * Order matters here, and getting it wrong produces a view that *looks* like it
 * restored and quietly did not:
 *
 * - **Sort is cleared before it is re-applied**, and applied in sequence, so a
 *   multi-sort's primary key stays primary rather than ending up last.
 * - **Column order is filtered to columns that still exist**, with anything new
 *   appended. A saved order naming a column the screen no longer has would
 *   otherwise drop real columns out of the order array.
 * - **Visibility is toggled only where it differs.** `toggleColumn` is a flip,
 *   not a setter — calling it unconditionally inverts every column.
 * - **`resetPage()`** because page 7 of the old result set is meaningless
 *   against the new one.
 */
export function applyView(
  table: UseDataTableReturn<never>,
  allColumnIds: readonly string[],
  state: ViewState,
): void {
  const control = table.control;
  if (control) {
    control.setFilters(state.filters as Filter[]);
    control.clearSort();
    for (const sort of state.sort) control.setSort(sort.field, sort.direction);
    control.setPageSize(state.pageSize);
    control.resetPage();
  }

  const order = state.columnOrder.filter((id) => allColumnIds.includes(id));
  const missing = allColumnIds.filter((id) => !order.includes(id));
  table.setColumnOrder([...order, ...missing]);

  for (const id of allColumnIds) {
    const shouldBeHidden = state.hidden.includes(id);
    if (table.isColumnVisible(id) === shouldBeHidden) table.toggleColumn(id);
  }

  for (const id of allColumnIds) {
    table.setPin(id, state.pinned[id] ?? "none");
  }
}

// ─── Compare & describe ──────────────────────────────────────────────────────

/**
 * Normalised so that key order, filter order and "none" pins do not produce a
 * false "modified" — which would leave the Save button permanently showing.
 */
const normalise = (state: ViewState): string =>
  JSON.stringify({
    filters: [...state.filters]
      .map((f) => ({
        field: f.field,
        operator: f.operator,
        // An `in` array is a set: ["A","B"] and ["B","A"] are one filter.
        value: Array.isArray(f.value) ? [...f.value].map(String).sort() : f.value,
      }))
      .sort((x, y) => `${x.field}:${x.operator}`.localeCompare(`${y.field}:${y.operator}`)),
    sort: state.sort.map((s) => ({ field: s.field, direction: s.direction })),
    pageSize: state.pageSize,
    columnOrder: state.columnOrder,
    hidden: [...state.hidden].sort(),
    pinned: Object.fromEntries(
      Object.entries(state.pinned)
        .filter(([, side]) => side !== "none")
        .sort(([x], [y]) => x.localeCompare(y)),
    ),
  });

export const isSameView = (a: ViewState, b: ViewState): boolean => normalise(a) === normalise(b);

/** "3 filters · sorted · 2 hidden · 25/page" */
export function describeView(state: ViewState): string {
  const parts: string[] = [];
  if (state.filters.length)
    parts.push(`${state.filters.length} filter${state.filters.length === 1 ? "" : "s"}`);
  if (state.sort.length) parts.push("sorted");
  if (state.hidden.length) parts.push(`${state.hidden.length} hidden`);
  const pinned = Object.values(state.pinned).filter((side) => side !== "none").length;
  if (pinned) parts.push(`${pinned} pinned`);
  parts.push(`${state.pageSize}/page`);
  return parts.join(" · ");
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const read = (key: string): SavedView[] => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    // Private windows and cleared site data both land here.
    return [];
  }
};

const write = (key: string, views: SavedView[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(views));
  } catch {
    // Storage disabled or full — the session keeps working in memory.
  }
};

// ─── The binding ─────────────────────────────────────────────────────────────

/**
 * Wires capture/apply/compare to localStorage and hands back the binding the
 * rail expects.
 *
 * Swap `read`/`write` for a GraphQL-backed store and views become team-shared
 * with no change to anything else — that is the whole point of the seam.
 */
export function useSavedViews(
  storageKey: string,
  table: UseDataTableReturn<never>,
  allColumnIds: readonly string[],
): SavedViewBinding {
  const [items, setItems] = useState<SavedView[]>(() => read(storageKey));

  const persist = useCallback(
    (next: SavedView[]) => {
      setItems(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  const current = captureView(table, allColumnIds);
  const active = items.find((view) => isSameView(view.state, current)) ?? null;

  const onSave = useCallback(
    (name: string) => {
      // Saving over an existing name replaces it. Two "Low stock" rows a user
      // cannot tell apart is worse than losing the older definition they were
      // plainly trying to update.
      const existing = items.find((v) => v.name.toLowerCase() === name.toLowerCase());
      const entry: SavedView = {
        id: existing?.id ?? `sv-${Date.now().toString(36)}`,
        name,
        createdAt: new Date().toISOString(),
        state: captureView(table, allColumnIds),
      };
      persist(existing ? items.map((v) => (v.id === existing.id ? entry : v)) : [...items, entry]);
    },
    [items, persist, table, allColumnIds],
  );

  const onApply = useCallback(
    (view: SavedView) => applyView(table, allColumnIds, view.state),
    [table, allColumnIds],
  );

  const onDelete = useCallback(
    (view: SavedView) => persist(items.filter((v) => v.id !== view.id)),
    [items, persist],
  );

  return useMemo(
    () => ({
      items,
      activeId: active?.id ?? null,
      // Nothing to save when the screen is untouched, and nothing to save when
      // it already *is* a saved view — so the button appears exactly when
      // pressing it would achieve something.
      dirty: active === null && normalise(current) !== normalise(EMPTY(current)),
      onSave,
      onApply,
      onDelete,
      describe: (view) => describeView(view.state),
    }),
    [items, active, current, onSave, onApply, onDelete],
  );
}

/** The same view with nothing chosen — the baseline "untouched" comparison. */
const EMPTY = (current: ViewState): ViewState => ({
  filters: [],
  sort: [],
  pageSize: current.pageSize,
  columnOrder: current.columnOrder,
  hidden: [],
  pinned: Object.fromEntries(Object.keys(current.pinned).map((id) => [id, "none" as const])),
});
