import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { useSearchParamsSynchronizer } from "./use-search-params-synchronizer";

function createWrapper(initialEntries: string[] = ["/"]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe("useSearchParamsSynchronizer", () => {
  // ---------------------------------------------------------------------------
  // read()
  // ---------------------------------------------------------------------------
  describe("read", () => {
    it("returns undefined when no search params exist", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      expect(result.current.read()).toBeUndefined();
    });

    it("reads pageSize from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=50"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.pageSize).toBe(50);
    });

    it("reads sort from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?s=name:asc"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.sort).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("reads sort desc from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?s=createdAt:desc"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.sort).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("reads single-value filter from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status:eq=ACTIVE"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([{ field: "status", operator: "eq", value: "ACTIVE" }]);
    });

    it("reads multi-value filter from URL (repeated params)", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status:in=ACTIVE&f.status:in=PENDING"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([
        { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
      ]);
    });

    it("reads JSON object filter value (e.g. between)", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper([
          `/?f.amount:between=${encodeURIComponent(JSON.stringify({ min: 10, max: 100 }))}`,
        ]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 10, max: 100 } },
      ]);
    });

    it("reads all state together", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=25&s=name:desc&f.status:eq=ACTIVE"]),
      });

      const snapshot = result.current.read();
      expect(snapshot).toEqual({
        pageSize: 25,
        sort: [{ field: "name", direction: "Desc" }],
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
      });
    });

    it("respects prefix option", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer({ prefix: "t1" }), {
        wrapper: createWrapper(["/?t1.p=30&p=10"]),
      });

      const snapshot = result.current.read();
      expect(snapshot?.pageSize).toBe(30);
    });

    it("ignores invalid pageSize values", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=abc"]),
      });

      expect(result.current.read()).toBeUndefined();
    });

    it("ignores filter keys without operator", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status=ACTIVE"]),
      });

      expect(result.current.read()).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // write()
  // ---------------------------------------------------------------------------
  describe("write", () => {
    it("writes pageSize to URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      const snapshot = result.current.read();
      expect(snapshot?.pageSize).toBe(50);
    });

    it("writes sort to URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({
          filters: [],
          sort: [{ field: "name", direction: "Desc" }],
          pageSize: 20,
        });
      });

      const snapshot = result.current.read();
      expect(snapshot?.sort).toEqual([{ field: "name", direction: "Desc" }]);
    });

    it("writes single-value filter to URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
          sort: [],
          pageSize: 20,
        });
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([{ field: "status", operator: "eq", value: "ACTIVE" }]);
    });

    it("writes multi-value filter as repeated params", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "in", value: ["A", "B", "C"] }],
          sort: [],
          pageSize: 20,
        });
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([
        { field: "status", operator: "in", value: ["A", "B", "C"] },
      ]);
    });

    it("writes object filter value as JSON", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({
          filters: [{ field: "amount", operator: "between", value: { min: 1, max: 99 } }],
          sort: [],
          pageSize: 20,
        });
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 1, max: 99 } },
      ]);
    });

    it("clears old filters when writing new state", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status:eq=OLD"]),
      });

      act(() => {
        result.current.write({
          filters: [{ field: "name", operator: "contains", value: "test" }],
          sort: [],
          pageSize: 20,
        });
      });

      const snapshot = result.current.read();
      expect(snapshot?.filters).toEqual([{ field: "name", operator: "contains", value: "test" }]);
    });

    it("uses prefix when writing", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer({ prefix: "t1" }), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 40 });
      });

      const snapshot = result.current.read();
      expect(snapshot?.pageSize).toBe(40);
    });
  });

  // ---------------------------------------------------------------------------
  // debounce
  // ---------------------------------------------------------------------------
  describe("debounce", () => {
    it("debounces write when debounceMs is set", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSearchParamsSynchronizer({ debounceMs: 100 }), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      // Not yet written
      expect(result.current.read()).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now written
      expect(result.current.read()?.pageSize).toBe(50);

      vi.useRealTimers();
    });

    it("only applies the last write within debounce window", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSearchParamsSynchronizer({ debounceMs: 100 }), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 10 });
        result.current.write({ filters: [], sort: [], pageSize: 30 });
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.read()?.pageSize).toBe(50);

      vi.useRealTimers();
    });
  });
});
