import { useMemo, useRef, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import type { HeaderRenderContext } from "@/components/internals/table-core/column-types";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
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
import { TableFrame } from "@/components/internals/table-core/frame";
import { LineItemsFooter } from "./footer";
import { LineItemsColumnSettings } from "./column-settings";
import { LineItemsSearch } from "./search";
import { useRowReorder } from "./use-row-reorder";
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
      <TableFrame data-slot="line-items" className={cn("astw:min-w-0", className)}>
        {children}
      </TableFrame>
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
  const sort = controller.getSortState();
  const reorder = useRowReorder(value, controller);
  const errors = useMemo(() => {
    const byRow = new Map<string, Map<string, string>>();
    for (const error of value.errors) {
      if (error.scope !== "cell") continue;
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
  const rowSelection = value.toggleRowSelection !== undefined;
  const selected = new Set(value.selectedIds);
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
  const selectionId = "__line_items_selection__";
  const reorderId = "__line_items_reorder__";
  const sizingColumns = useMemo(
    () => [
      ...(rowSelection ? [{ id: selectionId, width: 44 }] : []),
      ...(reorder.enabled ? [{ id: reorderId, width: 44 }] : []),
      ...columns.map(({ column, id }) => ({ id, width: column.width })),
      ...(value.rowActions ? [{ id: actionsId, width: value.rowActions.width ?? 128 }] : []),
    ],
    [columns, value.rowActions, reorder.enabled, rowSelection],
  );
  const sizing = useColumnSizing(tableRef, containerRef, sizingColumns, controller);
  const hasFooter = columns.some(({ column }) => column.footer !== undefined);
  const footerContext = { rows: value.allLines };
  const rowIndexes = useMemo(
    () => new Map(value.allLines.map((row, index) => [row, index])),
    [value.allLines],
  );
  const hasSpacer = sizing.spacerWidth > 0;
  const count =
    columns.length +
    (rowSelection ? 1 : 0) +
    (reorder.enabled ? 1 : 0) +
    (value.rowActions ? 1 : 0) +
    (hasSpacer ? 1 : 0);
  const placements = useMemo(
    () =>
      computePinPlacements([
        ...(rowSelection
          ? [{ id: selectionId, pin: "left" as const, width: sizing.widths.get(selectionId) ?? 0 }]
          : []),
        ...(reorder.enabled
          ? [{ id: reorderId, pin: "left" as const, width: sizing.widths.get(reorderId) ?? 0 }]
          : []),
        ...columns.map(({ id, pin }) => ({ id, pin, width: sizing.widths.get(id) ?? 0 })),
        ...(value.rowActions
          ? [{ id: actionsId, pin: "right" as const, width: sizing.widths.get(actionsId) ?? 0 }]
          : []),
      ]),
    [columns, sizing.widths, value.rowActions, reorder.enabled, rowSelection],
  );
  usePinShadows(containerRef, sizingColumns);
  return (
    <>
      {reorder.enabled && (
        <>
          <Text.span id={reorder.hintId} className="astw:sr-only">
            {reorder.hint}
          </Text.span>
          <Text
            render={<output aria-live="polite" aria-label={t("reorder")} />}
            className="astw:sr-only"
          >
            {reorder.announcement}
          </Text>
        </>
      )}
      <Table.Root
        ref={tableRef}
        containerRef={containerRef}
        data-slot="line-items-table"
        className={className}
        style={{ tableLayout: "fixed", width: sizing.tableWidth }}
        containerClassName="astw:min-h-0 astw:overflow-auto"
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
            {rowSelection && (
              <Table.Head
                data-slot="line-items-selection-header"
                {...pinCellProps(
                  placements.get(selectionId),
                  { className: "astw:first:pl-2" },
                  "header",
                )}
              >
                <Checkbox
                  aria-label={t("selectAllVisible")}
                  disabled={value.lines.length === 0}
                  checked={value.isAllSelected}
                  indeterminate={value.isIndeterminate}
                  onCheckedChange={(checked) => {
                    if (checked) value.selectAllRows?.();
                    else value.deselectAllRows?.();
                  }}
                />
              </Table.Head>
            )}
            {reorder.enabled && (
              <Table.Head
                {...pinCellProps(
                  placements.get(reorderId),
                  { className: "astw:first:pl-2" },
                  "header",
                )}
              >
                <Text.span className="astw:sr-only">{t("reorder")}</Text.span>
              </Table.Head>
            )}
            {columns.map(({ column, id }) => {
              const direction = sort?.columnId === id ? sort.direction : undefined;
              const context: HeaderRenderContext = column.sort
                ? {
                    label: column.label,
                    sortable: true,
                    sortDirection: direction,
                    activateSort: () => {
                      if (!direction) controller.setSort(id, "Asc");
                      else controller.setSort(id, direction === "Asc" ? "Desc" : undefined);
                    },
                  }
                : { label: column.label, sortable: false };
              let content: ReactNode = column.label;
              if (column.header) content = column.header(context);
              else if (context.sortable)
                content = (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={context.activateSort}
                    className={cn("astw:w-full", {
                      "astw:justify-end": align(column) === "right",
                      "astw:justify-center": align(column) === "center",
                      "astw:justify-start": align(column) === "left",
                    })}
                  >
                    {column.label}
                    {direction === "Asc" && <ArrowUp aria-hidden="true" />}
                    {direction === "Desc" && <ArrowDown aria-hidden="true" />}
                  </Button>
                );
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
                  aria-sort={direction && (direction === "Asc" ? "ascending" : "descending")}
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
                    sortDirection={direction}
                    onSortDirectionChange={
                      column.sort ? (next) => controller.setSort(id, next) : undefined
                    }
                    slotPrefix="line-items"
                  >
                    {content}
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
          {value.lines.map((row) => {
            const index = rowIndexes.get(row)!;
            const lineKey = value.getLineKey(row);
            return (
              <Table.Row
                key={controller.getClientKey(row)}
                {...reorder.rowProps(controller.getClientKey(row))}
                className="astw:group astw:data-dragging:opacity-40 astw:data-[drop-position=before]:[&>td]:shadow-[inset_0_2px_0_var(--color-primary)] astw:data-[drop-position=after]:[&>td]:shadow-[inset_0_-2px_0_var(--color-primary)]"
              >
                {rowSelection && (
                  <Table.Cell
                    data-slot="line-items-row-selection"
                    {...pinCellProps(
                      placements.get(selectionId),
                      { className: "astw:first:pl-2 astw:py-1" },
                      "body",
                    )}
                  >
                    <Checkbox
                      aria-label={t("selectRow", { index: index + 1 })}
                      checked={selected.has(lineKey)}
                      onCheckedChange={() => value.toggleRowSelection?.(row)}
                    />
                  </Table.Cell>
                )}
                {reorder.enabled && (
                  <Table.Cell
                    data-slot="line-items-row-reorder"
                    {...pinCellProps(
                      placements.get(reorderId),
                      { className: "astw:first:pl-2 astw:py-1" },
                      "body",
                    )}
                  >
                    <Button
                      variant={null}
                      size="xs"
                      className="astw:cursor-grab astw:active:cursor-grabbing astw:text-muted-foreground"
                      {...reorder.handleProps(controller.getClientKey(row), index)}
                    >
                      <GripVertical aria-hidden="true" />
                    </Button>
                  </Table.Cell>
                )}
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
                      selected={selected.has(lineKey)}
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
                  {emptyMessage ?? t(value.allLines.length > 0 ? "noMatches" : "empty")}
                </Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
        {hasFooter && (
          <Table.Footer>
            <Table.Row>
              {rowSelection && (
                <Table.Cell {...pinCellProps(placements.get(selectionId), {}, "footer")} />
              )}
              {reorder.enabled && (
                <Table.Cell {...pinCellProps(placements.get(reorderId), {}, "footer")} />
              )}
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
    </>
  );
}

Root.displayName = "LineItems.Root";
LineItemsTable.displayName = "LineItems.Table";
export const LineItems = {
  Root,
  Table: LineItemsTable,
  Footer: LineItemsFooter,
  ColumnSettings: LineItemsColumnSettings,
  Search: LineItemsSearch,
};
