import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import type { CollectionSnapshot } from "@/types/collection";
import { useSearchParamsSynchronizer } from "./use-search-params-synchronizer";

function createWrapper(initialEntries: string[] = ["/"]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

/** Helper: subscribe and capture the immediately-emitted snapshot */
function getInitialSnapshot(result: { current: ReturnType<typeof useSearchParamsSynchronizer> }) {
  let snapshot: CollectionSnapshot | undefined;
  act(() => {
    const unsub = result.current.subscribe((s) => {
      snapshot = s;
    });
    unsub();
  });
  return snapshot;
}

describe("useSearchParamsSynchronizer", () => {
  // ---------------------------------------------------------------------------
  // subscribe (initial emit)
  // ---------------------------------------------------------------------------
  describe("subscribe (initial emit)", () => {
    it("emits undefined when no search params exist", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      expect(getInitialSnapshot(result)).toBeUndefined();
    });

    it("emits pageSize from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=50"]),
      });

      expect(getInitialSnapshot(result)?.pageSize).toBe(50);
    });

    it("emits sort from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?s=name:asc"]),
      });

      expect(getInitialSnapshot(result)?.sort).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("emits sort desc from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?s=createdAt:desc"]),
      });

      expect(getInitialSnapshot(result)?.sort).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("emits single-value filter from URL", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status:eq=ACTIVE"]),
      });

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("emits multi-value filter from URL (repeated params)", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status:in=ACTIVE&f.status:in=PENDING"]),
      });

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
      ]);
    });

    it("emits JSON object filter value (e.g. between)", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper([
          `/?f.amount:between=${encodeURIComponent(JSON.stringify({ min: 10, max: 100 }))}`,
        ]),
      });

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 10, max: 100 } },
      ]);
    });

    it("emits all state together", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=25&s=name:desc&f.status:eq=ACTIVE"]),
      });

      expect(getInitialSnapshot(result)).toEqual({
        pageSize: 25,
        sort: [{ field: "name", direction: "Desc" }],
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
      });
    });

    it("respects prefix option", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer({ prefix: "t1" }), {
        wrapper: createWrapper(["/?t1.p=30&p=10"]),
      });

      expect(getInitialSnapshot(result)?.pageSize).toBe(30);
    });

    it("ignores invalid pageSize values", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?p=abc"]),
      });

      expect(getInitialSnapshot(result)).toBeUndefined();
    });

    it("ignores filter keys without operator", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/?f.status=ACTIVE"]),
      });

      expect(getInitialSnapshot(result)).toBeUndefined();
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

      expect(getInitialSnapshot(result)?.pageSize).toBe(50);
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

      expect(getInitialSnapshot(result)?.sort).toEqual([{ field: "name", direction: "Desc" }]);
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

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
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

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "in", value: ["A", "B", "C"] },
      ]);
    });

    it("writes object filter value as JSON", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer(), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({
          filters: [
            {
              field: "amount",
              operator: "between",
              value: { min: 1, max: 99 },
            },
          ],
          sort: [],
          pageSize: 20,
        });
      });

      expect(getInitialSnapshot(result)?.filters).toEqual([
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

      expect(getInitialSnapshot(result)?.filters).toEqual([
        { field: "name", operator: "contains", value: "test" },
      ]);
    });

    it("uses prefix when writing", () => {
      const { result } = renderHook(() => useSearchParamsSynchronizer({ prefix: "t1" }), {
        wrapper: createWrapper(["/"]),
      });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 40 });
      });

      expect(getInitialSnapshot(result)?.pageSize).toBe(40);
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
      expect(getInitialSnapshot(result)).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now written
      expect(getInitialSnapshot(result)?.pageSize).toBe(50);

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

      expect(getInitialSnapshot(result)?.pageSize).toBe(50);

      vi.useRealTimers();
    });
  });
});
