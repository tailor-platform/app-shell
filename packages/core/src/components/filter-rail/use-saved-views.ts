import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseDataTableReturn } from "../data-table/types";
import { useFilterRailT } from "./i18n";
import { readStorage, writeStorage } from "./storage";
import type { SavedView, SavedViewBinding, SavedViewStorage, ViewState } from "./types";

type AnyTable = UseDataTableReturn<Record<string, unknown>>;

const STORAGE_PREFIX = "as:saved-views:v1:";

// ─── Capture / apply ─────────────────────────────────────────────────────────

/** Read the table's current state into a saveable bundle. */
export function captureView(table: AnyTable): ViewState {
  return {
    filters: table.control?.filters ?? [],
    sort: table.control?.sortStates ?? table.sortStates,
    pageSize: table.pageSize,
    columnOrder: table.columnOrder,
    hidden: table.columnOrder.filter((key) => !table.isColumnVisible(key)),
    pinned: { ...table.pinnedColumns },
  };
}

/**
 * Put the table into `state`. Order matters:
 *
 * - Sort is cleared, then re-applied in sequence so a multi-sort keeps its primary key.
 * - Column order keeps only columns that still exist; new ones are appended.
 * - Visibility is toggled only where it differs — `toggleColumn` is a flip.
 * - Pins not in the view are reset to the column default.
 */
export function applyView(table: AnyTable, state: ViewState): void {
  const control = table.control;
  const keys = table.columnOrder;
  if (control) {
    control.setFilters(state.filters);
    control.clearSort();
    for (const sort of state.sort) control.setSort(sort.field, sort.direction);
    if (state.pageSize > 0) control.setPageSize(state.pageSize);
    control.resetPage();
  }

  const order = state.columnOrder.filter((key) => keys.includes(key));
  table.setColumnOrder([...order, ...keys.filter((key) => !order.includes(key))]);

  const hidden = new Set(state.hidden);
  for (const key of keys) {
    if (table.isColumnVisible(key) === hidden.has(key)) table.toggleColumn(key);
  }

  for (const key of keys) table.setPin(key, state.pinned[key] ?? null);
}

// ─── Compare ─────────────────────────────────────────────────────────────────

/** Key order, `in`-array order and "none" pins must not produce a false "modified". */
const normalise = (state: ViewState): string =>
  JSON.stringify({
    filters: [...state.filters]
      .map((filter) => ({
        field: filter.field,
        operator: filter.operator,
        value: Array.isArray(filter.value)
          ? [...filter.value].map(String).toSorted()
          : filter.value,
      }))
      .toSorted((a, b) => `${a.field}:${a.operator}`.localeCompare(`${b.field}:${b.operator}`)),
    sort: state.sort.map((sort) => ({ field: sort.field, direction: sort.direction })),
    pageSize: state.pageSize,
    columnOrder: state.columnOrder,
    hidden: [...state.hidden].toSorted(),
    pinned: Object.fromEntries(
      Object.entries(state.pinned)
        .filter(([, side]) => side !== "none")
        .toSorted(([a], [b]) => a.localeCompare(b)),
    ),
  });

export const isSameView = (a: ViewState, b: ViewState): boolean => normalise(a) === normalise(b);

/** The current layout with nothing chosen — "untouched". */
const untouched = (current: ViewState): ViewState => ({
  filters: [],
  sort: [],
  pageSize: current.pageSize,
  columnOrder: current.columnOrder,
  hidden: [],
  pinned: {},
});

// ─── Storage ─────────────────────────────────────────────────────────────────

const isSavedView = (value: unknown): value is SavedView => {
  if (!value || typeof value !== "object") return false;
  const view = value as Partial<SavedView>;
  return (
    typeof view.id === "string" &&
    typeof view.name === "string" &&
    !!view.state &&
    Array.isArray(view.state.filters)
  );
};

const localStorageFor = (key: string): SavedViewStorage => ({
  load: () => readStorage(key, (raw) => (Array.isArray(raw) ? raw.filter(isSavedView) : []), []),
  save: (views) => writeStorage(key, views),
});

// ─── Hook ────────────────────────────────────────────────────────────────────

export type UseSavedViewsOptions = {
  /** localStorage key suffix. Ignored when `storage` is given. */
  storageKey: string;
  /** Swap in a backend store to share views across a team or devices. */
  storage?: SavedViewStorage;
};

/**
 * Named, restorable views of a `DataTable` — filters **plus** sort, page size
 * and column order / visibility / pinning. Returns the binding
 * `FilterRail.SavedViews` renders.
 *
 * @example
 * ```tsx
 * const table = useDataTable({ columns, data, control });
 * const views = useSavedViews(table, { storageKey: "products" });
 * <FilterRail.SavedViews {...views} />
 * ```
 */
export function useSavedViews<TRow extends Record<string, unknown>>(
  table: UseDataTableReturn<TRow>,
  options: UseSavedViewsOptions,
): SavedViewBinding {
  const t = useFilterRailT();
  const anyTable = table as unknown as AnyTable;
  // Held in a ref so an inline `storage` object does not reload on every render.
  const storageRef = useRef<SavedViewStorage>(null as unknown as SavedViewStorage);
  storageRef.current = options.storage ?? localStorageFor(STORAGE_PREFIX + options.storageKey);
  const [items, setItems] = useState<SavedView[]>(() => storageRef.current.load());

  // Re-hydrate when the key changes (a different screen reusing the hook).
  useEffect(() => {
    setItems(storageRef.current.load());
  }, [options.storageKey]);

  const persist = useCallback((next: SavedView[]) => {
    setItems(next);
    storageRef.current.save(next);
  }, []);

  const current = captureView(anyTable);
  const currentKey = normalise(current);
  const active = items.find((view) => normalise(view.state) === currentKey) ?? null;
  const dirty = active === null && currentKey !== normalise(untouched(current));

  const onSave = useCallback(
    (name: string) => {
      // Saving over an existing name replaces it.
      const existing = items.find((view) => view.name.toLowerCase() === name.toLowerCase());
      const entry: SavedView = {
        id:
          existing?.id ??
          `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        createdAt: new Date().toISOString(),
        state: captureView(anyTable),
      };
      persist(
        existing
          ? items.map((view) => (view.id === existing.id ? entry : view))
          : [...items, entry],
      );
    },
    [items, persist, anyTable],
  );

  const onApply = useCallback((view: SavedView) => applyView(anyTable, view.state), [anyTable]);

  const onDelete = useCallback(
    (view: SavedView) => persist(items.filter((item) => item.id !== view.id)),
    [items, persist],
  );

  const describe = useCallback(
    (view: SavedView) => {
      const { state } = view;
      const parts: string[] = [];
      if (state.filters.length) parts.push(t("viewFilters", { count: state.filters.length }));
      if (state.sort.length) parts.push(t("viewSorted"));
      if (state.hidden.length) parts.push(t("viewHidden", { count: state.hidden.length }));
      const pinned = Object.values(state.pinned).filter((side) => side !== "none").length;
      if (pinned) parts.push(t("viewPinned", { count: pinned }));
      if (state.pageSize > 0) parts.push(t("viewPageSize", { count: state.pageSize }));
      return parts.join(" · ");
    },
    [t],
  );

  return useMemo(
    () => ({ items, activeId: active?.id ?? null, dirty, onSave, onApply, onDelete, describe }),
    [items, active, dirty, onSave, onApply, onDelete, describe],
  );
}
