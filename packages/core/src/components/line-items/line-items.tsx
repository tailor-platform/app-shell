import { useMemo, useRef, type ReactNode } from "react";
import { Table } from "@/components/table";
import { Text } from "@/components/text";
import { useTimeZone } from "@/contexts/appshell-context";
import { createValueRenderer } from "@/components/internals/table-core/cell-renderers";
import { cn } from "@/lib/utils";
import { getLineItemsController } from "./controller";
import { LineItemsCell } from "./line-items-cell";
import { useLineItemsT } from "./i18n";
import { useColumnSizing } from "./use-column-sizing";
import type { UseLineItemsReturn } from "./types";
import { LineItemsContext as Context, useLineItemsContext } from "./line-items-context";
import { LineItemsColumnSettings } from "./column-settings";
import {
  computePinPlacements,
  pinCellProps,
  resolvePin,
} from "@/components/internals/table-core/pin-layout";
import { usePinShadows } from "@/components/internals/table-core/use-pin-shadows";
import { TableHeaderContextMenu } from "@/components/internals/table-core/header-context-menu";

function align(column: { align?: "left" | "center" | "right"; type?: string }) {
  return column.align ?? (column.type === "number" || column.type === "money" ? "right" : "left");
}

export type LineItemsRootProps<T extends Record<string, unknown>> = {
  value: UseLineItemsReturn<T>;
  children: ReactNode;
  className?: string;
};

function Root<T extends Record<string, unknown>>({
  value,
  children,
  className,
}: LineItemsRootProps<T>) {
  getLineItemsController(value);
  return (
    <Context.Provider value={value}>
      <div data-slot="line-items" data-mode={value.mode} className={cn("astw:min-w-0", className)}>
        {children}
      </div>
    </Context.Provider>
  );
}

export type LineItemsTableProps = {
  className?: string;
  emptyMessage?: ReactNode;
  "aria-label"?: string;
};

function LineItemsTable({ className, emptyMessage, "aria-label": label }: LineItemsTableProps) {
  const value = useLineItemsContext<Record<string, unknown>>("LineItems.Table");
  const controller = getLineItemsController(value);
  const errors = useMemo(() => {
    const byRow = new Map<string, Map<string, string>>();
    for (const error of value.errors) {
      let row = byRow.get(error.lineKey);
      if (!row) {
        row = new Map();
        byRow.set(error.lineKey, row);
      }
      row.set(error.columnId, error.message);
    }
    return byRow;
  }, [value.errors]);
  const t = useLineItemsT();
  const { value: timeZone } = useTimeZone();
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => {
    const byId = new Map(value.columns.map((column) => [column.id ?? column.accessorKey!, column]));
    const ordered = value.columnOrder
      .map((id) => ({ id, column: byId.get(id)! }))
      .filter((entry) => entry.column);
    const resolved = ordered.map(({ id, column }) => ({
      id,
      column,
      pin: resolvePin(value.pinnedColumns[id], column.pin),
      renderValue: createValueRenderer(column, timeZone),
    }));
    return [
      ...resolved.filter((entry) => entry.pin === "left"),
      ...resolved.filter((entry) => entry.pin === undefined),
      ...resolved.filter((entry) => entry.pin === "right"),
    ];
  }, [value.columns, value.columnOrder, value.pinnedColumns, timeZone]);
  const actionsId = "__line_items_actions__";
  const sizingColumns = useMemo(
    () => [
      ...columns.map(({ column, id }) => ({ id, width: column.width })),
      ...(value.rowActions ? [{ id: actionsId, width: value.rowActions.width ?? 128 }] : []),
    ],
    [columns, value.rowActions],
  );
  const sizing = useColumnSizing(tableRef, containerRef, sizingColumns, controller);
  const hasFooter = columns.some(({ column }) => column.footer !== undefined);
  const footerContext = { rows: value.allLines };
  const hasSpacer = sizing.spacerWidth > 0;
  const count = columns.length + (value.rowActions ? 1 : 0) + (hasSpacer ? 1 : 0);
  const placements = useMemo(
    () =>
      computePinPlacements([
        ...columns.map(({ id, pin }) => ({ id, pin, width: sizing.widths.get(id) ?? 0 })),
        ...(value.rowActions
          ? [{ id: actionsId, pin: "right" as const, width: sizing.widths.get(actionsId) ?? 0 }]
          : []),
      ]),
    [columns, sizing.widths, value.rowActions],
  );
  usePinShadows(containerRef, sizingColumns);
  return (
    <Table.Root
      ref={tableRef}
      containerRef={containerRef}
      data-slot="line-items-table"
      className={className}
      style={{ tableLayout: "fixed", width: sizing.tableWidth }}
      containerClassName="astw:overflow-auto"
    >
      <caption className="astw:sr-only">{label ?? t("title")}</caption>
      <colgroup>
        {sizingColumns.map((column) => (
          <col
            key={column.id}
            data-column-id={column.id}
            style={{ width: sizing.widths.get(column.id) }}
          />
        ))}
        {hasSpacer && <col style={{ width: sizing.spacerWidth }} />}
      </colgroup>
      <Table.Header>
        <Table.Row>
          {columns.map(({ column, id }) => {
            const context = { label: column.label, sortable: false as const };
            const props = column.headerProps?.(context);
            const pinned = pinCellProps(
              placements.get(id),
              { className: cn("astw:bg-card", props?.className), style: props?.style },
              "header",
            );
            return (
              <Table.Head
                key={id}
                align={align(column)}
                className={pinned.className}
                title={props?.title}
                style={pinned.style}
              >
                <TableHeaderContextMenu
                  align={align(column)}
                  column={column}
                  columnKey={id}
                  pinnedColumns={value.pinnedColumns}
                  setPin={value.setPin}
                  slotPrefix="line-items"
                >
                  {column.header ? column.header(context) : column.label}
                </TableHeaderContextMenu>
              </Table.Head>
            );
          })}
          {value.rowActions && (
            <Table.Head {...pinCellProps(placements.get(actionsId), {}, "header")}>
              {t("actions")}
            </Table.Head>
          )}
          {hasSpacer && <Table.Head style={{ padding: 0 }} />}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {value.lines.map((row, index) => {
          const lineKey = value.getLineKey(row);
          return (
            <Table.Row key={controller.getClientKey(row)} className="astw:group">
              {columns.map(({ column, id, renderValue }) => {
                const raw =
                  column.accessorKey !== undefined
                    ? row[column.accessorKey]
                    : column.accessor?.(row);
                const display = column.render ? column.render(row) : renderValue(raw, row);
                const props = column.cellProps?.(row);
                const pinned = pinCellProps(
                  placements.get(id),
                  { className: props?.className, style: props?.style },
                  "body",
                );
                return (
                  <LineItemsCell
                    key={id}
                    row={row}
                    column={column}
                    index={index}
                    mode={value.mode}
                    controller={controller}
                    display={display}
                    message={errors.get(lineKey)?.get(id)}
                    cellProps={{
                      align: align(column),
                      className: pinned.className,
                      title: props?.title,
                      style: pinned.style,
                    }}
                  />
                );
              })}
              {value.rowActions && (
                <Table.Cell
                  data-slot="line-items-row-actions"
                  {...pinCellProps(placements.get(actionsId), { className: "astw:py-1" }, "body")}
                >
                  {value.rowActions.render(row, { lineKey, isNew: value.isNewLine(row), index })}
                </Table.Cell>
              )}
              {hasSpacer && <Table.Cell style={{ padding: 0 }} />}
            </Table.Row>
          );
        })}
        {value.lines.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={Math.max(1, count)}>
              <Text
                variant="body-sm"
                className="astw:py-6 astw:text-center astw:text-muted-foreground"
              >
                {emptyMessage ?? t("empty")}
              </Text>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
      {hasFooter && (
        <Table.Footer>
          <Table.Row>
            {columns.map(({ column, id }) => {
              const props = column.footerProps?.(footerContext);
              const pinned = pinCellProps(
                placements.get(id),
                { className: cn("astw:bg-card", props?.className), style: props?.style },
                "footer",
              );
              return (
                <Table.Cell
                  key={id}
                  align={align(column)}
                  className={pinned.className}
                  title={props?.title}
                  style={pinned.style}
                >
                  {typeof column.footer === "function"
                    ? column.footer(footerContext)
                    : column.footer}
                </Table.Cell>
              );
            })}
            {value.rowActions && (
              <Table.Cell {...pinCellProps(placements.get(actionsId), {}, "footer")} />
            )}
            {hasSpacer && <Table.Cell style={{ padding: 0 }} />}
          </Table.Row>
        </Table.Footer>
      )}
    </Table.Root>
  );
}

Root.displayName = "LineItems.Root";
LineItemsTable.displayName = "LineItems.Table";
export const LineItems = { Root, Table: LineItemsTable, ColumnSettings: LineItemsColumnSettings };
