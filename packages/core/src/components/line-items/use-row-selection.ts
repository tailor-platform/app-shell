import { useRowSelection as useTableRowSelection } from "@/components/internals/table-core/use-row-selection";
import type { RowSelectionOptions } from "@/components/internals/table-core/selection-types";
import type { LineItemsController } from "./controller";

/** Shared selection mechanics, with document-owned membership and identity reconciliation. */
export function useRowSelection<T extends Record<string, unknown>>(
  lines: readonly T[],
  options: RowSelectionOptions | undefined,
  controller: LineItemsController<T>,
) {
  const document = controller.document;
  const validIds = new Set(document.getRows().map(document.getLineKey));
  const config =
    options &&
    (options.selectedIds !== undefined
      ? { ...options, selectedIds: options.selectedIds.filter((id) => validIds.has(id)) }
      : {
          ...options,
          defaultSelectedIds: options.defaultSelectedIds?.filter((id) => validIds.has(id)),
        });
  const { reconcileSelection, ...selection } = useTableRowSelection(
    lines,
    config,
    undefined,
    document.getLineKey,
    "LineItems",
  );
  const selectedIds = selection.selectedIds.filter((id) => validIds.has(id));

  return {
    ...selection,
    selectedIds,
    isIndeterminate: selectedIds.length > 0 && !selection.isAllSelected,
    reconcileAfter(change: () => void) {
      const before = new Map(
        document.getRows().map((row) => [document.getLineKey(row), document.getClientKey(row)]),
      );
      reconcileSelection((ids) => {
        change();
        const after = new Map(
          document.getRows().map((row) => [document.getClientKey(row), document.getLineKey(row)]),
        );
        const currentIds = new Set(after.values());
        return ids
          .map((id) => {
            const key = before.get(id);
            if (key !== undefined && after.has(key)) return after.get(key)!;
            return currentIds.has(id) ? id : null;
          })
          .filter((id): id is string => id !== null);
      });
    },
  };
}
