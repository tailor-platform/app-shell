// Load the AppShell context first: it breaks an import cycle through
// `@/hooks/i18n` that otherwise leaves `defineI18nLabels` undefined at load.
import "@/contexts/appshell-context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { Filter } from "@/types/collection";
import { useSavedFilters } from "./use-saved-filters";
import type { SavedFilter, SavedFilterStorage } from "./types";

const KEY = "as:filter-rail-saved:v1:products";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// 🧪 Dummy Data: sample rail filters
const electronics: Filter[] = [{ field: "category", operator: "in", value: ["Electronics"] }];
const active: Filter[] = [{ field: "status", operator: "eq", value: "Active" }];

const memoryStore = (initial: SavedFilter[] = []) => {
  let stored = initial;
  const storage: SavedFilterStorage = {
    load: vi.fn(() => stored),
    save: vi.fn((items: SavedFilter[]) => {
      stored = items;
    }),
  };
  return { storage, read: () => stored };
};

describe("useSavedFilters", () => {
  it("starts empty and finishes loading from localStorage", async () => {
    const { result } = renderHook(() => useSavedFilters("products"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("saves to localStorage under its key and reads it back", async () => {
    const first = renderHook(() => useSavedFilters("products"));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    act(() => first.result.current.save("Electronics", electronics));
    expect(first.result.current.items).toHaveLength(1);
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(KEY) ?? "[]")[0]?.name).toBe("Electronics"),
    );

    const second = renderHook(() => useSavedFilters("products"));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.items[0]!.filters).toEqual(electronics);
  });

  it("replaces an existing name (case-insensitive) instead of adding a duplicate", async () => {
    const { storage } = memoryStore();
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.save("Weekly", electronics));
    const id = result.current.items[0]!.id;
    act(() => result.current.save("weekly", active));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.id).toBe(id);
    expect(result.current.items[0]!.filters).toEqual(active);
  });

  it("ignores an empty name", async () => {
    const { storage } = memoryStore();
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.save("   ", electronics));
    expect(result.current.items).toEqual([]);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("composes two saves in one tick", async () => {
    const { storage, read } = memoryStore();
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.save("A", electronics);
      result.current.save("B", active);
    });
    expect(result.current.items.map((item) => item.name)).toEqual(["A", "B"]);
    await waitFor(() => expect(read()).toHaveLength(2));
  });

  it("removes by id", async () => {
    const { storage } = memoryStore([
      { id: "a", name: "A", filters: electronics, createdAt: "2026-10-15T00:00:00.000Z" },
      { id: "b", name: "B", filters: active, createdAt: "2026-10-15T00:00:00.000Z" },
    ]);
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.remove("a"));
    expect(result.current.items.map((item) => item.id)).toEqual(["b"]);
  });

  it("loads from an async store, showing loading until it resolves", async () => {
    let resolve: ((items: SavedFilter[]) => void) | undefined;
    const load = vi.fn(() => new Promise<SavedFilter[]>((done) => (resolve = done)));
    const storage: SavedFilterStorage = {
      load,
      save: vi.fn(async () => {}),
    };
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalled());
    await act(async () =>
      resolve?.([{ id: "a", name: "A", filters: electronics, createdAt: "x" }]),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.items[0]!.name).toBe("A");
  });

  it("reports a failed load and a failed save in `error`", async () => {
    const storage: SavedFilterStorage = {
      load: async () => {
        throw new Error("offline");
      },
      save: async () => {
        throw new Error("denied");
      },
    };
    const { result } = renderHook(() => useSavedFilters("products", { storage }));
    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    expect(result.current.loading).toBe(false);
    act(() => result.current.save("A", electronics));
    // Optimistic: the item shows at once, the failure is reported.
    expect(result.current.items).toHaveLength(1);
    await waitFor(() => expect(result.current.error?.message).toBe("denied"));
  });

  it("drops malformed stored entries and survives invalid JSON", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([{ nope: true }, { id: "a", name: "A", filters: [] }]),
    );
    const { result } = renderHook(() => useSavedFilters("products"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((item) => item.id)).toEqual(["a"]);

    window.localStorage.setItem(KEY, "{not json");
    const broken = renderHook(() => useSavedFilters("products"));
    await waitFor(() => expect(broken.result.current.loading).toBe(false));
    expect(broken.result.current.items).toEqual([]);
  });

  it("reloads when the storage key changes", async () => {
    window.localStorage.setItem(
      "as:filter-rail-saved:v1:orders",
      JSON.stringify([{ id: "o", name: "Orders", filters: [], createdAt: "x" }]),
    );
    const { result, rerender } = renderHook(({ key }) => useSavedFilters(key), {
      initialProps: { key: "products" },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    rerender({ key: "orders" });
    await waitFor(() => expect(result.current.items[0]?.name).toBe("Orders"));
  });
});
