import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCursorPagination } from "./use-cursor-pagination";

describe("useCursorPagination", () => {
  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe("initial state", () => {
    it("starts in forward mode with no cursor", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("forward");
      expect(result.current.pageSize).toBe(20);
    });

    it("returns correct initial paginationVariables", () => {
      const { result } = renderHook(() => useCursorPagination(10));
      expect(result.current.paginationVariables).toEqual({ first: 10 });
    });
  });

  // ---------------------------------------------------------------------------
  // Forward navigation
  // ---------------------------------------------------------------------------
  describe("forward navigation", () => {
    it("goToNextPage pushes endCursor onto stack in forward mode", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "cursor1" }));

      expect(result.current.cursor).toBe("cursor1");
      expect(result.current.cursorStack).toEqual(["cursor1"]);
      expect(result.current.paginationDirection).toBe("forward");
      expect(result.current.paginationVariables).toEqual({
        first: 20,
        after: "cursor1",
      });
    });

    it("multiple goToNextPage calls build up the stack", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "c1" }));
      act(() => result.current.goToNextPage({ endCursor: "c2" }));
      act(() => result.current.goToNextPage({ endCursor: "c3" }));

      expect(result.current.cursor).toBe("c3");
      expect(result.current.cursorStack).toEqual(["c1", "c2", "c3"]);
    });

    it("goToPrevPage pops the forward stack", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "c1" }));
      act(() => result.current.goToNextPage({ endCursor: "c2" }));
      act(() => result.current.goToPrevPage({ startCursor: "ignored" }));

      expect(result.current.cursor).toBe("c1");
      expect(result.current.cursorStack).toEqual(["c1"]);
      expect(result.current.paginationDirection).toBe("forward");
      expect(result.current.paginationVariables).toEqual({
        first: 20,
        after: "c1",
      });
    });

    it("goToPrevPage back to first page clears cursor", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "c1" }));
      act(() => result.current.goToPrevPage({ startCursor: "ignored" }));

      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationVariables).toEqual({ first: 20 });
    });
  });

  // ---------------------------------------------------------------------------
  // Backward navigation (goToLastPage flow)
  // ---------------------------------------------------------------------------
  describe("backward navigation", () => {
    it("goToLastPage sets backward mode with no cursor", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());

      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("backward");
      expect(result.current.paginationVariables).toEqual({ last: 20 });
    });

    it("goToPrevPage pushes startCursor onto backward stack", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());
      act(() => result.current.goToPrevPage({ startCursor: "before-1" }));

      expect(result.current.cursor).toBe("before-1");
      expect(result.current.cursorStack).toEqual(["before-1"]);
      expect(result.current.paginationDirection).toBe("backward");
      expect(result.current.paginationVariables).toEqual({
        last: 20,
        before: "before-1",
      });
    });

    it("multiple goToPrevPage calls build backward stack", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());
      act(() => result.current.goToPrevPage({ startCursor: "b1" }));
      act(() => result.current.goToPrevPage({ startCursor: "b2" }));

      expect(result.current.cursorStack).toEqual(["b1", "b2"]);
      expect(result.current.cursor).toBe("b2");
    });

    it("goToNextPage pops backward stack (retrace)", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());
      act(() => result.current.goToPrevPage({ startCursor: "b1" }));
      act(() => result.current.goToPrevPage({ startCursor: "b2" }));

      // "Next" in backward mode = pop
      act(() => result.current.goToNextPage({ endCursor: "ignored" }));

      expect(result.current.cursor).toBe("b1");
      expect(result.current.cursorStack).toEqual(["b1"]);
      expect(result.current.paginationDirection).toBe("backward");
      expect(result.current.paginationVariables).toEqual({
        last: 20,
        before: "b1",
      });
    });

    it("goToNextPage pops to empty returns to last page (cursor=null, backward)", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());
      act(() => result.current.goToPrevPage({ startCursor: "b1" }));

      // Pop last entry
      act(() => result.current.goToNextPage({ endCursor: "ignored" }));

      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("backward");
      expect(result.current.paginationVariables).toEqual({ last: 20 });
    });
  });

  // ---------------------------------------------------------------------------
  // Reset / goToFirstPage
  // ---------------------------------------------------------------------------
  describe("reset and goToFirstPage", () => {
    it("resetPage clears all state to initial forward", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "c1" }));
      act(() => result.current.goToNextPage({ endCursor: "c2" }));
      act(() => result.current.resetPage());

      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("forward");
    });

    it("goToFirstPage resets to forward mode", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToLastPage());
      act(() => result.current.goToPrevPage({ startCursor: "b1" }));
      act(() => result.current.goToFirstPage());

      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("forward");
      expect(result.current.paginationVariables).toEqual({ first: 20 });
    });
  });

  // ---------------------------------------------------------------------------
  // setPageSize
  // ---------------------------------------------------------------------------
  describe("setPageSize", () => {
    it("changes page size and resets to first page", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      act(() => result.current.goToNextPage({ endCursor: "c1" }));
      act(() => result.current.setPageSize(50));

      expect(result.current.pageSize).toBe(50);
      expect(result.current.cursor).toBeNull();
      expect(result.current.cursorStack).toEqual([]);
      expect(result.current.paginationDirection).toBe("forward");
      expect(result.current.paginationVariables).toEqual({ first: 50 });
    });
  });

  // ---------------------------------------------------------------------------
  // paginationVariables shape
  // ---------------------------------------------------------------------------
  describe("paginationVariables", () => {
    it("omits undefined fields in forward mode without cursor", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      const vars = result.current.paginationVariables;
      expect(vars).toEqual({ first: 20 });
      expect("after" in vars).toBe(false);
      expect("last" in vars).toBe(false);
      expect("before" in vars).toBe(false);
    });

    it("omits undefined fields in backward mode without cursor", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.goToLastPage());
      const vars = result.current.paginationVariables;
      expect(vars).toEqual({ last: 20 });
      expect("first" in vars).toBe(false);
      expect("after" in vars).toBe(false);
      expect("before" in vars).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getHasPrevPage / getHasNextPage
  // ---------------------------------------------------------------------------
  describe("getHasPrevPage / getHasNextPage", () => {
    it("forward mode: getHasPrevPage uses cursorStack, not pageInfo", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      // Empty stack → no prev
      expect(result.current.getHasPrevPage({ hasPreviousPage: true })).toBe(false);

      act(() => result.current.goToNextPage({ endCursor: "c1" }));

      // Non-empty stack → has prev, regardless of pageInfo flag
      expect(result.current.getHasPrevPage({ hasPreviousPage: false })).toBe(true);
    });

    it("forward mode: getHasNextPage trusts pageInfo.hasNextPage", () => {
      const { result } = renderHook(() => useCursorPagination(20));

      expect(result.current.getHasNextPage({ hasNextPage: true })).toBe(true);
      expect(result.current.getHasNextPage({ hasNextPage: false })).toBe(false);
    });

    it("backward mode: getHasPrevPage trusts pageInfo.hasPreviousPage", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.goToLastPage());

      expect(result.current.getHasPrevPage({ hasPreviousPage: true })).toBe(true);
      expect(result.current.getHasPrevPage({ hasPreviousPage: false })).toBe(false);
    });

    it("backward mode: getHasNextPage uses cursorStack, not pageInfo", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.goToLastPage());

      // Empty stack → no next
      expect(result.current.getHasNextPage({ hasNextPage: true })).toBe(false);

      act(() => result.current.goToPrevPage({ startCursor: "b1" }));

      // Non-empty stack → has next, regardless of pageInfo flag
      expect(result.current.getHasNextPage({ hasNextPage: false })).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // resetCount
  // ---------------------------------------------------------------------------
  describe("resetCount", () => {
    it("starts at 0", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      expect(result.current.resetCount).toBe(0);
    });

    it("increments on resetPage", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.resetPage());
      expect(result.current.resetCount).toBe(1);
      act(() => result.current.resetPage());
      expect(result.current.resetCount).toBe(2);
    });

    it("does not increment on goToFirstPage", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.goToFirstPage());
      expect(result.current.resetCount).toBe(0);
    });

    it("does not increment on goToLastPage", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.goToLastPage());
      expect(result.current.resetCount).toBe(0);
    });

    it("does not increment on setPageSize", () => {
      const { result } = renderHook(() => useCursorPagination(20));
      act(() => result.current.setPageSize(50));
      expect(result.current.resetCount).toBe(0);
    });
  });
});
