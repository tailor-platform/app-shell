import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
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

/** Use `DataTable.Pagination` instead of calling this directly. */
export function DataTablePagination({ pageSizeOptions }: DataTablePaginationProps = {}) {
  const {
    pageInfo,
    totalPages,
    currentPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    hasPrevPage,
    hasNextPage,
    pageSize,
    setPageSize,
  } = useDataTableContext();
  const t = useDataTableT();

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
              if (item) setPageSize(Number(item));
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
          onClick={goToFirstPage}
          disabled={!hasPrevPage}
          aria-label={t("paginationFirst")}
        >
          <ChevronsLeft className="astw:size-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={() => goToPrevPage(pageInfo)}
        disabled={!hasPrevPage}
        aria-label={t("paginationPrevious")}
      >
        <ChevronLeft className="astw:size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => goToNextPage(pageInfo)}
        disabled={!hasNextPage || (totalPages !== null && currentPage >= totalPages)}
        aria-label={t("paginationNext")}
      >
        <ChevronRight className="astw:size-4" />
      </Button>
      {totalPages !== null && (
        <Button
          variant="outline"
          size="icon"
          onClick={goToLastPage}
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
