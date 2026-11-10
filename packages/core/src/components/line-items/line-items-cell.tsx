import type { ComponentProps, ReactNode } from "react";
import { BadgeList } from "@/components/badge-list";
import { Table } from "@/components/table";
import {
  EditableCell,
  type EditableCellProps,
} from "@/components/internals/table-core/editing/cell";
import type { LineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

/** Adapts property-owned confirmation to the same cell controls used by DataTable. */
export function LineItemsEditableCell<T extends Record<string, unknown>>({
  row,
  column,
  edit,
  index,
  editing,
  display,
  timeZone,
  cellProps,
}: {
  row: T;
  column: LineItemsColumn<T>;
  edit: NonNullable<LineItemsColumn<T>["edit"]>;
  index: number;
  editing: LineItemsEditing<T>;
  display: ReactNode;
  timeZone: string;
  cellProps: ComponentProps<typeof Table.Cell>;
}) {
  const t = useLineItemsT();
  const session = editing.getSession(row, column);
  const id = (column.id ?? column.accessorKey)!;
  const key = editing.getLineKey(row);
  const label = `${column.label ?? id}, ${t("row", { index: index + 1 })}`;
  const renderError = edit.error && edit.error.render;
  const props: Omit<EditableCellProps, "config"> = {
    current: row[column.accessorKey!],
    display,
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
    return <EditableCell {...props} config={{ type: "date", withTime: edit.withTime }} />;
  if (edit.editorType === "combobox")
    return (
      <EditableCell
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
  return <EditableCell {...props} config={{ type: edit.editorType }} />;
}

export function LineItemsDisplayCell(props: ComponentProps<typeof Table.Cell>) {
  return <Table.Cell {...props} />;
}
