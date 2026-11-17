import { useContext, useMemo, type ReactNode } from "react";
import { Table } from "@/components/table";
import {
  DataTableContext,
  PinMeasureContext,
  hasTreeColumn,
  selectionInTreeColumn,
} from "./context";
import { buildColumnKeys, computePinLayout } from "./column-layout";
import { DataTableLoaderRows, DataTableStatusRow } from "./status-rows";
import { DataTableRows } from "./rows";
import { useDataTableT } from "./i18n";

// Fallback row count when no pageSize is configured (static / uncontrolled tables)
const DEFAULT_ROWS = 5;

/** @internal */
function DataTableBody({
  className,
  emptyContent,
  errorContent,
}: {
  className?: string;
  emptyContent?: ReactNode;
  errorContent?: ReactNode;
}) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Body> must be used within <DataTable.Root>");
  }
  const {
    columns: allColumns,
    visibleColumns: columns,
    hierarchyColumn,
    pinnedColumns,
    rows,
    loading,
    error,
    onClickRow,
    rowActions,
    isRowSelected,
    toggleRowSelection,
    pageSize,
    rowExpansion,
    isRowExpanded,
    toggleRowExpansion,
    visibleRows,
    treeColumnKey,
    toggleSubRows,
    getRowCheckState,
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  // The selection column; with propagating sub-rows the checkboxes move into the tree column.
  const hasSelection = !!toggleRowSelection && !selectionInTreeColumn(ctx);
  const besideTree = hasTreeColumn(ctx);
  const hasExpand = !!rowExpansion;
  const totalColSpan =
    (columns?.length ?? 1) + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0);
  const rowCount = pageSize > 0 ? pageSize : DEFAULT_ROWS;
  const columnKeys = useMemo(
    () => buildColumnKeys(allColumns, hierarchyColumn),
    [allColumns, hierarchyColumn],
  );
  const pinLayout = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, {
        hasSelection,
        hasExpand,
        hasRowActions,
        widths,
        columnKeys,
      }),
    [columns, pinnedColumns, hasSelection, hasExpand, hasRowActions, widths, columnKeys],
  );
  const tableBodyProps = {
    "data-slot": "data-table-body",
    className,
  };
  if (loading) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableLoaderRows
          rowCount={rowCount}
          pinLayout={pinLayout}
          hasSelection={hasSelection}
          besideTree={besideTree}
          hasExpand={hasExpand}
          hasRowActions={hasRowActions}
        />
      </Table.Body>
    );
  }

  if (error) {
    const content =
      errorContent === undefined ? `${t("errorPrefix")} ${error.message}` : errorContent;
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="error">
          {typeof content === "string" ? (
            <span className="astw:text-danger-text">{content}</span>
          ) : (
            content
          )}
        </DataTableStatusRow>
      </Table.Body>
    );
  }

  if (!rows || rows.length === 0) {
    const content = emptyContent === undefined ? t("noData") : emptyContent;
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="empty">
          {typeof content === "string" ? (
            <span className="astw:text-muted-foreground">{content}</span>
          ) : (
            content
          )}
        </DataTableStatusRow>
      </Table.Body>
    );
  }

  return (
    <Table.Body {...tableBodyProps}>
      <DataTableRows
        rows={rows}
        pinLayout={pinLayout}
        hasSelection={hasSelection}
        hasRowActions={hasRowActions}
        isRowSelected={isRowSelected}
        toggleRowSelection={toggleRowSelection}
        rowActions={rowActions}
        onClickRow={onClickRow}
        totalColSpan={totalColSpan}
        rowExpansion={rowExpansion}
        isRowExpanded={isRowExpanded}
        toggleRowExpansion={toggleRowExpansion}
        treeRows={besideTree ? visibleRows : undefined}
        treeColumnKey={treeColumnKey}
        toggleSubRows={toggleSubRows}
        selectionInTree={selectionInTreeColumn(ctx)}
        getRowCheckState={getRowCheckState}
      />
    </Table.Body>
  );
}
DataTableBody.displayName = "DataTable.Body";

export { DataTableBody };
