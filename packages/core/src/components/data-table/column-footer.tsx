import { useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/table";
import { DataTableContext, PinMeasureContext } from "./context";
import {
  SELECTION_WIDTH,
  SELECTION_KEY,
  EXPAND_WIDTH,
  EXPAND_KEY,
  ACTIONS_WIDTH,
  ACTIONS_KEY,
  buildColumnKeys,
  computePinLayout,
  pinCellProps,
  resolveAlign,
} from "./column-layout";

function DataTableColumnFooter() {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("<DataTableColumnFooter> must be used within <DataTable.Root>");
  }
  const {
    columns: allColumns,
    visibleColumns: columns,
    pinnedColumns,
    rows,
    loading,
    error,
    toggleRowSelection,
    rowExpansion,
    rowActions,
  } = ctx;
  const widths = useContext(PinMeasureContext);
  const hasSelection = !!toggleRowSelection;
  const hasExpand = !!rowExpansion;
  const hasRowActions = !!rowActions?.length;
  const columnKeys = useMemo(() => buildColumnKeys(allColumns), [allColumns]);
  const { ordered, keys, placements, selection, expand, actions } = useMemo(
    () =>
      computePinLayout(columns, pinnedColumns, {
        hasSelection,
        hasExpand,
        hasRowActions,
        widths,
        columnKeys,
      }),
    [columns, pinnedColumns, hasSelection, hasExpand, hasRowActions, widths, columnKeys],
  );

  if (error || !ordered.some((col) => col.footer !== undefined)) return null;

  return (
    <Table.Footer
      data-slot="data-table-column-footer"
      className={cn(
        "astw:sticky astw:bottom-0 astw:z-10 astw:bg-card",
        "astw:border-t-0 astw:shadow-[inset_0_1px_0_0_var(--border)]",
      )}
    >
      <Table.Row className="astw:hover:bg-transparent">
        {hasSelection && (
          <Table.Cell
            data-slot="data-table-column-footer-cell"
            data-col-key={SELECTION_KEY}
            {...pinCellProps(
              selection,
              { style: { width: SELECTION_WIDTH }, className: "astw:pl-3!" },
              "footer",
            )}
          />
        )}
        {hasExpand && (
          <Table.Cell
            data-slot="data-table-column-footer-cell"
            data-col-key={EXPAND_KEY}
            {...pinCellProps(expand, { style: { width: EXPAND_WIDTH } }, "footer")}
          />
        )}
        {ordered.map((col) => {
          const key = keys.get(col) as string;
          const footerContext = { rows };
          const customFooterProps = loading ? undefined : col.footerProps?.(footerContext);
          let footerContent: ReactNode = null;
          if (!loading) {
            footerContent =
              typeof col.footer === "function" ? col.footer(footerContext) : col.footer;
          }
          const { style, className } = pinCellProps(
            placements.get(col),
            {
              style: {
                ...customFooterProps?.style,
                ...(col.width ? { width: col.width } : {}),
              },
              className: cn(resolveAlign(col) === "right" && "astw:text-right"),
            },
            "footer",
          );
          return (
            <Table.Cell
              key={key}
              data-slot="data-table-column-footer-cell"
              data-col-key={key}
              title={customFooterProps?.title}
              style={style}
              className={cn(className, customFooterProps?.className)}
            >
              {col.footer !== undefined &&
                (loading ? (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "astw:h-4 astw:my-0.5 astw:w-3/5 astw:rounded astw:bg-muted astw:animate-pulse",
                      resolveAlign(col) === "right" && "astw:ml-auto",
                    )}
                  />
                ) : (
                  footerContent
                ))}
            </Table.Cell>
          );
        })}
        {hasRowActions && (
          <Table.Cell
            data-slot="data-table-column-footer-cell"
            data-col-key={ACTIONS_KEY}
            {...pinCellProps(
              actions,
              { style: { width: ACTIONS_WIDTH }, className: "astw:pr-2!" },
              "footer",
            )}
          />
        )}
      </Table.Row>
    </Table.Footer>
  );
}

export { DataTableColumnFooter };
