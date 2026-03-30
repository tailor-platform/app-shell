import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/button";
import { Select } from "@/components/select-standalone";
import { useDataTableContext } from "./data-table-context";
import { useCollectionControl } from "@/contexts/collection-control-context";
import { useDataTableT } from "./i18n";

// =============================================================================
// Pagination Component
// =============================================================================

export interface PaginationProps {
  /**
   * Available page-size options shown in a dropdown selector.
   * When provided, a page-size switcher is rendered.
   *
   * @example
   * ```tsx
   * <Pagination pageSizeOptions={[10, 20, 50, 100]} />
   * ```
   */
  pageSizeOptions?: number[];
}

/**
 * Pagination controls with first/prev/next/last navigation and page indicator.
 *
 * Reads pagination state from `DataTableContext` and `CollectionControlContext`.
 * Must be rendered inside `DataTable.Provider` but **outside** `DataTable.Root`.
 *
 * @example
 * ```tsx
 * <DataTable.Provider value={table}>
 *   <DataTable.Root>
 *     <DataTable.Headers />
 *     <DataTable.Body />
 *   </DataTable.Root>
 *   <Pagination pageSizeOptions={[10, 20, 50]} />
 * </DataTable.Provider>
 * ```
 */
export function Pagination({ pageSizeOptions }: PaginationProps = {}) {
  const { pageInfo } = useDataTableContext();
  const {
    nextPage,
    prevPage,
    hasPrevPage,
    hasNextPage,
    currentPage,
    totalPages,
    goToFirstPage,
    goToLastPage,
    pageSize,
    setPageSize,
  } = useCollectionControl();

  const t = useDataTableT();

  return (
    <div className="astw:flex astw:items-center astw:justify-end astw:gap-2 astw:py-2">
      {pageSizeOptions && pageSizeOptions.length > 0 && (
        <div className="astw:flex astw:items-center astw:gap-1.5">
          <span className="astw:text-sm astw:text-muted-foreground astw:whitespace-nowrap">
            {t("paginationRowsPerPage")}
          </span>
          <Select
            items={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            value={{ value: String(pageSize), label: String(pageSize) }}
            onValueChange={(item) => {
              if (item) setPageSize(Number(item.value));
            }}
            className="astw:w-[70px]"
          />
        </div>
      )}
      {totalPages !== null && (
        <span className="astw:text-sm astw:text-muted-foreground astw:tabular-nums">
          {currentPage} / {totalPages}
        </span>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={goToFirstPage}
        disabled={!hasPrevPage}
        aria-label={t("paginationFirst")}
      >
        <ChevronsLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (pageInfo.startCursor) {
            prevPage(pageInfo.startCursor);
          }
        }}
        disabled={!hasPrevPage}
        aria-label={t("paginationPrevious")}
      >
        <ChevronLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          if (pageInfo.endCursor) {
            nextPage(pageInfo.endCursor);
          }
        }}
        disabled={!hasNextPage}
        aria-label={t("paginationNext")}
      >
        <ChevronRight className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={goToLastPage}
        disabled={!hasNextPage || totalPages === null}
        aria-label={t("paginationLast")}
      >
        <ChevronsRight className="astw:size-4" />
      </Button>
    </div>
  );
}
