import type { ComponentProps, ReactNode } from "react";
import type { Table } from "@/components/table";
import { EditableCellFrame } from "./shared";
import type { CellEditor, CellEditorProps, CellEditorView } from "./props";

export type EditableCellOwnerProps = Omit<
  CellEditorProps<unknown>,
  "children" | "options" | "valueLabel"
> & {
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell>;
  truncate?: boolean;
  tooltipLabel?: string;
};

export type EditableCellProps<TOptions> = EditableCellOwnerProps & {
  editor: CellEditor<TOptions>;
  options: NoInfer<TOptions>;
};

/** Owns cell presentation; the injected editor supplies input behavior without mirrored state. */
export function EditableCell<TOptions>({
  editor,
  options,
  display,
  cellProps,
  truncate,
  tooltipLabel,
  ...props
}: EditableCellProps<TOptions>) {
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
