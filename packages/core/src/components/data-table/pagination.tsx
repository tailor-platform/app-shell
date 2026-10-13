import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";
import { isSelectionBarOpen } from "./selection-bar";

export interface DataTablePaginationProps {
  /**
   * Available page-size options shown in a dropdown selector.
   * When provided, a page-size switcher is rendered.
   */
  pageSizeOptions?: number[];
}

/** Use `DataTable.Pagination` instead of calling this directly. */
export function DataTablePagination({ pageSizeOptions }: DataTablePaginationProps = {}) {
  const ctx = useDataTableContext();
  const {
    pageInfo,
    total,
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
    selectedIds,
    toggleRowSelection,
  } = ctx;
  const t = useDataTableT();

  const selectionEnabled = toggleRowSelection !== undefined;
  const selectedCount = selectedIds.length;
  // While the footer shows the bulk-action bar, the bar owns the count.
  const barOpen = isSelectionBarOpen(ctx);

  const rowInfoText = (() => {
    if (barOpen) return null;
    if (selectionEnabled && selectedCount > 0 && total !== null) {
      return t("paginationSelectedOfTotal", { selected: selectedCount, total });
    }
    if (selectionEnabled && selectedCount > 0) {
      return t("paginationSelectedRows", { selected: selectedCount });
    }
    if (total !== null) {
      return t("paginationTotalRows", { total });
    }
    return null;
  })();

  return (
    // Beside the bar, flex-1 instead of w-full lets both share one line and
    // wraps the controls onto a line of their own only when they don't fit.
    <div
      className={cn(
        "astw:flex astw:items-center astw:justify-between astw:gap-2",
        barOpen ? "astw:flex-1" : "astw:w-full",
      )}
    >
      {rowInfoText && <div className="astw:text-sm astw:text-muted-foreground">{rowInfoText}</div>}
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
    </div>
  );
}
DataTablePagination.displayName = "DataTable.Pagination";
