import { useMemo } from "react";
import { ColumnSettings } from "@/components/internals/table-core/column-settings";
import { useDataTableContext } from "./context";
import { columnKeyAt } from "./column-layout";

/** DataTable's adapter retains visibility controls and its existing popup slot. */
function DataTableColumnSettings({ className }: { className?: string }) {
  const value = useDataTableContext<Record<string, unknown>>();
  const columns = useMemo(
    () =>
      value.columns.map((column, index) => ({
        id: columnKeyAt(column, index),
        label: column.label,
        pin: column.pin,
      })),
    [value.columns],
  );
  return (
    <ColumnSettings
      columns={columns}
      columnOrder={value.columnOrder}
      pinnedColumns={value.pinnedColumns}
      setColumnOrder={(ids) => value.setColumnOrder([...ids])}
      setPin={value.setPin}
      visibility={{
        isColumnVisible: value.isColumnVisible,
        toggleColumn: value.toggleColumn,
        showAllColumns: value.showAllColumns,
        hideAllColumns: value.hideAllColumns,
      }}
      className={className}
      popupSlot="data-table-column-settings-popup"
    />
  );
}
DataTableColumnSettings.displayName = "DataTable.ColumnSettings";
export { DataTableColumnSettings };
