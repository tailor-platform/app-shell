import { useMemo, type ComponentProps, type ReactNode } from "react";
import { BadgeList } from "@/components/badge-list";
import { Table } from "@/components/table";
import { createValueRenderer } from "@/components/internals/table-core";
import type {
  ColumnCellType,
  TypedColumnDisplay,
} from "@/components/internals/table-core/column-types";
import type {
  CellEditor,
  CellEditorOptions,
} from "@/components/internals/table-core/editing/props";
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

type EditorDisplay =
  | TypedColumnDisplay<Record<string, unknown>, "badge">
  | { type?: Exclude<ColumnCellType, "badge"> };

/** Bind the implementation used for type derivation to the same input used for rendering. */
function defineLineItemsEditor<
  TOptions,
  TOutput,
  TSettings,
  TPrepared extends { options: NoInfer<TOptions> },
>(
  editor: CellEditor<TOptions, TOutput>,
  prepare: (settings: TSettings, display: EditorDisplay) => TPrepared,
) {
  return {
    editor,
    prepare(settings: TSettings, display: EditorDisplay) {
      const { options, ...metadata } = prepare(settings, display);
      return {
        ...metadata,
        renderCell: (props: EditableCellOwnerProps) => (
          <EditableCell {...props} editor={editor} options={options} />
        ),
      };
    },
  };
}

/** The single LineItems public-name, settings and implementation mapping. */
export const lineItemsEditors = {
  text: defineLineItemsEditor(textEditor, (_settings: Record<never, never>) => ({ options: {} })),
  number: defineLineItemsEditor(numberEditor, (_settings: Record<never, never>) => ({
    options: {},
  })),
  date: defineLineItemsEditor(dateEditor, (settings: CellEditorOptions<typeof dateEditor>) => ({
    options: { withTime: settings.withTime },
  })),
  combobox: defineLineItemsEditor(
    choiceEditor,
    (settings: { options: CellEditorOptions<typeof choiceEditor>["choices"] }, display) => ({
      choices: settings.options,
      options: {
        choices: settings.options,
        renderOption:
          display.type === "badge"
            ? (value, label) => (
                <BadgeList value={value} options={display.typeOptions} resolveLabel={() => label} />
              )
            : undefined,
      },
    }),
  ),
};

type EditorSettingsByKind = {
  [K in keyof typeof lineItemsEditors]: Parameters<(typeof lineItemsEditors)[K]["prepare"]>[0];
};
type EditorPreparers = {
  [K in keyof EditorSettingsByKind]: {
    prepare: (
      settings: EditorSettingsByKind[K],
      display: EditorDisplay,
    ) => LineItemsCellEditor | LineItemsChoiceCellEditor;
  };
};

/** Keep keyed selection correlated with its settings without another editor-kind switch. */
function resolveEditor<K extends keyof EditorSettingsByKind>(
  edit: (EditorSettingsByKind[K] & { editorType: K }) | undefined,
  display: EditorDisplay,
): LineItemsCellEditor | LineItemsChoiceCellEditor | undefined {
  if (!edit) return undefined;
  const adapter: EditorPreparers[K] = lineItemsEditors[edit.editorType];
  return adapter.prepare(edit, display);
}

/** Prepare and memoize cell renderers per column; row permissions choose the display mode later. */
export function useLineItemsCellRenderersByColumn<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
  timeZone: string,
) {
  return useMemo(
    () =>
      columns.map((column) => {
        const editor = resolveEditor(column.edit, column);
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
