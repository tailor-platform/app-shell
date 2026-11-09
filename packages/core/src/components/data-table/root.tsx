import type { ReactNode } from "react";
import { TableFrame } from "@/components/internals/table-core/frame";
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
        <TableFrame data-slot="data-table" className={className}>
          {children}
        </TableFrame>
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
