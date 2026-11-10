import { useMemo, type ComponentProps, type ReactNode } from "react";
import { BadgeList } from "@/components/badge-list";
import { Table } from "@/components/table";
import { createValueRenderer } from "@/components/internals/table-core";
import {
  EditableCell,
  type EditableCellOwnerProps,
} from "@/components/internals/table-core/editing/cell";
import { choiceEditor } from "@/components/internals/table-core/editing/choice";
import { dateEditor } from "@/components/internals/table-core/editing/date";
import { numberEditor, textEditor } from "@/components/internals/table-core/editing/typing";
import type { LineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

interface LineItemsCellEditor {
  renderCell: (props: EditableCellOwnerProps) => ReactNode;
}

interface LineItemsChoiceCellEditor extends LineItemsCellEditor {
  choices: ComponentProps<typeof choiceEditor.Editor>["options"]["choices"];
}

/** Resolve the public editor once, keeping its options paired with its concrete input. */
function resolveEditor<T extends Record<string, unknown>>(
  column: LineItemsColumn<T>,
): LineItemsCellEditor | LineItemsChoiceCellEditor | undefined {
  const edit = column.edit;
  if (!edit) return undefined;
  switch (edit.editorType) {
    case "text":
      return {
        renderCell: (props) => <EditableCell {...props} editor={textEditor} options={{}} />,
      };
    case "number":
      return {
        renderCell: (props) => <EditableCell {...props} editor={numberEditor} options={{}} />,
      };
    case "date":
      return {
        renderCell: (props) => (
          <EditableCell {...props} editor={dateEditor} options={{ withTime: edit.withTime }} />
        ),
      };
    case "combobox":
      return {
        choices: edit.options,
        renderCell: (props) => (
          <EditableCell
            {...props}
            editor={choiceEditor}
            options={{
              choices: edit.options,
              renderOption:
                column.type === "badge"
                  ? (value, label) => (
                      <BadgeList
                        value={value}
                        options={column.typeOptions}
                        resolveLabel={() => label}
                      />
                    )
                  : undefined,
            }}
          />
        ),
      };
  }
}

/** Prepare and memoize cell renderers per column; row permissions choose the display mode later. */
export function useLineItemsCellRenderersByColumn<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
  timeZone: string,
) {
  return useMemo(
    () =>
      columns.map((column) => {
        const editor = resolveEditor(column);
        const cell = {
          column,
          editor,
          id: column.id ?? column.accessorKey!,
          align:
            column.align ??
            (column.type === "number" || column.type === "money"
              ? ("right" as const)
              : ("left" as const)),
        };
        if (column.render) return { ...cell, renderDisplay: column.render };
        const choices = editor && "choices" in editor ? editor.choices : undefined;
        const renderValue = createValueRenderer(column, timeZone, {
          resolveBadgeLabel: choices
            ? (raw) => choices.find((option) => option.value === raw)?.label ?? raw
            : undefined,
        });
        const renderEditableValue =
          column.type === "link" && editor
            ? createValueRenderer({ type: "text" }, timeZone)
            : renderValue;
        return {
          ...cell,
          renderDisplay: (row: T, editable: boolean) => {
            const current =
              column.accessorKey !== undefined ? row[column.accessorKey] : column.accessor?.(row);
            const render = editable ? renderEditableValue : renderValue;
            if (!choices || column.type === "badge") return render(current, row);
            return render(
              choices.find((option) => option.value === current)?.label ?? current,
              row,
            );
          },
        };
      }),
    [columns, timeZone],
  );
}

/** Adapts property-owned confirmation to the same cell controls used by DataTable. */
export function LineItemsEditableCell<T extends Record<string, unknown>>({
  row,
  column,
  edit,
  editor,
  index,
  editing,
  display,
  timeZone,
  cellProps,
}: {
  row: T;
  column: LineItemsColumn<T>;
  edit: NonNullable<LineItemsColumn<T>["edit"]>;
  editor: LineItemsCellEditor;
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
  const props: EditableCellOwnerProps = {
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
  return editor.renderCell(props);
}

export function LineItemsDisplayCell(props: ComponentProps<typeof Table.Cell>) {
  return <Table.Cell {...props} />;
}
