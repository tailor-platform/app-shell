import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DataTableColumnSettings } from "./column-settings";

// =============================================================================
// DataTable.Toolbar
// =============================================================================

/** Use `DataTable.Toolbar` instead of calling this directly. */
function DataTableToolbar({
  children,
  columnSettings = false,
  className,
}: {
  children?: ReactNode;
  /**
   * Render the built-in column-settings control (a "Columns" button that opens
   * the show/hide + reorder + pin popover) anchored to the top-right of the
   * toolbar. The button always lives in the same place, so it's a prop rather
   * than a separately-composed sub-component.
   */
  columnSettings?: boolean;
  className?: string;
}) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "astw:flex astw:shrink-0 astw:items-start astw:gap-2 astw:border-b astw:border-border astw:p-2",
        className,
      )}
    >
      {/* Left group keeps children in their original vertical stack (so existing
          toolbars are visually unchanged); the settings button sits top-right. */}
      <div className="astw:flex astw:min-w-0 astw:flex-1 astw:flex-col astw:gap-2">{children}</div>
      {columnSettings && <DataTableColumnSettings />}
    </div>
  );
}

DataTableToolbar.displayName = "DataTable.Toolbar";

export { DataTableToolbar };
