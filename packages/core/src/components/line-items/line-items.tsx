import { useMemo, type ReactNode } from "react";
import { Table } from "@/components/table";
import { Text } from "@/components/text";
import { useTimeZone } from "@/contexts/appshell-context";
import { cn } from "@/lib/utils";
import { LineItemsContext, useLineItemsContext } from "./line-items-context";
import { LineItemsCell } from "./line-items-cell";
import { resolveLineItemsColumn } from "./column-adapter";
import { getLineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { UseLineItemsReturn } from "./types";

export type LineItemsRootProps<T extends Record<string, unknown>> = {
  /** Pass the hook result directly; editable cells use the document owner bound to that record. */
  value: UseLineItemsReturn<T>;
  children: ReactNode;
  className?: string;
};

function Root<T extends Record<string, unknown>>({
  value,
  children,
  className,
}: LineItemsRootProps<T>) {
  return (
    <LineItemsContext.Provider value={value}>
      <div
        data-slot="line-items"
        className={cn(
          "astw:min-w-0 astw:overflow-clip astw:rounded-md astw:border astw:border-border astw:bg-card",
          className,
        )}
      >
        {children}
      </div>
    </LineItemsContext.Provider>
  );
}

export type LineItemsTableProps = {
  className?: string;
  emptyMessage?: ReactNode;
  "aria-label"?: string;
};

function LineItemsTable({ className, emptyMessage, "aria-label": label }: LineItemsTableProps) {
  const value = useLineItemsContext<Record<string, unknown>>("LineItems.Table");
  const { value: timeZone } = useTimeZone();
  const t = useLineItemsT();
  const columns = useMemo(
    () =>
      value.columns.map((column) => ({
        column,
        id: column.id ?? column.accessorKey!,
        adapter: resolveLineItemsColumn(column, timeZone),
      })),
    [value.columns, timeZone],
  );
  return (
    <Table.Root data-slot="line-items-table" className={className}>
      <Table.Caption className="astw:sr-only">{label ?? t("title")}</Table.Caption>
      <Table.Header>
        <Table.Row>
          {columns.map(({ column, id, adapter }) => (
            <Table.Head key={id} scope="col" align={adapter.align}>
              {column.label}
            </Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {value.lines.map((row, index) => (
          <Table.Row key={value.getLineKey(row)}>
            {columns.map(({ column, id, adapter }) => {
              const display = adapter.renderDisplay(row);
              const align = adapter.align;
              return column.edit ? (
                <LineItemsCell
                  key={id}
                  row={row}
                  column={column}
                  index={index}
                  editing={getLineItemsEditing<Record<string, unknown>>(value)}
                  display={display}
                  adapter={adapter.editor}
                  cellProps={{ align }}
                />
              ) : (
                <Table.Cell key={id} align={align}>
                  {display}
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
        {value.lines.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={Math.max(1, columns.length)}>
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
    </Table.Root>
  );
}

Root.displayName = "LineItems.Root";
LineItemsTable.displayName = "LineItems.Table";
export const LineItems = { Root, Table: LineItemsTable };
