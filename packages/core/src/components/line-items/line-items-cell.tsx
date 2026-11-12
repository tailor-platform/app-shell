import { useMemo, type ComponentProps, type ReactNode } from "react";
import { BadgeList } from "@/components/badge-list";
import { Table } from "@/components/table";
import {
  createValueRenderer,
  displayCellAdapters,
  getDisplayCellAdapter,
} from "@/components/internals/table-core";
import type { ValueDisplayDescriptor } from "@/components/internals/table-core/column-types";
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
import { lineItemsEditors } from "./editor-factory";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

/**
 * Resolved cell alignment and rendering operations prepared for one column and reused across rows.
 * Consumers select a row's display mode without inspecting editor kinds, settings, or choice metadata.
 *
 * @typeParam T - Row type preserved for accessors and row-dependent display options.
 */
interface LineItemsCellRenderers<T extends Record<string, unknown>> {
  /** Explicit column alignment, or the display type's default; shared by the header, preview, and input. */
  align: EditableCellOwnerProps["align"];
  /** Invoke directly with owner-bound values, callbacks, and session; do not mount this callback as a component. */
  renderCell: (props: EditableCellOwnerProps) => ReactNode;
  /** Render row data or custom content; editable selects the input-compatible preview, not permission or draft state. */
  renderDisplay: (row: T, editable: boolean) => ReactNode;
}

/** UI-owned preparation, retaining the editor actually rendered as the source of its output contract. */
export interface LineItemsEditorAdapter<TOptions, TOutput, TSettings> {
  /** Concrete input used for both rendering and output-type derivation. */
  editor: CellEditor<TOptions, TOutput>;
  /** Resolve settings, display policy, and environment dependencies before rendering rows. */
  prepare<T extends Record<string, unknown>>(
    settings: TSettings,
    column: LineItemsColumn<T>,
  ): LineItemsCellRenderers<T>;
}

type ValueRenderer<T> = (value: unknown, row: T) => ReactNode;

/**
 * Bind a row's value source to already-prepared readonly and editable value renderers.
 * This common step knows no display kinds, editor settings, labels, or timezone dependencies.
 *
 * @param source - Property or computed accessor supplying the raw value.
 * @param renderReadonly - Prepared value renderer for readonly cells.
 * @param renderEditable - Input-compatible preview renderer; defaults to the readonly renderer.
 * @returns Row renderer whose mode is selected by the caller after evaluating the row's edit policy.
 */
function bindDisplay<T extends Record<string, unknown>>(
  source: { accessorKey?: keyof T & string; accessor?: (row: T) => unknown },
  renderReadonly: ValueRenderer<T>,
  renderEditable: ValueRenderer<T> = renderReadonly,
): LineItemsCellRenderers<T>["renderDisplay"] {
  return (row, editable) => {
    const current =
      source.accessorKey !== undefined ? row[source.accessorKey] : source.accessor?.(row);
    return (editable ? renderEditable : renderReadonly)(current, row);
  };
}

/** Bind the implementation used for type derivation to the same input used for rendering. */
function bindEditor<TOptions, TOutput, TSettings>(
  editor: CellEditor<TOptions, TOutput>,
  prepare: <T extends Record<string, unknown>>(
    settings: TSettings,
    column: LineItemsColumn<T>,
  ) => { options: NoInfer<TOptions> } & Omit<LineItemsCellRenderers<T>, "renderCell">,
): LineItemsEditorAdapter<TOptions, TOutput, TSettings> {
  return {
    editor,
    prepare(settings, column) {
      const { options, align, renderDisplay } = prepare(settings, column);
      return {
        align,
        renderCell: (props) => <EditableCell {...props} editor={editor} options={options} />,
        renderDisplay,
      };
    },
  };
}

/** Assemble UI adapters and readonly presentation, binding date dependencies before rendering. */
export function createLineItemsCellPreparers(timeZone: string) {
  function prepareValueRenderer<T extends Record<string, unknown>>(
    display: ValueDisplayDescriptor<T>,
  ): ValueRenderer<T> {
    return display.type === "date"
      ? displayCellAdapters.date.createRenderer(display.typeOptions, timeZone)
      : createValueRenderer(display);
  }

  /** Custom output wins before any built-in value renderer is prepared. */
  function prepareDisplay<T extends Record<string, unknown>>(
    column: LineItemsColumn<T>,
  ): Omit<LineItemsCellRenderers<T>, "renderCell"> {
    const align = column.align ?? getDisplayCellAdapter(column.type).defaultAlign;
    if (column.render) return { align, renderDisplay: column.render };
    const renderReadonly = prepareValueRenderer(column);
    const renderEditable =
      column.type === "link" ? createValueRenderer({ type: "text" }) : renderReadonly;
    return { align, renderDisplay: bindDisplay(column, renderReadonly, renderEditable) };
  }

  function prepareChoiceDisplay<T extends Record<string, unknown>>(
    column: LineItemsColumn<T>,
    options: CellEditorOptions<typeof choiceEditor>["options"],
  ): Omit<LineItemsCellRenderers<T>, "renderCell"> {
    const align = column.align ?? getDisplayCellAdapter(column.type).defaultAlign;
    if (column.render) return { align, renderDisplay: column.render };
    const resolveLabel = (value: unknown) =>
      options.find((option) => option.value === value)?.label;
    if (column.type === "badge") {
      const renderBadge = createValueRenderer(column, {
        resolveBadgeLabel: (value) => resolveLabel(value) ?? value,
      });
      return { align, renderDisplay: bindDisplay(column, renderBadge) };
    }
    const renderReadonly = prepareValueRenderer(column);
    const renderEditable =
      column.type === "link" ? createValueRenderer({ type: "text" }) : renderReadonly;
    return {
      align,
      renderDisplay: bindDisplay(
        column,
        (value, row) => renderReadonly(resolveLabel(value) ?? value, row),
        (value, row) => renderEditable(resolveLabel(value) ?? value, row),
      ),
    };
  }

  const bindings = {
    text: bindEditor(textEditor, (_settings: Record<never, never>, column) => ({
      options: {},
      ...prepareDisplay(column),
    })),
    number: bindEditor(numberEditor, (_settings: Record<never, never>, column) => ({
      options: {},
      ...prepareDisplay(column),
    })),
    date: bindEditor(
      dateEditor,
      (settings: Pick<CellEditorOptions<typeof dateEditor>, "withTime">, column) => ({
        options: { withTime: settings.withTime, timeZone },
        ...prepareDisplay(column),
      }),
    ),
    choice: bindEditor(
      choiceEditor,
      ({ options }: Pick<CellEditorOptions<typeof choiceEditor>, "options">, column) => ({
        options: {
          options,
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
        },
        ...prepareChoiceDisplay(column, options),
      }),
    ),
  };
  return { bindings, prepareDisplay };
}

type EditorCatalog = typeof lineItemsEditors;
type UIAdapters = ReturnType<typeof createLineItemsCellPreparers>["bindings"];
type EditorSettingsByKind = {
  [K in keyof EditorCatalog]: Parameters<ReturnType<EditorCatalog[K]["bind"]>["prepare"]>[0];
};
type EditorDefinitions = {
  [K in keyof EditorSettingsByKind]: {
    bind: (ui: UIAdapters) => {
      prepare: <T extends Record<string, unknown>>(
        settings: EditorSettingsByKind[K],
        column: LineItemsColumn<T>,
      ) => LineItemsCellRenderers<T>;
    };
  };
};

/** Keep keyed selection correlated with its settings without another editor-kind switch. */
function resolveEditor<K extends keyof EditorSettingsByKind, T extends Record<string, unknown>>(
  edit: (EditorSettingsByKind[K] & { editorType: K }) | undefined,
  column: LineItemsColumn<T>,
  bindings: UIAdapters,
): LineItemsCellRenderers<T> | undefined {
  if (!edit) return undefined;
  const definition: EditorDefinitions[K] = lineItemsEditors[edit.editorType];
  return definition.bind(bindings).prepare(edit, column);
}

/** Prepare and memoize cell renderers per column; row permissions choose the display mode later. */
export function useLineItemsCellRenderersByColumn<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
  timeZone: string,
) {
  return useMemo(() => {
    const { bindings, prepareDisplay } = createLineItemsCellPreparers(timeZone);
    return columns.map((column) => {
      const renderers = resolveEditor(column.edit, column, bindings);
      const presentation = renderers ?? prepareDisplay(column);
      return {
        column,
        id: column.id ?? column.accessorKey!,
        align: presentation.align,
        renderCell: renderers?.renderCell,
        renderDisplay: presentation.renderDisplay,
      };
    });
  }, [columns, timeZone]);
}

/** Adapts property-owned confirmation to the same cell controls used by DataTable. */
export function LineItemsEditableCell<T extends Record<string, unknown>>({
  row,
  column,
  edit,
  renderCell,
  index,
  editing,
  display,
  cellProps,
}: {
  row: T;
  column: LineItemsColumn<T>;
  edit: NonNullable<LineItemsColumn<T>["edit"]>;
  renderCell: LineItemsCellRenderers<T>["renderCell"];
  index: number;
  editing: LineItemsEditing<T>;
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell> & { align: EditableCellOwnerProps["align"] };
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
    cellProps,
    session,
    commit: (value) => editing.commitField(key, id, value),
    renderError: renderError ? (error) => renderError({ row, error }) : undefined,
    interceptErrors: edit.error !== false,
    label,
    rowKey: key,
    colKey: id,
    align: cellProps.align,
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
  return renderCell(props);
}

export function LineItemsDisplayCell(props: ComponentProps<typeof Table.Cell>) {
  return <Table.Cell {...props} />;
}
