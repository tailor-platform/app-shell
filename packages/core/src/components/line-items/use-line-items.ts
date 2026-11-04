import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useColumnLayout } from "@/components/internals/table-core/use-column-state";
import { compileLineItemsColumns } from "./columns";
import { bindLineItemsController, createLineItemsController } from "./controller";
import type { UseLineItemsOptions, UseLineItemsReturn } from "./types";

/** Owns one document and its drafts. Mount with a new key to edit a different document. */
export function useLineItems<T extends Record<string, unknown>>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  const [controller] = useState(() => createLineItemsController(options));
  useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const schema = useMemo(() => compileLineItemsColumns(options.columns), [options.columns]);
  const meta = useMemo(
    () =>
      options.columns.map((column) => ({
        id: column.id ?? column.accessorKey!,
        label: column.label,
        pin: column.pin,
      })),
    [options.columns],
  );
  const layout = useColumnLayout(meta, { tableId: options.tableId, namespace: "line-items" });
  const rows = controller.document.getRows();
  const value: UseLineItemsReturn<T> = {
    lines: rows,
    allLines: rows,
    columns: options.columns,
    columnOrder: layout.columnOrder,
    pinnedColumns: layout.pinnedColumns,
    moveColumn: layout.moveColumn,
    setColumnOrder: layout.setColumnOrder,
    setPin: layout.setPin,
    mode: options.mode ?? "edit",
    ordering: options.ordering ?? "sort",
    rowActions: options.rowActions,
    isDirty: controller.document.isDirty(),
    errors: schema.validate(rows, controller.document.getLineKey),
    ...controller.commands,
  };
  bindLineItemsController(value, controller);

  // Commands and retained editors consult only the latest committed owner/rules.
  useLayoutEffect(() => controller.configure(options));
  useEffect(() => {
    controller.activate();
    return controller.deactivate;
  }, [controller]);
  return value;
}
