import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CollectionSnapshot, CollectionStateSynchronizer } from "@/types/collection";
import { useCollectionVariables } from "./use-collection-variables";

describe("useCollectionVariables with synchronizer", () => {
  function createMockSynchronizer(initial?: CollectionSnapshot) {
    const subscribers: Array<(snapshot: CollectionSnapshot | undefined) => void> = [];
    return {
      subscribe: vi.fn((onChange) => {
        subscribers.push(onChange);
        // BehaviorSubject: emit immediately
        onChange(initial);
        return () => {
          const idx = subscribers.indexOf(onChange);
          if (idx >= 0) subscribers.splice(idx, 1);
        };
      }),
      write: vi.fn(),
      // Test helper to simulate external change
      emit(snapshot: CollectionSnapshot | undefined) {
        for (const cb of subscribers) cb(snapshot);
      },
    } satisfies CollectionStateSynchronizer & {
      emit: (s: CollectionSnapshot | undefined) => void;
    };
  }

  describe("subscribe (initial hydration)", () => {
    it("uses synchronizer initial state over params defaults", () => {
      const synchronizer = createMockSynchronizer({
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
        sort: [{ field: "name", direction: "Asc" }],
        pageSize: 50,
      });

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      expect(synchronizer.subscribe).toHaveBeenCalledOnce();
      expect(result.current.control.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
      expect(result.current.control.pageSize).toBe(50);
    });

    it("falls back to params when synchronizer emits undefined", () => {
      const synchronizer = createMockSynchronizer(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            pageSize: 30,
            initialSort: [{ field: "createdAt", direction: "Desc" }],
          },
          synchronizer,
        }),
      );

      expect(result.current.control.pageSize).toBe(30);
      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
      expect(result.current.control.filters).toEqual([]);
    });

    it("partially overrides params (only pageSize from synchronizer)", () => {
      const synchronizer = createMockSynchronizer({
        pageSize: 100,
      });

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            pageSize: 20,
            initialSort: [{ field: "name", direction: "Asc" }],
          },
          synchronizer,
        }),
      );

      expect(result.current.control.pageSize).toBe(100);
      // Sort remains from params since synchronizer didn't provide it
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
    });
  });

  describe("subscribe (external changes)", () => {
    it("updates state when synchronizer emits external change", () => {
      const synchronizer = createMockSynchronizer(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      act(() => {
        synchronizer.emit({
          filters: [{ field: "name", operator: "contains", value: "test" }],
          pageSize: 50,
        });
      });

      expect(result.current.control.filters).toEqual([
        { field: "name", operator: "contains", value: "test" },
      ]);
      expect(result.current.control.pageSize).toBe(50);
    });
  });

  describe("write (state persistence)", () => {
    it("does not call write on initial mount (skip first write)", () => {
      const synchronizer = createMockSynchronizer({
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
        pageSize: 50,
      });

      renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      expect(synchronizer.write).not.toHaveBeenCalled();
    });

    it("calls write on filter change", () => {
      const synchronizer = createMockSynchronizer(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(synchronizer.write).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
          pageSize: 20,
        }),
      );
    });

    it("calls write on sort change", () => {
      const synchronizer = createMockSynchronizer(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      act(() => {
        result.current.control.setSort("name", "Desc");
      });

      expect(synchronizer.write).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ field: "name", direction: "Desc" }],
          pageSize: 20,
        }),
      );
    });

    it("calls write on pageSize change", () => {
      const synchronizer = createMockSynchronizer(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          synchronizer,
        }),
      );

      act(() => {
        result.current.control.setPageSize(50);
      });

      expect(synchronizer.write).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 50,
        }),
      );
    });

    it("does not crash when no synchronizer is provided", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 20 } }));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(result.current.control.filters).toHaveLength(1);
    });
  });
});
