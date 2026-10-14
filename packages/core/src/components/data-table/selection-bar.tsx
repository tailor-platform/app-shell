import {
  SelectionActionsAnnouncer,
  SelectionActionsBar,
} from "@/components/internals/selection-actions/selection-actions-bar";
import { useDataTableContext, type DataTableContextValue } from "./data-table-context";

/**
 * Whether the table offers bulk actions at all: selection is on and the hook
 * was given at least one `selectionActions` entry.
 */
export function hasSelectionActions<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return !!ctx?.toggleRowSelection && (ctx.selectionActions?.length ?? 0) > 0;
}

/** Whether `DataTable.Footer` is currently showing the bulk-action bar. */
export function isSelectionBarOpen<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return hasSelectionActions(ctx) && (ctx?.selectedIds.length ?? 0) > 0;
}

/**
 * The bulk-action bar `DataTable.Footer` renders while rows are selected:
 * count · actions · overflow menu · Clear.
 */
export function DataTableSelectionBar<TRow extends Record<string, unknown>>() {
  const {
    selectionActions = [],
    selectedRows = [],
    total,
    clearSelection,
    pendingActionId = null,
    runSelectionAction,
  } = useDataTableContext<TRow>();

  return (
    <SelectionActionsBar
      actions={selectionActions}
      selectedRows={selectedRows}
      total={total}
      clearSelection={clearSelection}
      pendingActionId={pendingActionId}
      runSelectionAction={runSelectionAction}
      // Hand focus to the header checkbox instead of letting it drop to <body>.
      returnFocusTo={(bar) =>
        bar
          .closest<HTMLElement>('[data-slot="data-table"]')
          ?.querySelector<HTMLElement>('[data-slot="data-table-header"] [data-slot="checkbox"]')
      }
    />
  );
}
DataTableSelectionBar.displayName = "DataTable.SelectionBar";

/** Polite live region for the selection count. See `SelectionActionsAnnouncer`. */
export function DataTableSelectionAnnouncer({ open }: { open: boolean }) {
  const { selectedIds, total } = useDataTableContext();
  return <SelectionActionsAnnouncer open={open} selected={selectedIds.length} total={total} />;
}
