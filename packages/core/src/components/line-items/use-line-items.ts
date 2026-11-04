import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useColumnLayout } from "@/components/internals/table-core/use-column-state";
import { filterRowsByQuery } from "@/components/internals/table-core/row-search";
import { compileLineItemsColumns } from "./columns";
import { bindLineItemsController, createLineItemsController } from "./controller";
import { useRowSelection } from "./use-row-selection";
import type { UseLineItemsOptions, UseLineItemsReturn } from "./types";

/** Owns one document and its drafts. Mount with a new key to edit a different document. */
export function useLineItems<T extends Record<string, unknown>>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  const [controller] = useState(() => createLineItemsController(options));
  const [searchQuery, setSearchQuery] = useState("");
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
  const searchColumns = useMemo(
    () =>
      options.columns.map((column) => ({
        getValue: (row: T) =>
          column.accessorKey !== undefined ? row[column.accessorKey] : column.accessor?.(row),
        search: column.search,
      })),
    [options.columns],
  );
  const lines = useMemo(
    () => filterRowsByQuery(rows, searchColumns, searchQuery),
    [rows, searchColumns, searchQuery],
  );
  const { reconcileAfter, ...selection } = useRowSelection(lines, options.rowSelection, controller);
  const value: UseLineItemsReturn<T> = {
    lines,
    allLines: rows,
    searchQuery,
    setSearchQuery,
    columns: options.columns,
    columnOrder: layout.columnOrder,
    pinnedColumns: layout.pinnedColumns,
    moveColumn: layout.moveColumn,
    setColumnOrder: layout.setColumnOrder,
    setPin: layout.setPin,
    mode: options.mode ?? "edit",
    ordering: options.ordering ?? "sort",
    rowActions: options.rowActions,
    rowSelection: options.rowSelection,
    ...selection,
    isDirty: controller.document.isDirty(),
    errors: schema.validate(rows, controller.document.getLineKey),
    ...controller.commands,
    reset: (saved, resetOptions) =>
      reconcileAfter(() => controller.commands.reset(saved, resetOptions)),
    revert: () => reconcileAfter(controller.commands.revert),
    removeLine: (key) => reconcileAfter(() => controller.commands.removeLine(key)),
    removeLines: (keys) => reconcileAfter(() => controller.commands.removeLines(keys)),
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
