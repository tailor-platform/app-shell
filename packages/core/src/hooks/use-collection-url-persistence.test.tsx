import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { useCollectionURLPersistence } from "./use-collection-url-persistence";

beforeEach(() => {
  vi.useRealTimers();
});

function createWrapper(initialEntry: string = "/") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

function renderPersistence(
  options?: Parameters<typeof useCollectionURLPersistence>[0],
  initialEntry: string = "/",
) {
  return renderHook(() => useCollectionURLPersistence(options), {
    wrapper: createWrapper(initialEntry),
  });
}

/** Helper: read current snapshot */
function readSnapshot(result: { current: ReturnType<typeof useCollectionURLPersistence> }) {
  return result.current.read();
}

describe("useCollectionURLPersistence", () => {
  // ---------------------------------------------------------------------------
  // read (initial)
  // ---------------------------------------------------------------------------
  describe("read (initial)", () => {
    it("returns undefined when no search params exist", () => {
      const { result } = renderPersistence();

      expect(readSnapshot(result)).toBeUndefined();
    });

    it("returns pageSize from URL", () => {
      const { result } = renderPersistence(undefined, "/?p=50");

      expect(readSnapshot(result)?.pageSize).toBe(50);
    });

    it("returns sort from URL", () => {
      const { result } = renderPersistence(undefined, "/?s=name:asc");

      expect(readSnapshot(result)?.sort).toEqual([{ field: "name", direction: "Asc" }]);
    });

    it("returns sort desc from URL", () => {
      const { result } = renderPersistence(undefined, "/?s=createdAt:desc");

      expect(readSnapshot(result)?.sort).toEqual([{ field: "createdAt", direction: "Desc" }]);
    });

    it("returns single-value filter from URL", () => {
      const { result } = renderPersistence(undefined, "/?f.status:eq=ACTIVE");

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "eq", value: "ACTIVE" },
      ]);
    });

    it("returns multi-value filter from URL (repeated params)", () => {
      const { result } = renderPersistence(undefined, "/?f.status:in=ACTIVE&f.status:in=PENDING");

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "status", operator: "in", value: ["ACTIVE", "PENDING"] },
      ]);
    });

    it("returns JSON object filter value (e.g. between)", () => {
      const url = `/?f.amount:between=${encodeURIComponent(JSON.stringify({ min: 10, max: 100 }))}`;
      const { result } = renderPersistence(undefined, url);

      expect(readSnapshot(result)?.filters).toEqual([
        { field: "amount", operator: "between", value: { min: 10, max: 100 } },
      ]);
    });

    it("returns all state together", () => {
      const { result } = renderPersistence(undefined, "/?p=25&s=name:desc&f.status:eq=ACTIVE");

      expect(readSnapshot(result)).toEqual({
        pageSize: 25,
        sort: [{ field: "name", direction: "Desc" }],
        filters: [{ field: "status", operator: "eq", value: "ACTIVE" }],
      });
    });

    it("respects prefix option", () => {
      const { result } = renderPersistence({ prefix: "t1" }, "/?t1.p=30&p=10");

      expect(readSnapshot(result)?.pageSize).toBe(30);
    });

    it("ignores invalid pageSize values", () => {
      const { result } = renderPersistence(undefined, "/?p=abc");

      expect(readSnapshot(result)).toBeUndefined();
    });

    it("ignores filter keys without operator", () => {
      const { result } = renderPersistence(undefined, "/?f.status=ACTIVE");

      expect(readSnapshot(result)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // write()
  // ---------------------------------------------------------------------------
  describe("write", () => {
    it("writes pageSize to URL", () => {
      const { result } = renderPersistence();

      act(() => {
        result.current.write({ filters: [], sort: [], pageSize: 50 });
      });

      expect(readSnapshot(result)?.pageSize).toBe(50);
    });

    it("writes sort to URL", () => {
      const { result } = renderPersistence();

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
      const { result } = renderPersistence();

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
      const { result } = renderPersistence();

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
      const { result } = renderPersistence();

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
      const { result } = renderPersistence(undefined, "/?f.status:eq=OLD");

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
      const { result } = renderPersistence({ prefix: "t1" });

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

      const { result } = renderPersistence({ debounceMs: 100 });

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

      const { result } = renderPersistence({ debounceMs: 100 });

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
