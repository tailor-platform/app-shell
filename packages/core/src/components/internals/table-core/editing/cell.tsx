import type { ComponentProps, ReactNode } from "react";
import type { Table } from "@/components/table";
import { EditableCellFrame } from "./shared";
import type { CellEditor, CellEditorProps, CellEditorView } from "./props";

/**
 * Table-owned values, callbacks, session lifetime, and cell presentation.
 * Editor settings and render-time composition are supplied separately by EditableCell.
 *
 * @see CellEditorProps for the inherited input and confirmation contract.
 */
export type EditableCellOwnerProps<TOutput = unknown> = Omit<
  CellEditorProps<unknown, TOutput>,
  "children" | "options" | "valueLabel"
> & {
  /** Owner-formatted adopted value, including custom content or null; an editor may supply a draft preview instead. */
  display: ReactNode;
  /** Underlying table-cell props; the frame merges className and owns editing/error attributes and handlers. */
  cellProps: ComponentProps<typeof Table.Cell>;
  /** Ellipsizes the display preview without changing the value passed to the input. */
  truncate?: boolean;
  /** Tooltip text for the resting display; suppressed during active editing or callback errors. */
  tooltipLabel?: string;
};

/**
 * Shared boundary between table-owned data/presentation and an injected input editor.
 * The cell composes the editor with its frame; it neither selects an editor kind nor owns row data.
 * Options and confirmed output are inferred from editor alone, so settings and callbacks cannot widen its contract.
 *
 * @typeParam TOptions - Settings accepted by the selected editor, without a kind discriminator.
 * @typeParam TOutput - Complete confirmed value type, including null when the editor can clear its value.
 * @see EditableCellOwnerProps for owner-supplied values, callbacks, and presentation.
 */
export type EditableCellProps<TOptions, TOutput> = EditableCellOwnerProps<NoInfer<TOutput>> & {
  /** Concrete input implementation and its icon/preview policy; also the source of options and output types. */
  editor: CellEditor<TOptions, TOutput>;
  /** Required settings of this editor, such as fixed options or date-time mode; cannot select another editor kind. */
  options: NoInfer<TOptions>;
};

/** Owns cell presentation; the injected editor supplies input behavior without mirrored state. */
export function EditableCell<TOptions, TOutput>({
  editor,
  options,
  display,
  cellProps,
  truncate,
  tooltipLabel,
  ...props
}: EditableCellProps<TOptions, TOutput>) {
  const { labels, slotPrefix } = props;
  const { Editor, icon, hideDisplay } = editor;
  const renderEditor = ({ input, draftPreview, ...interaction }: CellEditorView) => (
    <EditableCellFrame
      {...interaction}
      labels={labels}
      slotPrefix={slotPrefix}
      cellProps={cellProps}
      display={draftPreview ?? display}
      truncate={truncate}
      tooltipLabel={tooltipLabel}
      hideDisplay={interaction.editing ? hideDisplay?.editing : hideDisplay?.idle}
      icon={icon}
    >
      {input}
    </EditableCellFrame>
  );
  return (
    <Editor
      {...props}
      options={options}
      valueLabel={typeof display === "string" ? display : undefined}
    >
      {renderEditor}
    </Editor>
  );
}
