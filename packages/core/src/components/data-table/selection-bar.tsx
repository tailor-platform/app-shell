import { TableSelectionBar } from "@/components/internals/table-core/selection-bar";
import { useDataTableContext, type DataTableContextValue } from "./context";
import { useDataTableT } from "./i18n";

export function hasBulkActions<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return !!ctx?.toggleRowSelection && (ctx.rowSelection?.actions?.length ?? 0) > 0;
}

export function isSelectionBarOpen<TRow extends Record<string, unknown>>(
  ctx: DataTableContextValue<TRow> | null,
): boolean {
  return hasBulkActions(ctx) && (ctx?.selectedIds.length ?? 0) > 0;
}

function useSelectionCountText(): string {
  const { selectedIds, total } = useDataTableContext();
  const t = useDataTableT();
  return t("selectionCount", { selected: selectedIds.length, total });
}

function restoreDataTableFocus(bar: HTMLElement) {
  bar
    .closest<HTMLElement>('[data-slot="data-table"]')
    ?.querySelector<HTMLElement>('[data-slot="data-table-header"] [data-slot="checkbox"]')
    ?.focus();
}

export function DataTableSelectionBar<TRow extends Record<string, unknown>>() {
  const {
    rowSelection,
    selectedIds,
    clearSelection,
    pendingActionId = null,
    runSelectionAction,
  } = useDataTableContext<TRow>();
  const t = useDataTableT();
  return (
    <TableSelectionBar
      countText={useSelectionCountText()}
      actions={rowSelection?.actions ?? []}
      selectedIds={selectedIds}
      clearSelection={() => clearSelection?.()}
      pendingActionId={pendingActionId}
      runSelectionAction={runSelectionAction}
      labels={{
        bulkActions: t("bulkActionsLabel"),
        moreActions: t("selectionMoreActions"),
        clear: t("selectionClear"),
        clearSelection: t("selectionClearLabel"),
      }}
      onFocusedUnmount={restoreDataTableFocus}
    />
  );
}
DataTableSelectionBar.displayName = "DataTable.SelectionBar";

/** Remains mounted so the first selection is announced as well as subsequent changes. */
export function DataTableSelectionAnnouncer({ open }: { open: boolean }) {
  const countText = useSelectionCountText();
  return (
    <span className="astw:sr-only" aria-live="polite" aria-atomic="true">
      {open ? countText : ""}
    </span>
  );
}
