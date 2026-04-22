import { useState } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { Button } from "@/components/button";
import { Select } from "@/components/select-standalone";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";

export interface DataTablePaginationProps {
  /**
   * Available page-size options shown in a dropdown selector.
   * When provided, a page-size switcher is rendered.
   */
  pageSizeOptions?: number[];
}

/**
 * Pre-built pagination controls. Place inside `DataTable.Footer`.
 *
 * **Requires `control`** — `useDataTable()` must receive `control` from
 * `useCollectionVariables()`, otherwise this component throws at render time.
 */
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

  // currentPage is tracked locally because CollectionControl uses cursor-based
  // pagination and cannot reliably derive an absolute page number in all cases
  // (e.g. goToLastPage does not know the total page count).
  const [currentPage, setCurrentPage] = useState(1);

  const handleNextPage = () => {
    if (pageInfo.nextPageToken) {
      nextPage(pageInfo.nextPageToken);
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageInfo.previousPageToken) {
      prevPage(pageInfo.previousPageToken);
      setCurrentPage((p) => Math.max(1, p - 1));
    }
  };

  const handleGoToFirstPage = () => {
    goToFirstPage();
    setCurrentPage(1);
  };

  const handleGoToLastPage = () => {
    goToLastPage();
    // totalPages is guaranteed non-null here: this handler is only called from
    // the "last page" button which is rendered only when totalPages !== null.
    setCurrentPage(totalPages!);
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
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
        disabled={!hasPrevPage || !pageInfo.previousPageToken}
        aria-label={t("paginationPrevious")}
      >
        <ChevronLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNextPage}
        disabled={!hasNextPage || !pageInfo.nextPageToken}
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
