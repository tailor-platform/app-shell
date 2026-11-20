import { useId } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { useDataTableContext } from "./context";
import { useDataTableT } from "./i18n";
import { isSelectionBarOpen, NARROW_FOOTER_ONLY, NARROW_FOOTER_SR_ONLY } from "./selection-bar";

/**
 * In a narrow footer the page buttons shrink from 36px to 28px, which still
 * clears the 24px minimum target size, so the row count and the page buttons
 * fit on one line at phone widths.
 */
const NARROW_PAGE_BUTTON = "astw:@max-[480px]/data-table-footer:size-7";

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
  const pageSizeLabelId = useId();

  const selectionEnabled = toggleRowSelection !== undefined;
  const selectedCount = selectedIds.length;
  // While the footer shows the bulk-action bar, the bar owns the count.
  const barOpen = isSelectionBarOpen(ctx);

  // `short` replaces `full` in a narrow footer; `full` stays for screen readers.
  const rowInfo = ((): { full: string; short?: string } | null => {
    if (barOpen) return null;
    if (selectionEnabled && selectedCount > 0 && total !== null) {
      return {
        full: t("paginationSelectedOfTotal", { selected: selectedCount, total }),
        short: t("paginationSelectedOfTotalShort", { selected: selectedCount, total }),
      };
    }
    if (selectionEnabled && selectedCount > 0) {
      return { full: t("paginationSelectedRows", { selected: selectedCount }) };
    }
    if (total !== null) {
      return { full: t("paginationTotalRows", { total }) };
    }
    return null;
  })();

  return (
    // Beside the bar, flex-1 instead of w-full lets both share one line and
    // wraps the controls onto a line of their own only when they don't fit.
    // The row count, the page-size switcher and the page buttons are siblings
    // in one wrapping row, so a narrow footer (phone widths) breaks between
    // them instead of letting the table frame clip the buttons. The count's
    // mr-auto keeps it on the left; everything else packs to the right.
    <div
      className={cn(
        "astw:flex astw:flex-wrap astw:items-center astw:justify-end astw:gap-2",
        barOpen ? "astw:flex-1" : "astw:w-full",
      )}
    >
      {rowInfo && (
        <div className="astw:mr-auto astw:text-body-md astw:text-muted-foreground astw:whitespace-nowrap">
          {rowInfo.short ? (
            <>
              <span className={NARROW_FOOTER_SR_ONLY}>{rowInfo.full}</span>
              <span aria-hidden="true" className={NARROW_FOOTER_ONLY}>
                {rowInfo.short}
              </span>
            </>
          ) : (
            rowInfo.full
          )}
        </div>
      )}
      {/* A narrow footer drops the page-size switcher, as MUI does: on a phone
          it costs a line of its own. */}
      {pageSizeOptions && pageSizeOptions.length > 0 && (
        <div className="astw:flex astw:items-center astw:gap-1.5 astw:@max-[480px]/data-table-footer:hidden">
          <span
            id={pageSizeLabelId}
            className="astw:text-body-md astw:text-muted-foreground astw:whitespace-nowrap"
          >
            {t("paginationRowsPerPage")}
          </span>
          <Select
            aria-labelledby={pageSizeLabelId}
            items={pageSizeOptions.map(String)}
            value={String(pageSize)}
            onValueChange={(item) => {
              if (item) setPageSize(Number(item));
            }}
            className="astw:w-17.5"
          />
        </div>
      )}
      {/* The page text and its buttons wrap as one unit, so the buttons never
            split across lines. */}
      <div className="astw:flex astw:items-center astw:gap-2 astw:@max-[480px]/data-table-footer:gap-1">
        {totalPages !== null && (
          <>
            {/* The full "Page 1 / 5" stays one text node for screen readers
                  and text queries; a narrow footer shows "1/5" in its place. */}
            <span
              className={cn(
                "astw:text-body-md astw:text-muted-foreground astw:tabular-nums astw:whitespace-nowrap",
                NARROW_FOOTER_SR_ONLY,
              )}
            >
              {t("paginationPage")} {currentPage} / {totalPages}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "astw:text-body-md astw:text-muted-foreground astw:tabular-nums astw:whitespace-nowrap",
                NARROW_FOOTER_ONLY,
              )}
            >
              {currentPage}/{totalPages}
            </span>
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          className={NARROW_PAGE_BUTTON}
          onClick={goToFirstPage}
          disabled={!hasPrevPage}
          aria-label={t("paginationFirst")}
        >
          <ChevronsLeft className="astw:size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={NARROW_PAGE_BUTTON}
          onClick={() => goToPrevPage(pageInfo)}
          disabled={!hasPrevPage}
          aria-label={t("paginationPrevious")}
        >
          <ChevronLeft className="astw:size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={NARROW_PAGE_BUTTON}
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
            className={NARROW_PAGE_BUTTON}
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
