// Loaded first to break the pre-existing hooks/i18n ⇄ appshell-context import
// cycle, which otherwise leaves `defineI18nLabels` undefined when a test's
// first import is a module that pulls in `@/hooks/i18n` directly.
import "@/contexts/appshell-context";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { CollectionControl, Filter, SortState } from "@/types/collection";
import type { UseDataTableReturn } from "../data-table/types";
import { applyView, captureView, isSameView, useSavedViews } from "./use-saved-views";
import type { SavedView, SavedViewStorage, ViewState } from "./types";

type AnyTable = UseDataTableReturn<Record<string, unknown>>;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// ─── Fake table ──────────────────────────────────────────────────────────────

type TableState = {
  filters: Filter[];
  sort: SortState[];
  pageSize: number;
  columnOrder: string[];
  hidden: string[];
  pinned: Record<string, "left" | "right" | "none">;
};

// 🧪 Dummy Data: a three-column table in its default state
const defaultState = (): TableState => ({
  filters: [],
  sort: [],
  pageSize: 20,
  columnOrder: ["sku", "name", "price"],
  hidden: [],
  pinned: {},
});

/** A `UseDataTableReturn` stand-in: only what capture / apply touch, as spies. */
function fakeTable(state: TableState, log: string[] = []) {
  const control = {
    filters: state.filters,
    sortStates: state.sort,
    pageSize: state.pageSize,
    setFilters: vi.fn((next: Filter[]) => log.push(`setFilters:${next.length}`)),
    clearSort: vi.fn(() => log.push("clearSort")),
    setSort: vi.fn((field: string, direction?: string) =>
      log.push(`setSort:${field}:${direction}`),
    ),
    setPageSize: vi.fn((size: number) => log.push(`setPageSize:${size}`)),
    resetPage: vi.fn(() => log.push("resetPage")),
  };
  const table = {
    control: control as unknown as CollectionControl,
    sortStates: state.sort,
    pageSize: state.pageSize,
    columnOrder: state.columnOrder,
    pinnedColumns: state.pinned,
    isColumnVisible: vi.fn((key: string) => !state.hidden.includes(key)),
    toggleColumn: vi.fn((key: string) => log.push(`toggleColumn:${key}`)),
    setColumnOrder: vi.fn((keys: string[]) => log.push(`setColumnOrder:${keys.join(",")}`)),
    setPin: vi.fn((key: string, side: string | null) => log.push(`setPin:${key}:${side}`)),
  };
  return { table: table as unknown as AnyTable, control, raw: table };
}

const viewState = (overrides: Partial<ViewState> = {}): ViewState => ({
  filters: [],
  sort: [],
  pageSize: 20,
  columnOrder: ["sku", "name", "price"],
  hidden: [],
  pinned: {},
  ...overrides,
});

// ─── captureView ─────────────────────────────────────────────────────────────

describe("captureView", () => {
  it("reads filters, sort, page size and column layout", () => {
    const { table } = fakeTable({
      filters: [{ field: "category", operator: "in", value: ["apparel"] }],
      sort: [{ field: "price", direction: "Desc" }],
      pageSize: 50,
      columnOrder: ["name", "sku", "price"],
      hidden: ["price"],
      pinned: { sku: "left" },
    });
    expect(captureView(table)).toEqual({
      filters: [{ field: "category", operator: "in", value: ["apparel"] }],
      sort: [{ field: "price", direction: "Desc" }],
      pageSize: 50,
      columnOrder: ["name", "sku", "price"],
      hidden: ["price"],
      pinned: { sku: "left" },
    });
  });

  it("falls back to the table's sortStates without a control", () => {
    const { table, raw } = fakeTable({
      ...defaultState(),
      sort: [{ field: "sku", direction: "Asc" }],
    });
    (raw as { control: unknown }).control = undefined;
    const view = captureView(table);
    expect(view.filters).toEqual([]);
    expect(view.sort).toEqual([{ field: "sku", direction: "Asc" }]);
  });
});

// ─── applyView ───────────────────────────────────────────────────────────────

describe("applyView", () => {
  it("clears sort before re-applying it in sequence", () => {
    const log: string[] = [];
    const { table } = fakeTable(defaultState(), log);
    applyView(
      table,
      viewState({
        filters: [{ field: "category", operator: "in", value: ["apparel"] }],
        sort: [
          { field: "price", direction: "Desc" },
          { field: "name", direction: "Asc" },
        ],
        pageSize: 50,
      }),
    );
    const controlCalls = log.filter((entry) =>
      /^(setFilters|clearSort|setSort|setPageSize|resetPage)/.test(entry),
    );
    expect(controlCalls).toEqual([
      "setFilters:1",
      "clearSort",
      "setSort:price:Desc",
      "setSort:name:Asc",
      "setPageSize:50",
      "resetPage",
    ]);
  });

  it("skips setPageSize for a zero page size", () => {
    const { table, control } = fakeTable(defaultState());
    applyView(table, viewState({ pageSize: 0 }));
    expect(control.setPageSize).not.toHaveBeenCalled();
  });

  it("keeps only existing columns in order and appends new ones", () => {
    const { table, raw } = fakeTable(defaultState());
    applyView(table, viewState({ columnOrder: ["price", "gone", "sku"] }));
    expect(raw.setColumnOrder).toHaveBeenCalledWith(["price", "sku", "name"]);
  });

  it("toggles only columns whose visibility differs", () => {
    const { table, raw } = fakeTable({ ...defaultState(), hidden: ["name"] });
    applyView(table, viewState({ hidden: ["price", "name"] }));
    expect(raw.toggleColumn).toHaveBeenCalledTimes(1);
    expect(raw.toggleColumn).toHaveBeenCalledWith("price");

    const second = fakeTable({ ...defaultState(), hidden: ["name"] });
    applyView(second.table, viewState({ hidden: [] }));
    expect(second.raw.toggleColumn).toHaveBeenCalledTimes(1);
    expect(second.raw.toggleColumn).toHaveBeenCalledWith("name");
  });

  it("resets pins not in the view with null", () => {
    const { table, raw } = fakeTable({ ...defaultState(), pinned: { name: "right" } });
    applyView(table, viewState({ pinned: { sku: "left" } }));
    expect(raw.setPin).toHaveBeenCalledWith("sku", "left");
    expect(raw.setPin).toHaveBeenCalledWith("name", null);
    expect(raw.setPin).toHaveBeenCalledWith("price", null);
  });
});

// ─── isSameView ──────────────────────────────────────────────────────────────

describe("isSameView", () => {
  it("ignores filter order, in-array order, hidden order and none pins", () => {
    const a = viewState({
      filters: [
        { field: "color", operator: "in", value: ["red", "blue"] },
        { field: "category", operator: "eq", value: "shoes" },
      ],
      hidden: ["price", "name"],
      pinned: { sku: "left", name: "none" },
    });
    const b = viewState({
      filters: [
        { field: "category", operator: "eq", value: "shoes" },
        { field: "color", operator: "in", value: ["blue", "red"] },
      ],
      hidden: ["name", "price"],
      pinned: { sku: "left" },
    });
    expect(isSameView(a, b)).toBe(true);
  });

  it("detects a real difference", () => {
    expect(isSameView(viewState(), viewState({ pageSize: 50 }))).toBe(false);
    expect(isSameView(viewState(), viewState({ sort: [{ field: "sku", direction: "Asc" }] }))).toBe(
      false,
    );
    expect(isSameView(viewState(), viewState({ columnOrder: ["name", "sku", "price"] }))).toBe(
      false,
    );
  });
});

// ─── useSavedViews ───────────────────────────────────────────────────────────

const memoryStorage = (initial: SavedView[] = []) => {
  let views = initial;
  const storage: SavedViewStorage = {
    load: vi.fn(() => views),
    save: vi.fn((next: SavedView[]) => {
      views = next;
    }),
  };
  return { storage, read: () => views };
};

describe("useSavedViews", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const renderViews = (state: TableState, storage?: SavedViewStorage) =>
    renderHook(
      ({ table }: { table: AnyTable }) =>
        useSavedViews(table, { storageKey: "products", ...(storage ? { storage } : {}) }),
      { initialProps: { table: fakeTable(state).table } },
    );

  it("is not dirty when the table is untouched", () => {
    const { storage } = memoryStorage();
    const { result } = renderViews(defaultState(), storage);
    expect(result.current.items).toEqual([]);
    expect(result.current.dirty).toBe(false);
    expect(result.current.activeId).toBeNull();
  });

  it("is dirty once a filter is applied, and onSave adds a view that becomes active", () => {
    const { storage, read } = memoryStorage();
    const state = {
      ...defaultState(),
      filters: [{ field: "category", operator: "in", value: ["apparel"] }] as Filter[],
    };
    const { result } = renderViews(state, storage);
    expect(result.current.dirty).toBe(true);

    act(() => result.current.onSave("Apparel"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({
      name: "Apparel",
      state: { filters: state.filters },
    });
    expect(read()).toHaveLength(1);
    expect(result.current.activeId).toBe(result.current.items[0]!.id);
    expect(result.current.dirty).toBe(false);
    expect(result.current.describe?.(result.current.items[0]!)).toBe("1 filter · 20/page");
  });

  it("saving under an existing name (any case) replaces it", () => {
    const { storage } = memoryStorage();
    const { result, rerender } = renderViews({ ...defaultState(), pageSize: 50 }, storage);
    act(() => result.current.onSave("Wide"));
    const firstId = result.current.items[0]!.id;

    rerender({ table: fakeTable({ ...defaultState(), pageSize: 100 }).table });
    act(() => result.current.onSave("wide"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.id).toBe(firstId);
    expect(result.current.items[0]!.name).toBe("wide");
    expect(result.current.items[0]!.state.pageSize).toBe(100);
  });

  it("activeId follows the table state", () => {
    const saved: SavedView = {
      id: "v1",
      name: "Hidden price",
      createdAt: "2026-09-30T00:00:00.000Z",
      state: viewState({ hidden: ["price"] }),
    };
    const { storage } = memoryStorage([saved]);
    const { result, rerender } = renderViews(defaultState(), storage);
    expect(result.current.activeId).toBeNull();

    rerender({ table: fakeTable({ ...defaultState(), hidden: ["price"] }).table });
    expect(result.current.activeId).toBe("v1");
    expect(result.current.dirty).toBe(false);
  });

  it("onDelete removes a view", () => {
    const saved: SavedView = {
      id: "v1",
      name: "One",
      createdAt: "2026-09-30T00:00:00.000Z",
      state: viewState({ pageSize: 50 }),
    };
    const { storage, read } = memoryStorage([saved]);
    const { result } = renderViews(defaultState(), storage);
    act(() => result.current.onDelete(saved));
    expect(result.current.items).toEqual([]);
    expect(read()).toEqual([]);
  });

  it("onApply applies the view to the table", () => {
    const { storage } = memoryStorage();
    const fake = fakeTable(defaultState());
    const { result } = renderHook(() =>
      useSavedViews(fake.table, { storageKey: "products", storage }),
    );
    act(() =>
      result.current.onApply({
        id: "v1",
        name: "Sorted",
        createdAt: "2026-09-30T00:00:00.000Z",
        state: viewState({ sort: [{ field: "sku", direction: "Asc" }] }),
      }),
    );
    expect(fake.control.clearSort).toHaveBeenCalled();
    expect(fake.control.setSort).toHaveBeenCalledWith("sku", "Asc");
  });

  it("persists to localStorage under as:saved-views:v1:<storageKey> by default", () => {
    const { result } = renderViews({ ...defaultState(), pageSize: 50 });
    act(() => result.current.onSave("Fifty"));
    const raw = window.localStorage.getItem("as:saved-views:v1:products");
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!) as SavedView[];
    expect(stored).toHaveLength(1);
    expect(stored[0]!.name).toBe("Fifty");

    // A fresh hook reads it back.
    const second = renderViews({ ...defaultState(), pageSize: 50 });
    expect(second.result.current.items).toHaveLength(1);
    expect(second.result.current.activeId).toBe(stored[0]!.id);
  });

  it("drops malformed entries from localStorage", () => {
    window.localStorage.setItem(
      "as:saved-views:v1:products",
      JSON.stringify([{ id: 1 }, { id: "ok", name: "Ok", createdAt: "", state: viewState() }]),
    );
    const { result } = renderViews(defaultState());
    expect(result.current.items.map((item) => item.id)).toEqual(["ok"]);
  });

  it("survives invalid JSON in localStorage", () => {
    window.localStorage.setItem("as:saved-views:v1:products", "{not json");
    const { result } = renderViews(defaultState());
    expect(result.current.items).toEqual([]);
  });
});
