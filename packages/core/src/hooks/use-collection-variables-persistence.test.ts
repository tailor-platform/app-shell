import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CollectionSnapshot, CollectionStatePersistence } from "@/types/collection";
import { useCollectionVariables } from "./use-collection-variables";

describe("useCollectionVariables with persistence", () => {
  function createMockPersistence(initial?: CollectionSnapshot) {
    return {
      read: vi.fn(() => initial),
      write: vi.fn(),
    } satisfies CollectionStatePersistence;
  }

  describe("read (initial hydration)", () => {
    it("uses persistence initial state over params defaults", () => {
      const persistence = createMockPersistence({
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
        sort: [{ field: "name", direction: "Asc" }],
        pageSize: 50,
      });

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          persistence,
        }),
      );

      expect(persistence.read).toHaveBeenCalledOnce();
      expect(result.current.control.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
      expect(result.current.control.pageSize).toBe(50);
    });

    it("falls back to params when persistence returns undefined", () => {
      const persistence = createMockPersistence(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            pageSize: 30,
            initialSort: [{ field: "createdAt", direction: "Desc" }],
          },
          persistence,
        }),
      );

      expect(result.current.control.pageSize).toBe(30);
      expect(result.current.control.sortStates).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
      expect(result.current.control.filters).toEqual([]);
    });

    it("partially overrides params (only pageSize from persistence)", () => {
      const persistence = createMockPersistence({
        pageSize: 100,
      });

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: {
            pageSize: 20,
            initialSort: [{ field: "name", direction: "Asc" }],
          },
          persistence,
        }),
      );

      expect(result.current.control.pageSize).toBe(100);
      // Sort remains from params since persistence didn't provide it
      expect(result.current.control.sortStates).toEqual([{ field: "name", direction: "Asc" }]);
    });
  });

  describe("write (state persistence)", () => {
    it("does not call write on initial mount (skip first write)", () => {
      const persistence = createMockPersistence({
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
        pageSize: 50,
      });

      renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          persistence,
        }),
      );

      expect(persistence.write).not.toHaveBeenCalled();
    });

    it("calls write on filter change", () => {
      const persistence = createMockPersistence(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          persistence,
        }),
      );

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(persistence.write).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
          pageSize: 20,
        }),
      );
    });

    it("calls write on sort change", () => {
      const persistence = createMockPersistence(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          persistence,
        }),
      );

      act(() => {
        result.current.control.setSort("name", "Desc");
      });

      expect(persistence.write).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ field: "name", direction: "Desc" }],
          pageSize: 20,
        }),
      );
    });

    it("calls write on pageSize change", () => {
      const persistence = createMockPersistence(undefined);

      const { result } = renderHook(() =>
        useCollectionVariables({
          params: { pageSize: 20 },
          persistence,
        }),
      );

      act(() => {
        result.current.control.setPageSize(50);
      });

      expect(persistence.write).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 50,
        }),
      );
    });

    it("does not crash when no persistence is provided", () => {
      const { result } = renderHook(() => useCollectionVariables({ params: { pageSize: 20 } }));

      act(() => {
        result.current.control.addFilter("status", "eq", "ACTIVE");
      });

      expect(result.current.control.filters).toHaveLength(1);
    });
  });
});
