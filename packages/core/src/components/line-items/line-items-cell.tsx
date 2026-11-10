import type { ComponentProps, ReactNode } from "react";
import { BadgeList } from "@/components/badge-list";
import { Table } from "@/components/table";
import { TypingEditCell } from "@/components/internals/table-core/editing/typing";
import { ChoiceEditCell } from "@/components/internals/table-core/editing/choice";
import { DateEditCell } from "@/components/internals/table-core/editing/date";
import type { CellEditorProps } from "@/components/internals/table-core/editing/props";
import type { LineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

/** Adapts property-owned confirmation to the same cell controls used by DataTable. */
export function LineItemsCell<T extends Record<string, unknown>>({
  row,
  column,
  index,
  editing,
  renderDisplay,
  timeZone,
  cellProps,
}: {
  row: T;
  column: LineItemsColumn<T>;
  index: number;
  editing: LineItemsEditing<T>;
  renderDisplay: (editable: boolean) => ReactNode;
  timeZone: string;
  cellProps: ComponentProps<typeof Table.Cell>;
}) {
  const t = useLineItemsT();
  const edit = column.edit;
  if (!edit || !(edit.canEdit?.(row) ?? true))
    return <Table.Cell {...cellProps}>{renderDisplay(false)}</Table.Cell>;
  const session = editing.getSession(row, column);
  const id = (column.id ?? column.accessorKey)!;
  const key = editing.getLineKey(row);
  const label = `${column.label ?? id}, ${t("row", { index: index + 1 })}`;
  const renderError = edit.error && edit.error.render;
  const props: Omit<CellEditorProps, "config"> = {
    current: row[column.accessorKey!],
    display: renderDisplay(true),
    timeZone,
    cellProps,
    session,
    commit: (value) => editing.commitField(key, id, value),
    renderError: renderError ? (error) => renderError({ row, error }) : undefined,
    interceptErrors: edit.error !== false,
    label,
    rowKey: key,
    colKey: id,
    align: cellProps.align ?? "left",
    slotPrefix: "line-items",
    labels: {
      notANumber: t("notANumber"),
      revertHint: t("revertHint"),
      callbackError: t("callbackError"),
      errorHint: t("errorHint"),
      showError: t("showError", { label }),
      errorDialog: t("errorDialog", { label }),
      closeError: t("closeError"),
      none: t("none"),
      noMatches: t("noMatches"),
      chooseTime: t("chooseTime"),
      clear: t("clear"),
      done: t("done"),
    },
  };
  if (edit.editorType === "date")
    return <DateEditCell {...props} config={{ type: "date", withTime: edit.withTime }} />;
  if (edit.editorType === "combobox")
    return (
      <ChoiceEditCell
        {...props}
        config={{
          type: "choice",
          options: edit.options,
          renderOption:
            column.type === "badge"
              ? (value, optionLabel) => (
                  <BadgeList
                    value={value}
                    options={column.typeOptions}
                    resolveLabel={() => optionLabel}
                  />
                )
              : undefined,
        }}
      />
    );
  return <TypingEditCell {...props} config={{ type: edit.editorType }} />;
}
