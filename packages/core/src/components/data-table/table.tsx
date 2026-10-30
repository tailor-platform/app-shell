import { useContext, useEffect, useRef } from "react";
import { Table } from "@/components/table";
import { DataTableContext, PinMeasureContext } from "./context";
import { DataTableHeaders } from "./header";
import { DataTableBody } from "./body";
import { DataTableColumnFooter } from "./column-footer";
import { useTableMeasurements } from "./use-table-measurements";

/** Use `DataTable.Table` instead of calling this directly. */
function DataTableTable({ className }: { className?: string }) {
  const ctx = useContext(DataTableContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleColumns = ctx?.visibleColumns;
  const pinnedColumns = ctx?.pinnedColumns;
  const currentPage = ctx?.currentPage;
  const pageSize = ctx?.pageSize;
  const hasSelection = !!ctx?.toggleRowSelection;
  const hasExpand = !!ctx?.rowExpansion;
  const hasRowActions = !!ctx?.rowActions?.length;

  const widths = useTableMeasurements(containerRef, {
    visibleColumns,
    pinnedColumns,
    hasSelection,
    hasExpand,
    hasRowActions,
  });

  // Keep pagination-driven scroll reset local to the scroll owner. The scroll
  // container lives here in `DataTable.Table`, while page changes can come from
  // the built-in pagination or any custom consumer using the same context.
  // Threading an imperative callback/event bus through `DataTable.Root` just to
  // reach this ref would add API surface and create opt-in call sites; this
  // effect stays as the single place that synchronizes page/page-size state to
  // the DOM scroll position.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [currentPage, pageSize]);

  return (
    // min-h-0 lets the scroll container shrink within DataTable.Root's flex
    // column; combined with the container's overflow-auto this is the region
    // that scrolls vertically when height is constrained. The sticky header
    // (DataTableHeaders) stays pinned to the top of this scrollport.
    <PinMeasureContext.Provider value={widths}>
      <Table.Root
        data-slot="data-table-table"
        containerRef={containerRef}
        containerClassName="astw:min-h-0 astw:overflow-auto"
        className={className}
      >
        <DataTableHeaders />
        <DataTableBody />
        <DataTableColumnFooter />
      </Table.Root>
    </PinMeasureContext.Provider>
  );
}
DataTableTable.displayName = "DataTable.Table";

export { DataTableTable };
