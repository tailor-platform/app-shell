import { useMemo } from "react";
import { ColumnSettings } from "@/components/internals/table-core/column-settings";
import { useLineItemsContext } from "./line-items-context";

export type LineItemsColumnSettingsProps = { className?: string };

/** Uses the same controller as Table; only layout preferences are changed. */
export function LineItemsColumnSettings({ className }: LineItemsColumnSettingsProps) {
  const value = useLineItemsContext<Record<string, unknown>>("LineItems.ColumnSettings");
  const columns = useMemo(
    () =>
      value.columns.map((column) => ({
        id: column.id ?? column.accessorKey!,
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
      setColumnOrder={value.setColumnOrder}
      setPin={value.setPin}
      className={className}
      popupSlot="line-items-column-settings-popup"
    />
  );
}
LineItemsColumnSettings.displayName = "LineItems.ColumnSettings";
