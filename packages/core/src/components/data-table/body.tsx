import { useContext, useMemo } from "react";
import { Table } from "@/components/table";
import { DataTableContext, PinMeasureContext } from "./context";
import { buildColumnKeys, computePinLayout } from "./column-layout";
import { DataTableLoaderRows, DataTableStatusRow } from "./status-rows";
import { DataTableRows } from "./rows";
import { useDataTableT } from "./i18n";

// Fallback row count when no pageSize is configured (static / uncontrolled tables)
const DEFAULT_ROWS = 5;

/** @internal */
function DataTableBody({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTable.Body> must be used within <DataTable.Root>");
  }
  const {
    columns: allColumns,
    visibleColumns: columns,
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
  } = ctx;
  const t = useDataTableT();
  const widths = useContext(PinMeasureContext);
  const hasRowActions = !!(rowActions && rowActions.length > 0);
  const hasSelection = !!toggleRowSelection;
  const hasExpand = !!rowExpansion;
  const totalColSpan =
    (columns?.length ?? 1) + (hasRowActions ? 1 : 0) + (hasSelection ? 1 : 0) + (hasExpand ? 1 : 0);
  const rowCount = pageSize > 0 ? pageSize : DEFAULT_ROWS;
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
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
          hasExpand={hasExpand}
          hasRowActions={hasRowActions}
        />
      </Table.Body>
    );
  }

  if (error) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="error">
          <span className="astw:text-danger-text">
            {t("errorPrefix")} {error.message}
          </span>
        </DataTableStatusRow>
      </Table.Body>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Table.Body {...tableBodyProps}>
        <DataTableStatusRow totalColSpan={totalColSpan} state="empty">
          <span className="astw:text-muted-foreground">{t("noData")}</span>
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
      />
    </Table.Body>
  );
}
DataTableBody.displayName = "DataTable.Body";

export { DataTableBody };
