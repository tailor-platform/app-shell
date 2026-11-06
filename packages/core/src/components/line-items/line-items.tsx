import { useMemo, type ReactNode } from "react";
import { Table } from "@/components/table";
import { Text } from "@/components/text";
import { useTimeZone } from "@/contexts/appshell-context";
import { createValueRenderer } from "@/components/internals/table-core";
import { cn } from "@/lib/utils";
import { LineItemsContext, useLineItemsContext } from "./line-items-context";
import { useLineItemsT } from "./i18n";
import type { UseLineItemsReturn } from "./types";

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
        align:
          column.align ??
          (column.type === "number" || column.type === "money"
            ? ("right" as const)
            : ("left" as const)),
        renderValue: column.render ? undefined : createValueRenderer(column, timeZone),
      })),
    [value.columns, timeZone],
  );
  return (
    <Table.Root data-slot="line-items-table" className={className}>
      <Table.Caption className="astw:sr-only">{label ?? t("title")}</Table.Caption>
      <Table.Header>
        <Table.Row>
          {columns.map(({ column, id, align }) => (
            <Table.Head key={id} scope="col" align={align}>
              {column.label}
            </Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {value.lines.map((row) => (
          <Table.Row key={value.getLineKey(row)}>
            {columns.map(({ column, id, align, renderValue }) => (
              <Table.Cell key={id} align={align}>
                {column.render
                  ? column.render(row)
                  : renderValue!(
                      column.accessorKey !== undefined
                        ? row[column.accessorKey]
                        : column.accessor?.(row),
                      row,
                    )}
              </Table.Cell>
            ))}
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
