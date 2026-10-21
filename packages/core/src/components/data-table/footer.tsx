import { useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
    <div
      data-slot="data-table-footer"
      data-selecting={selecting ? "" : undefined}
      className={cn(
        "astw:flex astw:shrink-0 astw:items-center astw:border-t astw:border-border astw:px-4 astw:py-2",
        offersBulkActions && "astw:transition-colors astw:motion-reduce:transition-none",
        selecting && [
          "astw:flex-wrap astw:gap-x-3 astw:gap-y-2",
          "astw:bg-accent astw:text-accent-foreground",
          "astw:rounded-b-[calc(var(--radius-md)-1px)]",
          // Sticky while the bar is up: on a page-scrolling table it rides the
          // bottom of the viewport until the table's own end scrolls into view.
          // A no-op in <Layout fill>, where the footer is already pinned.
          "astw:sticky astw:bottom-0 astw:z-20",
          // The bar's surface, captured for the wrapper below: a token can't be
          // re-pointed in terms of itself on a single element.
          "astw:[--data-table-selection-surface:var(--accent)]",
        ],
        className,
      )}
    >
      {offersBulkActions ? (
        // `contents` keeps the wrapper out of layout. It re-points the hover and
        // secondary-text tokens for everything on the tinted bar — the bar's own
        // buttons and the consumer's Pagination alike — which would otherwise
        // hover to the bar's colour and lose contrast on it.
        <div
          className={cn(
            "astw:contents",
            selecting && [
              "astw:[--accent:color-mix(in_srgb,var(--accent-foreground)_8%,var(--data-table-selection-surface))]",
              "astw:[--muted-foreground:color-mix(in_srgb,var(--accent-foreground)_70%,var(--data-table-selection-surface))]",
            ],
          )}
        >
          {selecting && <DataTableSelectionBar />}
          {children}
          <DataTableSelectionAnnouncer open={selecting} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
DataTableFooter.displayName = "DataTable.Footer";

export { DataTableFooter };
