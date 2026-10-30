import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CollectionControlProvider } from "@/contexts/collection-control-context";
import { Tooltip } from "@/components/tooltip";
import type { UseDataTableReturn } from "./types";
import { DataTableContext, type DataTableContextValue } from "./context";

export interface DataTableRootProps<TRow extends Record<string, unknown>> {
  value: UseDataTableReturn<TRow>;
  children: ReactNode;
  className?: string;
}

/** Use `DataTable.Root` instead of calling this directly. */
function DataTableRoot<TRow extends Record<string, unknown>>({
  value,
  children,
  className,
}: DataTableRootProps<TRow>) {
  const dataTableValue: DataTableContextValue<TRow> = {
    columns: value.columns,
    rows: value.rows,
    loading: value.loading,
    error: value.error,
    sortStates: value.sortStates ?? [],
    onSort: value.onSort,
    visibleColumns: value.visibleColumns,
    isColumnVisible: value.isColumnVisible,
    toggleColumn: value.toggleColumn,
    showAllColumns: value.showAllColumns,
    hideAllColumns: value.hideAllColumns,
    columnOrder: value.columnOrder,
    moveColumn: value.moveColumn,
    setColumnOrder: value.setColumnOrder,
    pinnedColumns: value.pinnedColumns,
    setPin: value.setPin,
    pageInfo: value.pageInfo,
    total: value.total,
    totalPages: value.totalPages,
    currentPage: value.currentPage,
    pageSize: value.pageSize,
    setPageSize: value.setPageSize,
    goToNextPage: value.goToNextPage,
    goToPrevPage: value.goToPrevPage,
    goToFirstPage: value.goToFirstPage,
    goToLastPage: value.goToLastPage,
    hasPrevPage: value.hasPrevPage,
    hasNextPage: value.hasNextPage,
    onClickRow: value.onClickRow,
    rowActions: value.rowActions,
    rowSelection: value.rowSelection,
    selectedIds: value.selectedIds,
    isRowSelected: value.isRowSelected,
    toggleRowSelection: value.toggleRowSelection,
    selectAllRows: value.selectAllRows,
    deselectAllRows: value.deselectAllRows,
    clearSelection: value.clearSelection,
    pendingActionId: value.pendingActionId,
    runSelectionAction: value.runSelectionAction,
    isAllSelected: value.isAllSelected,
    isIndeterminate: value.isIndeterminate,
    expandedIds: value.expandedIds,
    isRowExpanded: value.isRowExpanded,
    toggleRowExpansion: value.toggleRowExpansion,
    collapseAllRows: value.collapseAllRows,
    rowExpansion: value.rowExpansion,
  };

  const controlValue = value.control ?? null;

  // Tooltip.Provider shares hover-delay state for the per-cell truncate
  // tooltips; benign no-op when no column opts into `truncate`.
  const inner = (
    <Tooltip.Provider delay={300}>
      <DataTableContext.Provider value={dataTableValue}>
        {/* flex-col + min-h-0 (no flex-1): natural height when content fits,
            but able to shrink when the parent chain constrains height (e.g.
            <Layout fill>). When shrunk, the Table region scrolls internally
            while the Toolbar and Footer (shrink-0) stay visible.
            overflow-clip, not overflow-hidden: both clip children to the
            rounded frame, but `hidden` also makes this a scroll container,
            which would pin the sticky selection-actions footer to the table
            instead of letting it ride the page's scroll container. */}
        <div
          data-slot="data-table"
          className={cn(
            "astw:flex astw:flex-col astw:min-h-0 astw:overflow-clip astw:border astw:border-border astw:rounded-md astw:bg-card",
            // A generic Toolbar becomes the table's top edge: preserve its top
            // corners, but retain only the divider beneath it.
            "astw:[&>[data-slot=toolbar]]:rounded-b-none astw:[&>[data-slot=toolbar]]:border-x-0 astw:[&>[data-slot=toolbar]]:border-t-0",
            className,
          )}
        >
          {children}
        </div>
      </DataTableContext.Provider>
    </Tooltip.Provider>
  );

  if (controlValue) {
    return <CollectionControlProvider value={controlValue}>{inner}</CollectionControlProvider>;
  }

  return inner;
}
DataTableRoot.displayName = "DataTable.Root";

export { DataTableRoot };
