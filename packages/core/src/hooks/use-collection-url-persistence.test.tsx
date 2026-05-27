import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { useCollectionURLState } from "./use-collection-url-persistence";

beforeEach(() => {
  vi.useRealTimers();
});

function createWrapper(initialEntry: string = "/") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

function renderURLState(
  options?: Parameters<typeof useCollectionURLState>[0],
  initialEntry: string = "/",
) {
  return renderHook(() => useCollectionURLState(options), {
    wrapper: createWrapper(initialEntry),
  });
}

describe("useCollectionURLState", () => {
  // ---------------------------------------------------------------------------
  // read()
  // ---------------------------------------------------------------------------
  describe("read", () => {
    it("returns empty object when no search params exist", () => {
      const { result } = renderURLState();

      expect(result.current.read()).toEqual({});
    });

    it("returns pageSize from URL", () => {
      const { result } = renderURLState(undefined, "/?p=50");

      expect(result.current.read().pageSize).toBe(50);
    });

    it("returns sort from URL (initialSort format)", () => {
      const { result } = renderURLState(undefined, "/?s=name:asc");

      expect(result.current.read().initialSort).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("returns sort desc from URL", () => {
      const { result } = renderURLState(undefined, "/?s=createdAt:desc");

      expect(result.current.read().initialSort).toEqual([
        { field: "createdAt", direction: "Desc" },
      ]);
    });

    it("returns single-value filter from URL (initialFilters format)", () => {
      const { result } = renderURLState(undefined, "/?f.status:eq=ACTIVE");

      expect(result.current.read().initialFilters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("returns multi-value filter from URL (repeated params)", () => {
      const { result } = renderURLState(undefined, "/?f.status:in=ACTIVE&f.status:in=PENDING");

      expect(result.current.read().initialFilters).toEqual([
        { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
      ]);
    });

    it("returns JSON object filter value (e.g. between)", () => {
      const url = `/?f.amount:between=${encodeURIComponent(JSON.stringify({ min: 10, max: 100 }))}`;
      const { result } = renderURLState(undefined, url);

      expect(result.current.read().initialFilters).toEqual([
        { field: "amount", operator: "between", value: { min: 10, max: 100 } },
      ]);
    });

    it("returns all state together", () => {
      const { result } = renderURLState(undefined, "/?p=25&s=name:desc&f.status:eq=ACTIVE");

      expect(result.current.read()).toEqual({
        pageSize: 25,
        initialSort: [{ field: "name", direction: "Desc" }],
        initialFilters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
      });
    });

    it("respects prefix option", () => {
      const { result } = renderURLState({ prefix: "t1" }, "/?t1.p=30&p=10");

      expect(result.current.read().pageSize).toBe(30);
    });

    it("ignores invalid pageSize values", () => {
      const { result } = renderURLState(undefined, "/?p=abc");

      expect(result.current.read()).toEqual({});
    });

    it("ignores filter keys without operator", () => {
      const { result } = renderURLState(undefined, "/?f.status=ACTIVE");

      expect(result.current.read()).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // write()
  // ---------------------------------------------------------------------------
  describe("write", () => {
    it("writes pageSize to URL", () => {
      const { result } = renderURLState();

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      expect(result.current.read().pageSize).toBe(50);
    });

    it("writes sort to URL", () => {
      const { result } = renderURLState();

      act(() => {
        result.current.write({
          filters: [],
          sort: [{ field: "name", direction: "Desc" }],
          pageSize: 20,
        });
      });

      expect(result.current.read().initialSort).toEqual([{ field: "name", direction: "Desc" }]);
    });

    it("writes single-value filter to URL", () => {
      const { result } = renderURLState();

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(result.current.read().initialFilters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("writes multi-value filter as repeated params", () => {
      const { result } = renderURLState();

      act(() => {
        result.current.write({
          filters: [{ field: "status", operator: "in", value: ["A", "B", "C"] }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(result.current.read().initialFilters).toEqual([
        { field: "status", operator: "in", value: ["A", "B", "C"] },
      ]);
    });

    it("writes object filter value as JSON", () => {
      const { result } = renderURLState();

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

      expect(result.current.read().initialFilters).toEqual([
        { field: "amount", operator: "between", value: { min: 1, max: 99 } },
      ]);
    });

    it("clears old filters when writing new state", () => {
      const { result } = renderURLState(undefined, "/?f.status:eq=OLD");

      act(() => {
        result.current.write({
          filters: [{ field: "name", operator: "contains", value: "test" }],
          sort: [],
          pageSize: 20,
        });
      });

      expect(result.current.read().initialFilters).toEqual([
        { field: "name", operator: "contains", value: "test" },
      ]);
    });

    it("uses prefix when writing", () => {
      const { result } = renderURLState({ prefix: "t1" });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 40 });
      });

      expect(result.current.read().pageSize).toBe(40);
    });
  });

  // ---------------------------------------------------------------------------
  // debounce
  // ---------------------------------------------------------------------------
  describe("debounce", () => {
    it("debounces write when debounceMs is set", () => {
      vi.useFakeTimers();

      const { result } = renderURLState({ debounceMs: 100 });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      // Not yet written
      expect(result.current.read()).toEqual({});

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now written
      expect(result.current.read().pageSize).toBe(50);

      vi.useRealTimers();
    });

    it("only applies the last write within debounce window", () => {
      vi.useFakeTimers();

      const { result } = renderURLState({ debounceMs: 100 });

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 10 });
        result.current.write({ filters: [], sort: [], pageSize: 30 });
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.read().pageSize).toBe(50);

      vi.useRealTimers();
    });
  });
});
