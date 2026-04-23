import { useState } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { Button } from "@/components/button";
import { Select } from "@/components/select-standalone";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";

/**
 * Tracks the current page number for cursor-based pagination.
 *
 * Pass `cursor`, `paginationDirection`, and `totalPages` from
 * `useCollectionVariables` / `CollectionControl`. The hook syncs
 * `currentPage` automatically when the cursor is externally reset
 * (e.g. after a filter or sort change).
 *
 * Returns `currentPage` and four action functions to keep the counter
 * in sync with your navigation handlers:
 * - `increment()` — call after navigating to the next page
 * - `decrement()` — call after navigating to the previous page
 * - `reset()` — call after jumping to the first page
 * - `setToLast()` — call after jumping to the last page
 *
 * @warning **Action functions must always be paired with their corresponding
 * `CollectionControl` calls.** Calling `control.nextPage(cursor)` without
 * `increment()`, or `control.goToFirstPage()` without `reset()`, causes the
 * page counter to desync permanently with no error. Each navigation handler
 * must invoke both the control method and the matching counter function in the
 * same event handler.
 *
 * @example
 * ```tsx
 * const { currentPage, increment, decrement, reset, setToLast } = useCurrentPage({
 *   cursor: control.cursor,
 *   paginationDirection: control.paginationDirection,
 *   totalPages,
 * });
 *
 * const handleNext = () => { control.nextPage(cursor); increment(); };
 * const handleFirst = () => { control.goToFirstPage(); reset(); };
 * ```
 *
 * @remarks
 * **Why is the page counter separate from `CollectionControl`?**
 * `CollectionControl` manages server query state: cursors, filters, and sort
 * are all passed directly to the API. The cursor is an opaque server-issued
 * token and carries no page-number information, so an absolute page index
 * cannot be derived from it. Embedding a display-only counter in
 * `CollectionControl` would pollute the query interface with UI concerns, so
 * `useCurrentPage` owns that responsibility instead.
 *
 * `currentPage` is therefore a **display counter** only — it is not derived
 * from the cursor token and will drift if you call navigation functions without
 * invoking the corresponding action. Desync caused by filter/sort resets is
 * handled automatically via a derived-state pattern.
 */
export function useCurrentPage({
  cursor,
  paginationDirection,
  totalPages,
}: {
  cursor: string | null;
  paginationDirection: "forward" | "backward";
  totalPages: number | null;
}) {
  // ---------------------------------------------------------------------------
  // Why local state?
  //   CollectionControl uses opaque cursor tokens that do not encode an absolute
  //   page number, so currentPage cannot be derived from the cursor alone.
  //
  //   An earlier design lifted currentPage into DataTableContext, but goToLastPage
  //   sets cursor=null with direction="backward", which is indistinguishable from
  //   "reset to page 1" at the context level — the correct target (totalPages) is
  //   only available inside DataTablePagination. That forced the counter back here.
  //
  // Known limitation — desync on filter/sort change:
  //   useCollectionVariables resets cursor→null + direction="forward" when filters
  //   or sorts change, but this hook is not directly notified. The derived-state
  //   block below patches this specific case without useEffect, which would paint
  //   the stale value for one frame before correcting it.
  //   Non-null cursor changes (nextPage/prevPage) are still handled by the action
  //   functions returned from this hook.
  //
  // Derived-state pattern:
  //   We snapshot (lastCursor, lastDirection) and call setState during render when
  //   they differ from the current props. React discards the current render and
  //   immediately re-renders with corrected state, so the stale value is never
  //   committed to the DOM.
  //   See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // ---------------------------------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1);

  const [lastCursor, setLastCursor] = useState(cursor);
  const [lastDirection, setLastDirection] = useState(paginationDirection);
  if (lastCursor !== cursor || lastDirection !== paginationDirection) {
    setLastCursor(cursor);
    setLastDirection(paginationDirection);
    if (cursor === null) {
      if (paginationDirection === "backward" && totalPages !== null) {
        // goToLastPage: cursor=null + direction="backward"
        setCurrentPage(totalPages);
      } else {
        // All other resets (filter, sort, setPageSize, goToFirstPage, resetPage)
        setCurrentPage(1);
      }
    }
  }

  return {
    currentPage,
    increment: () => setCurrentPage((p) => p + 1),
    decrement: () => setCurrentPage((p) => Math.max(1, p - 1)),
    reset: () => setCurrentPage(1),
    setToLast: () => {
      // totalPages is guaranteed non-null at the call site (button only renders
      // when totalPages !== null), but we guard anyway for type safety.
      if (totalPages !== null) setCurrentPage(totalPages);
    },
  };
}

export interface DataTablePaginationProps {
  /**
   * Available page-size options shown in a dropdown selector.
   * When provided, a page-size switcher is rendered.
   */
  pageSizeOptions?: number[];
}

/** Use `DataTable.Pagination` instead of calling this directly. */
export function DataTablePagination({ pageSizeOptions }: DataTablePaginationProps = {}) {
  const { pageInfo, totalPages, nextPage, prevPage, hasPrevPage, hasNextPage } =
    useDataTableContext();
  const control = useCollectionControlOptional();
  // Intentional throw: <DataTable.Pagination> cannot function without collection
  // control (needs pageSize, goToFirstPage, etc.). Rendering a
  // disabled/empty fallback would silently hide a misconfiguration, so we fail
  // loudly instead. Consumers must pass `control` from useCollectionVariables()
  // to useDataTable() when using this component.
  if (!control) {
    throw new Error(
      "<DataTable.Pagination> requires collection control. Pass `control` from `useCollectionVariables()` to `useDataTable()`.",
    );
  }
  const { goToFirstPage, goToLastPage, pageSize, setPageSize } = control;
  const t = useDataTableT();

  const { currentPage, increment, decrement, reset, setToLast } = useCurrentPage({
    cursor: control.cursor,
    paginationDirection: control.paginationDirection,
    totalPages,
  });

  const handleNextPage = () => {
    if (pageInfo.endCursor) {
      nextPage(pageInfo.endCursor);
      increment();
    }
  };

  const handlePrevPage = () => {
    if (pageInfo.startCursor) {
      prevPage(pageInfo.startCursor);
      decrement();
    }
  };

  const handleGoToFirstPage = () => {
    goToFirstPage();
    reset();
  };

  const handleGoToLastPage = () => {
    goToLastPage();
    setToLast();
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    reset();
  };

  return (
    <div className="astw:flex astw:items-center astw:justify-end astw:gap-2 astw:ml-auto">
      {pageSizeOptions && pageSizeOptions.length > 0 && (
        <div className="astw:flex astw:items-center astw:gap-1.5">
          <span className="astw:text-sm astw:text-muted-foreground astw:whitespace-nowrap">
            {t("paginationRowsPerPage")}
          </span>
          <Select
            items={pageSizeOptions.map(String)}
            value={String(pageSize)}
            onValueChange={(item) => {
              if (item) handleSetPageSize(Number(item));
            }}
            className="astw:w-17.5"
          />
        </div>
      )}
      {totalPages !== null && (
        <span className="astw:text-sm astw:text-muted-foreground astw:tabular-nums">
          {t("paginationPage")} {currentPage} / {totalPages}
        </span>
      )}
      {totalPages !== null && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleGoToFirstPage}
          disabled={!hasPrevPage}
          aria-label={t("paginationFirst")}
        >
          <ChevronsLeft className="astw:size-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevPage}
        disabled={!hasPrevPage || !pageInfo.startCursor}
        aria-label={t("paginationPrevious")}
      >
        <ChevronLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextPage}
        disabled={!hasNextPage || !pageInfo.endCursor}
        aria-label={t("paginationNext")}
      >
        <ChevronRight className="astw:size-4" />
      </Button>
      {totalPages !== null && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleGoToLastPage}
          disabled={!hasNextPage}
          aria-label={t("paginationLast")}
        >
          <ChevronsRight className="astw:size-4" />
        </Button>
      )}
    </div>
  );
}
DataTablePagination.displayName = "DataTable.Pagination";
