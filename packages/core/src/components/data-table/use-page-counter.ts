import { useCallback, useState } from "react";

/**
 * Pure display counter for cursor-based pagination.
 *
 * Cursor tokens are opaque — they carry no page-number information. This hook
 * maintains a 1-based page counter and a derived `totalPages` value.
 *
 * The counter is kept in sync via two mechanisms:
 *
 * 1. **Explicit actions** — `increment` / `decrement` / `reset` / `setToLast`
 *    are called by `useDataTable` alongside the corresponding navigation
 *    actions. Because pairing happens inside library code, the footgun of
 *    forgetting to call both is eliminated.
 *
 * 2. **`resetCount` detection** — When filter/sort changes or explicit resets
 *    bump `resetCount`, the hook detects the change via derived-state pattern
 *    and resets `currentPage` to 1.
 *
 * @see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export function usePageCounter({
  total,
  pageSize,
  resetCount,
}: {
  total: number | null;
  pageSize: number;
  /** Monotonically increasing counter from `CollectionControl.resetCount`. */
  resetCount: number;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages =
    total !== null && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : null;

  // Derived-state pattern: detect external resets (filter/sort changes,
  // goToFirstPage, goToLastPage, setPageSize). React discards the in-progress
  // render and re-renders with corrected state immediately.
  const [lastResetCount, setLastResetCount] = useState(resetCount);
  if (lastResetCount !== resetCount) {
    setLastResetCount(resetCount);
    setCurrentPage(1);
  }

  return {
    currentPage,
    totalPages,
    increment: useCallback(() => setCurrentPage((p) => p + 1), []),
    decrement: useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []),
    reset: useCallback(() => setCurrentPage(1), []),
    setToLast: useCallback((tp: number) => setCurrentPage(tp), []),
  };
}
