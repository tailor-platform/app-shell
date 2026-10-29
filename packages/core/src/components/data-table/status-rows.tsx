import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/table";
import {
  ACTIONS_WIDTH,
  EXPAND_WIDTH,
  SELECTION_WIDTH,
  pinCellProps,
  resolveAlign,
  type PinLayout,
} from "./column-layout";

// Empty/error states reserve a fixed 3 rows' worth of height — enough to
// read as an intentional region, independent of pageSize (so large page
// sizes don't create a huge blank or, when height-constrained, scrollable
// area, and tiny page sizes don't collapse to a thin strip).
const STATUS_ROWS = 3;
const ROW_HEIGHT_PX = 53;

interface DataTableLoaderRowsProps<TRow extends Record<string, unknown>> {
  rowCount: number;
  pinLayout: PinLayout<TRow>;
  hasSelection: boolean;
  hasExpand: boolean;
  hasRowActions: boolean;
}

// Skeleton cell widths (%) — varied per row+col to look natural
const SKELETON_WIDTHS = [75, 55, 85, 65, 70];

/** @internal */
function DataTableLoaderRows<TRow extends Record<string, unknown>>({
  rowCount,
  pinLayout,
  hasSelection,
  hasExpand,
  hasRowActions,
}: DataTableLoaderRowsProps<TRow>) {
  const { ordered: columns, keys, placements, selection, expand, actions } = pinLayout;
  // No fixed row height: each cell's placeholder matches the height of the
  // real content it stands in for (text line, badge, icon button), so the
  // skeleton rows resolve to exactly the same row height as loaded rows and
  // the table doesn't shift when data arrives.
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <Table.Row key={rowIndex} data-datatable-state="loading" className="astw:group">
          {hasSelection &&
            (() => {
              const { style, className } = pinCellProps(
                selection,
                { style: { width: SELECTION_WIDTH }, className: "astw:pl-3!" },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  <div className="astw:size-4 astw:rounded-xs astw:bg-muted astw:animate-pulse" />
                </Table.Cell>
              );
            })()}
          {hasExpand &&
            (() => {
              const { style, className } = pinCellProps(
                expand,
                { style: { width: EXPAND_WIDTH } },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  {/* size-9 box = the real chevron Button's footprint, so the
                      skeleton row resolves to the same height as a loaded row */}
                  <div className="astw:mx-auto astw:flex astw:size-9 astw:items-center astw:justify-center">
                    <div className="astw:size-4 astw:rounded astw:bg-muted astw:animate-pulse" />
                  </div>
                </Table.Cell>
              );
            })()}
          {columns?.map((col, colIndex) => {
            const key = keys.get(col) as string;
            const skeletonWidth = SKELETON_WIDTHS[(rowIndex + colIndex) % SKELETON_WIDTHS.length];
            const isBadge = col.type === "badge";
            const { style, className } = pinCellProps(
              placements.get(col),
              { style: col.width ? { width: col.width } : undefined },
              "body",
            );
            return (
              <Table.Cell key={key} style={style} className={className}>
                <div
                  className={cn(
                    "astw:bg-muted astw:animate-pulse",
                    // badge cells render 22px pills; text cells occupy one
                    // 20px line box (bar inset by my-0.5 to keep the lighter
                    // 16px placeholder look)
                    isBadge ? "astw:h-5.5 astw:rounded-full" : "astw:h-4 astw:my-0.5 astw:rounded",
                    resolveAlign(col) === "right" && "astw:ml-auto",
                  )}
                  style={{ width: `${skeletonWidth}%` }}
                />
              </Table.Cell>
            );
          })}
          {hasRowActions &&
            (() => {
              const { style, className } = pinCellProps(
                actions,
                { style: { width: ACTIONS_WIDTH }, className: "astw:pr-2!" },
                "body",
              );
              return (
                <Table.Cell style={style} className={className}>
                  {/* size-9 box = the real icon Button's footprint; the visible
                      pulse stays 24px to read as an ellipsis placeholder */}
                  <div className="astw:mx-auto astw:flex astw:size-9 astw:items-center astw:justify-center">
                    <div className="astw:size-6 astw:rounded astw:bg-muted astw:animate-pulse" />
                  </div>
                </Table.Cell>
              );
            })()}
        </Table.Row>
      ))}
    </>
  );
}

// =============================================================================
// DataTableStatusRow (internal)
// =============================================================================

interface DataTableStatusRowProps {
  totalColSpan: number;
  state: string;
  children: ReactNode;
}

/** @internal */
function DataTableStatusRow({ totalColSpan, state, children }: DataTableStatusRowProps) {
  return (
    <Table.Row data-datatable-state={state} className="astw:border-0 astw:hover:bg-transparent">
      {/* Reserve a fixed 3-row height (acts as a minimum — the cell grows if a
          bounded container makes the row taller), independent of pageSize so
          large page sizes don't create a huge blank/scrollable region.
          `align-middle` centres the message vertically within that height. */}
      <Table.Cell
        colSpan={totalColSpan}
        style={{ height: `${STATUS_ROWS * ROW_HEIGHT_PX}px` }}
        className="astw:text-center astw:align-middle"
      >
        {children}
      </Table.Cell>
    </Table.Row>
  );
}

export { DataTableLoaderRows, DataTableStatusRow };
