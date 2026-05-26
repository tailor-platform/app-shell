import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CollectionStateSynchronizer } from "@/types/collection";
import { useCollectionVariables } from "./use-collection-variables";

describe("useCollectionVariables with synchronizer", () => {
  function createMockSynchronizer(initial?: ReturnType<CollectionStateSynchronizer["read"]>) {
    return {
      read: vi.fn(() => initial),
      write: vi.fn(),
    } satisfies CollectionStateSynchronizer;
  }

  describe("read (initial hydration)", () => {
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

      expect(synchronizer.read).toHaveBeenCalledOnce();
      expect(result.current.control.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
      expect(result.current.control.pageSize).toBe(50);
    });

    it("falls back to params when synchronizer returns undefined", () => {
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
      // Sort falls back to params
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
    });
  });

  describe("write (state persistence)", () => {
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

    it("does not call write when no synchronizer is provided", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 20 } }));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      // No error thrown — just verifying it doesn't crash
      expect(result.current.control.filters).toHaveLength(1);
    });
  });
});
