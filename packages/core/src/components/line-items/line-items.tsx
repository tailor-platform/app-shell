import { useMemo, type ReactNode } from "react";
import { GripVerticalIcon } from "lucide-react";
import { Table } from "@/components/table";
import { Text } from "@/components/text";
import { useTimeZone } from "@/contexts/appshell-context";
import { createValueRenderer } from "@/components/internals/table-core";
import { cn } from "@/lib/utils";
import { LineItemsContext, useLineItemsContext } from "./line-items-context";
import { useLineItemsT } from "./i18n";
import { useLineItemsReorder } from "./use-line-items-reorder";
import { clientKeyOf } from "./document/identity";
import { getLineItemsEditing } from "./editing";
import { LineItemsCell } from "./line-items-cell";
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
  const reorder = useLineItemsReorder(value);
  const columns = useMemo(
    () =>
      value.columns.map((column) => {
        const choices = column.edit?.editorType === "combobox" ? column.edit.options : undefined;
        const renderValue = column.render
          ? undefined
          : createValueRenderer(column, timeZone, {
              resolveBadgeLabel: choices
                ? (raw) => choices.find((option) => option.value === raw)?.label ?? raw
                : undefined,
            });
        const renderEditableValue =
          !column.render && column.type === "link" && column.edit
            ? createValueRenderer({ type: "text" }, timeZone)
            : renderValue;
        return {
          column,
          id: column.id ?? column.accessorKey!,
          align:
            column.align ??
            (column.type === "number" || column.type === "money"
              ? ("right" as const)
              : ("left" as const)),
          renderValue,
          renderEditableValue,
        };
      }),
    [value.columns, timeZone],
  );
  return (
    <Table.Root data-slot="line-items-table" className={className}>
      <Table.Caption className="astw:sr-only">{label ?? t("title")}</Table.Caption>
      <Table.Header>
        <Table.Row>
          {value.orderer && (
            <Table.Head scope="col" className="astw:w-0">
              <Text.span className="astw:sr-only">{t("order")}</Text.span>
            </Table.Head>
          )}
          {columns.map(({ column, id, align }) => (
            <Table.Head key={id} scope="col" align={align} style={{ width: column.width }}>
              {column.label}
            </Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body {...reorder.bodyProps}>
        {value.lines.map((row, index) => (
          <Table.Row
            key={clientKeyOf(row)}
            {...reorder.getRowProps(index)}
            className="astw:data-dragging:opacity-40 astw:data-[drop-position=before]:[&>td]:shadow-[inset_0_2px_0_var(--primary)] astw:data-[drop-position=after]:[&>td]:shadow-[inset_0_-2px_0_var(--primary)]"
          >
            {value.orderer && (
              <Table.Cell className="astw:w-0 astw:py-1.5 astw:pr-0">
                {/* shortcut: native dragging is desktop-only, add pointer dragging if touch dragging is required. */}
                <button
                  type="button"
                  data-slot="line-items-orderer"
                  aria-label={t("reorder", { line: index + 1 })}
                  title={t("dragToReorder")}
                  {...reorder.getHandleProps(index)}
                  className="astw:flex astw:size-6 astw:items-center astw:justify-center astw:rounded-sm astw:border-0 astw:bg-transparent astw:p-0 astw:cursor-grab astw:active:cursor-grabbing astw:text-muted-foreground astw:focus-visible:outline-2 astw:focus-visible:outline-ring astw:aria-disabled:cursor-default astw:aria-disabled:opacity-50"
                >
                  <GripVerticalIcon className="astw:size-4" aria-hidden="true" />
                </button>
              </Table.Cell>
            )}
            {columns.map(({ column, id, align, renderValue, renderEditableValue }) => {
              let current: unknown;
              if (!column.render)
                current =
                  column.accessorKey !== undefined
                    ? row[column.accessorKey]
                    : column.accessor?.(row);
              const choiceLabel =
                column.edit?.editorType === "combobox" && column.type !== "badge"
                  ? column.edit.options.find((option) => option.value === current)?.label
                  : undefined;
              const renderDisplay = (editable: boolean) =>
                column.render
                  ? column.render(row)
                  : (editable ? renderEditableValue! : renderValue!)(choiceLabel ?? current, row);
              return column.edit ? (
                <LineItemsCell
                  key={id}
                  row={row}
                  column={column}
                  index={index}
                  editing={getLineItemsEditing(value)}
                  renderDisplay={renderDisplay}
                  timeZone={timeZone}
                  cellProps={{ align }}
                />
              ) : (
                <Table.Cell key={id} align={align}>
                  {renderDisplay(false)}
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
        {value.lines.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={Math.max(1, columns.length + (value.orderer ? 1 : 0))}>
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
