import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSearchParamsPersistence } from "./use-search-params-persistence";

beforeEach(() => {
  // Reset URL to root before each test
  window.history.replaceState(null, "", "/");
});

/** Helper: read current snapshot */
function readSnapshot(result: { current: ReturnType<typeof useSearchParamsPersistence> }) {
  return result.current.read();
}

describe("useSearchParamsPersistence", () => {
  // ---------------------------------------------------------------------------
  // read (initial)
  // ---------------------------------------------------------------------------
  describe("read (initial)", () => {
    it("returns undefined when no search params exist", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)).toBeUndefined();
    });

    it("returns pageSize from URL", () => {
      window.history.replaceState(null, "", "/?p=50");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.pageSize).toBe(50);
    });

    it("returns sort from URL", () => {
      window.history.replaceState(null, "", "/?s=name:asc");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.sort).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("returns sort desc from URL", () => {
      window.history.replaceState(null, "", "/?s=createdAt:desc");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.sort).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("returns single-value filter from URL", () => {
      window.history.replaceState(null, "", "/?f.status:eq=ACTIVE");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("returns multi-value filter from URL (repeated params)", () => {
      window.history.replaceState(null, "", "/?f.status:in=ACTIVE&f.status:in=PENDING");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
      ]);
    });

    it("returns JSON object filter value (e.g. between)", () => {
      const url = `/?f.amount:between=${encodeURIComponent(JSON.stringify({ min: 10, max: 100 }))}`;
      window.history.replaceState(null, "", url);
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 10, max: 100 } },
      ]);
    });

    it("returns all state together", () => {
      window.history.replaceState(null, "", "/?p=25&s=name:desc&f.status:eq=ACTIVE");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)).toEqual({
        pageSize: 25,
        sort: [{ field: "name", direction: "Desc" }],
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
      });
    });

    it("respects prefix option", () => {
      window.history.replaceState(null, "", "/?t1.p=30&p=10");
      const { result } = renderHook(() => useSearchParamsPersistence({ prefix: "t1" }));

      expect(readSnapshot(result)?.pageSize).toBe(30);
    });

    it("ignores invalid pageSize values", () => {
      window.history.replaceState(null, "", "/?p=abc");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)).toBeUndefined();
    });

    it("ignores filter keys without operator", () => {
      window.history.replaceState(null, "", "/?f.status=ACTIVE");
      const { result } = renderHook(() => useSearchParamsPersistence());

      expect(readSnapshot(result)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // write()
  // ---------------------------------------------------------------------------
  describe("write", () => {
    it("writes pageSize to URL", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      expect(readSnapshot(result)?.pageSize).toBe(50);
    });

    it("writes sort to URL", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

      act(() => {
        result.current.write({
          filters: [],
          sort: [{ field: "name", direction: "Desc" }],
          pageSize: 20,
        });
      });

      expect(readSnapshot(result)?.sort).toEqual([{ field: "name", direction: "Desc" }]);
    });

    it("writes single-value filter to URL", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("writes multi-value filter as repeated params", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "in", value: ["A", "B", "C"] }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "in", value: ["A", "B", "C"] },
      ]);
    });

    it("writes object filter value as JSON", () => {
      const { result } = renderHook(() => useSearchParamsPersistence());

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

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 1, max: 99 } },
      ]);
    });

    it("clears old filters when writing new state", () => {
      window.history.replaceState(null, "", "/?f.status:eq=OLD");
      const { result } = renderHook(() => useSearchParamsPersistence());

      act(() => {
        result.current.write({
          filters: [{ field: "name", operator: "contains", value: "test" }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "name", operator: "contains", value: "test" },
      ]);
    });

    it("uses prefix when writing", () => {
      const { result } = renderHook(() => useSearchParamsPersistence({ prefix: "t1" }));

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 40 });
      });

      expect(readSnapshot(result)?.pageSize).toBe(40);
    });
  });

  // ---------------------------------------------------------------------------
  // debounce
  // ---------------------------------------------------------------------------
  describe("debounce", () => {
    it("debounces write when debounceMs is set", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSearchParamsPersistence({ debounceMs: 100 }));

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      // Not yet written
      expect(readSnapshot(result)).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now written
      expect(readSnapshot(result)?.pageSize).toBe(50);

      vi.useRealTimers();
    });

    it("only applies the last write within debounce window", () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useSearchParamsPersistence({ debounceMs: 100 }));

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 10 });
        result.current.write({ filters: [], sort: [], pageSize: 30 });
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(readSnapshot(result)?.pageSize).toBe(50);

      vi.useRealTimers();
    });
  });
});
