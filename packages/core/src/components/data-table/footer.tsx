import { useContext, type ReactNode } from "react";
import { TableFooterSurface } from "@/components/internals/table-core/frame";
import { DataTableContext } from "./context";
import {
  DataTableSelectionAnnouncer,
  DataTableSelectionBar,
  hasBulkActions,
  isSelectionBarOpen,
} from "./selection-bar";

/** Use `DataTable.Footer` instead of calling this directly. */
function DataTableFooter({ children, className }: { children?: ReactNode; className?: string }) {
  const ctx = useContext(DataTableContext);
  const offersBulkActions = hasBulkActions(ctx);
  const selecting = isSelectionBarOpen(ctx);

  return (
    <TableFooterSurface
      data-slot="data-table-footer"
      selectionEnabled={offersBulkActions}
      selecting={selecting}
      className={className}
    >
      {selecting && <DataTableSelectionBar />}
      {children}
      {offersBulkActions && <DataTableSelectionAnnouncer open={selecting} />}
    </TableFooterSurface>
  );
}
DataTableFooter.displayName = "DataTable.Footer";

export { DataTableFooter };
