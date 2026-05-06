import { useCallback, useMemo, useState } from "react";
import type { PageInfo, PaginationVariables } from "@/types/collection";

// =============================================================================
// Why cursor-stack pagination exists
// =============================================================================
//
// Relay Cursor Connections (https://relay.dev/graphql/connections.htm) is the
// de-facto standard for cursor-based pagination in GraphQL. However, the spec
// was designed for Facebook/Instagram-style infinite scroll — not for
// prev/next page navigation commonly needed in ERP and back-office UIs.
//
// This mismatch surfaces in two concrete ways:
//
// 1. **`hasPreviousPage` / `hasNextPage` are only reliable in ONE direction.**
//
//    | Arguments       | hasNextPage | hasPreviousPage |
//    |-----------------|-------------|-----------------|
//    | first (+ after) | ✅ accurate | ❌ always false  |
//    | last (+ before) | ❌ always false | ✅ accurate  |
//
//    The spec explicitly permits this because computing the "opposite" flag
//    would require an extra COUNT query on the server, and Relay's primary
//    use case (infinite scroll) never needs it.
//
// 2. **There is no concept of "pages" or "going back".**
//
//    Cursor pagination expresses a *relative position in a stream*
//    ("items after cursor X"), not a *fixed page boundary* ("page 3 of 10").
//    Relay's `loadPrevious` means "prepend older items to the store" (think
//    chat history scrolling upward), NOT "go to the previous page."
//
// For ERP / BaaS applications where users expect a traditional prev/next
// pager with "Go to First" / "Go to Last" controls, we need a client-side
// translation layer that converts the cursor stream into discrete pages.
//
// =============================================================================
// Two-mode design (forward / backward)
// =============================================================================
//
// The core idea: **trust only the flag that matches the fetch direction, and
// let the client fill in the other direction via a cursor stack.**
//
// - **Forward mode** (`first + after`):
//     `hasNextPage` → from server (reliable)
//     `hasPreviousPage` → `cursorStack.length > 0` (client tracks history)
//
// - **Backward mode** (`last + before`):
//     `hasPreviousPage` → from server (reliable)
//     `hasNextPage` → `cursorStack.length > 0` (client tracks history)
//
// Forward mode is the default. Backward mode is entered via `goToLastPage()`,
// which fetches the last N items with `last: pageSize` and no cursor.
// Pressing "Prev" in backward mode pushes `before` cursors onto the stack.
// Pressing "Next" in backward mode pops the stack to retrace steps.
//
// The cursor stack is essentially a breadcrumb trail of visited pages. It is
// necessary because the server's `hasPreviousPage` (in forward mode) or
// `hasNextPage` (in backward mode) cannot be trusted per the Relay spec.
//
// =============================================================================
// Stale cursor caveat
// =============================================================================
//
// The cursor stack stores opaque tokens from the moment of visit. If rows are
// inserted or deleted between navigations, a stored cursor may point to a
// different position or a non-existent row. This is an inherent limitation of
// cursor pagination (offset pagination has the same issue, often worse).
// For append-only data (e.g. audit logs) the stack is perfectly safe.
// For mutable data, applications may choose to detect stale cursors and prompt
// the user to refresh.
//
// =============================================================================

/**
 * Return type of {@link useCursorPagination}.
 */
export interface UseCursorPaginationReturn {
  /** Current cursor passed to the server (`after` or `before` depending on direction). */
  cursor: string | null;
  /** Client-side stack of visited cursors. Non-empty ⇒ the user can navigate back. */
  cursorStack: string[];
  /** Current fetch direction — determines whether `first`/`after` or `last`/`before` is sent. */
  paginationDirection: "forward" | "backward";
  /** Current page size. */
  pageSize: number;
  /** Ready-to-spread pagination variables for the GraphQL query. */
  paginationVariables: PaginationVariables;
  /**
   * Navigate to the next page.
   *
   * - Forward mode: pushes `pageInfo.endCursor` onto the stack and fetches with `first + after`.
   * - Backward mode: pops the backward stack (retracing previously visited pages).
   *
   * No-ops when the cursor required for the current mode is missing.
   */
  goToNextPage: (pageInfo: Pick<PageInfo, "endCursor">) => void;
  /**
   * Navigate to the previous page.
   *
   * - Forward mode: pops the forward stack (returning to previously visited pages).
   * - Backward mode: pushes `pageInfo.startCursor` onto the stack and fetches with `last + before`.
   *
   * No-ops when the cursor required for the current mode is missing.
   */
  goToPrevPage: (pageInfo: Pick<PageInfo, "startCursor">) => void;
  /** Reset pagination to the initial state (page 1, forward). */
  resetPage: () => void;
  /** Jump to the first page (forward mode, no cursor). */
  goToFirstPage: () => void;
  /**
   * Jump to the last page (backward mode, no cursor).
   *
   * When `total` is provided, the hook computes `total % pageSize` so the last
   * page aligns with forward-pagination boundaries. Without `total`, it falls
   * back to a full `pageSize` fetch.
   */
  goToLastPage: (total?: number | null) => void;
  /** Change the page size and reset to the first page. */
  setPageSize: (size: number) => void;
  /**
   * Determine whether a previous page exists, given the server's `pageInfo`.
   *
   * - Forward mode → `cursorStack.length > 0` (server flag unreliable).
   * - Backward mode → `pageInfo.hasPreviousPage` (server flag reliable with `last`).
   */
  getHasPrevPage: (pageInfo: Pick<PageInfo, "hasPreviousPage">) => boolean;
  /**
   * Determine whether a next page exists, given the server's `pageInfo`.
   *
   * - Forward mode → `pageInfo.hasNextPage` (server flag reliable with `first`).
   * - Backward mode → `cursorStack.length > 0` (server flag unreliable).
   */
  getHasNextPage: (pageInfo: Pick<PageInfo, "hasNextPage">) => boolean;
  /**
   * Monotonically increasing counter that bumps on every pagination reset
   * (filter change, sort change, `goToFirstPage`, `goToLastPage`, `setPageSize`).
   * Used by `usePageCounter` to detect external resets and sync `currentPage`.
   */
  resetCount: number;
}

/**
 * Low-level hook that manages cursor-based pagination state with a two-mode
 * (forward / backward) cursor-stack design.
 *
 * This hook owns the `cursor`, `cursorStack`, `paginationDirection`,
 * `pageSize`, and `currentPage` state, and exposes navigation actions
 * (`goToNextPage`, `goToPrevPage`, `goToFirstPage`, `goToLastPage`) plus the
 * computed `paginationVariables` object ready to be spread into a GraphQL query.
 *
 * The two-mode design is fully encapsulated: callers pass `pageInfo` to the
 * navigation functions and the hook decides whether to push/pop the cursor
 * stack based on the current direction. UI code never needs to branch on mode.
 *
 * @param initialPageSize - Default number of rows per page.
 *
 * @see {@link file://./use-collection-variables.ts useCollectionVariables} — the primary consumer.
 */
export function useCursorPagination(initialPageSize: number): UseCursorPaginationReturn {
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [paginationDirection, setPaginationDirection] = useState<"forward" | "backward">("forward");
  // When jumping to the last page, if the total isn't evenly divisible by
  // pageSize the remainder determines how many items the last page contains.
  // This ensures the last page aligns with forward-pagination boundaries.
  const [lastPageSize, setLastPageSize] = useState<number | null>(null);

  // resetCount is a signal to notify usePageCounter (the page display counter)
  // of pagination resets it cannot otherwise detect.
  //
  // When filters or sort change, useCollectionVariables calls resetPage()
  // internally — but useDataTable (which owns usePageCounter) has no way to
  // intercept that call. resetCount bridges this gap: resetPage() bumps the
  // counter, and usePageCounter's derived-state detects the change and resets
  // currentPage to 1.
  //
  // goToFirstPage / goToLastPage / setPageSize do NOT bump resetCount because
  // useDataTable wraps those actions and updates the page counter directly.
  const [resetCount, setResetCount] = useState(0);

  // ---------------------------------------------------------------------------
  // Reset helper — shared by filter/sort changes and explicit resets.
  // ---------------------------------------------------------------------------
  const resetPagination = useCallback(() => {
    setCursor(null);
    setCursorStack([]);
    setPaginationDirection("forward");
    setLastPageSize(null);
    setResetCount((c) => c + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation actions
  // ---------------------------------------------------------------------------

  /** Push a cursor onto the stack and set it as current. */
  const pushCursor = useCallback((newCursor: string, direction: "forward" | "backward") => {
    setCursorStack((prev) => [...prev, newCursor]);
    setCursor(newCursor);
    setPaginationDirection(direction);
  }, []);

  /** Pop the top cursor from the stack. Direction is preserved. */
  const popCursorStack = useCallback(() => {
    setCursorStack((prev) => {
      const newStack = prev.slice(0, -1);
      const prevCursor = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      setCursor(prevCursor);
      return newStack;
    });
  }, []);

  const goToNextPage = useCallback(
    (pageInfo: Pick<PageInfo, "endCursor">) => {
      if (paginationDirection === "forward") {
        if (pageInfo.endCursor) pushCursor(pageInfo.endCursor, "forward");
      } else {
        // Backward mode: "next" means retracing — pop the backward stack.
        popCursorStack();
      }
    },
    [paginationDirection, pushCursor, popCursorStack],
  );

  const goToPrevPage = useCallback(
    (pageInfo: Pick<PageInfo, "startCursor">) => {
      if (paginationDirection === "backward") {
        if (pageInfo.startCursor) pushCursor(pageInfo.startCursor, "backward");
      } else {
        // Forward mode: "prev" means going back — pop the forward stack.
        popCursorStack();
      }
    },
    [paginationDirection, pushCursor, popCursorStack],
  );

  const goToFirstPage = useCallback(() => {
    setCursor(null);
    setCursorStack([]);
    setPaginationDirection("forward");
    setLastPageSize(null);
  }, []);

  const goToLastPage = useCallback(
    (total?: number | null) => {
      setCursor(null);
      setCursorStack([]);
      setPaginationDirection("backward");
      if (total != null && total > 0) {
        const remainder = total % pageSize;
        setLastPageSize(remainder !== 0 ? remainder : null);
      } else {
        setLastPageSize(null);
      }
    },
    [pageSize],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCursor(null);
    setCursorStack([]);
    setPaginationDirection("forward");
    setLastPageSize(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Computed pagination variables
  // ---------------------------------------------------------------------------
  const paginationVariables = useMemo<PaginationVariables>(() => {
    const p: PaginationVariables = {};
    if (paginationDirection === "forward") {
      p.first = pageSize;
      if (cursor) p.after = cursor;
    } else {
      // On the actual last page (no cursor), use lastPageSize if set so the
      // page aligns with forward-pagination boundaries. Once the user
      // navigates away (cursor becomes non-null), use the full pageSize.
      p.last = cursor === null && lastPageSize != null ? lastPageSize : pageSize;
      if (cursor) p.before = cursor;
    }
    return p;
  }, [pageSize, cursor, paginationDirection, lastPageSize]);

  // ---------------------------------------------------------------------------
  // Page-existence helpers
  // ---------------------------------------------------------------------------
  const getHasPrevPage = useCallback(
    (pageInfo: Pick<PageInfo, "hasPreviousPage">) =>
      paginationDirection === "backward" ? pageInfo.hasPreviousPage : cursorStack.length > 0,
    [paginationDirection, cursorStack],
  );

  const getHasNextPage = useCallback(
    (pageInfo: Pick<PageInfo, "hasNextPage">) =>
      paginationDirection === "forward" ? pageInfo.hasNextPage : cursorStack.length > 0,
    [paginationDirection, cursorStack],
  );

  return {
    cursor,
    cursorStack,
    paginationDirection,
    pageSize,
    paginationVariables,
    goToNextPage,
    goToPrevPage,
    resetPage: resetPagination,
    goToFirstPage,
    goToLastPage,
    setPageSize,
    getHasPrevPage,
    getHasNextPage,
    resetCount,
  };
}
