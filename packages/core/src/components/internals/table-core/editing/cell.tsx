import type { ComponentProps, ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { Table } from "@/components/table";
import { ChoiceEditor } from "./choice";
import { DateEditor } from "./date";
import { TypingEditor } from "./typing";
import { EditableCellFrame } from "./shared";
import type { CellEditorProps, CellEditorView } from "./props";

const inputDisplay = {
  /** Hide the preview only in forced-colors mode, where the resting input text becomes visible. */
  idle: "forced-colors",
  /** Hide the preview while the input shows its draft, retaining the preview's layout space. */
  editing: "focused",
} as const;
const editors = {
  text: { Editor: TypingEditor, hideDisplay: inputDisplay },
  number: { Editor: TypingEditor, hideDisplay: inputDisplay },
  choice: { Editor: ChoiceEditor, icon: <ChevronDown />, hideDisplay: inputDisplay },
  date: { Editor: DateEditor, icon: <CalendarDays /> },
};

type EditorType = keyof typeof editors;
type EditorConfig<T extends EditorType> = ComponentProps<
  (typeof editors)[T]["Editor"]
>["config"] & {
  type: T;
};

/** Derive one config per registry key, narrowing even shared editors to that key. */
export type CellEditorConfig = {
  [T in EditorType]: EditorConfig<T>;
}[EditorType];

type EditorInputProps<T extends EditorType> = CellEditorProps<EditorConfig<T>> & {
  valueLabel?: string;
};

/**
 * Keeps each registry key correlated with the config its editor accepts.
 * Mapping over T allows config.type lookup without forcing every editor to accept
 * the full config union or asserting the selected component's type.
 */
type EditorRegistry = {
  [T in EditorType]: {
    /** Input component for this config kind; supplies input and interaction state via children. */
    Editor: (props: EditorInputProps<T>) => ReactNode;
    /** Decorative editing hint shown by the frame on hover or focus; omit for no icon. */
    icon?: ReactNode;
    /** Preview hiding modes for idle/editing states; omit to keep the preview visible, as dates do. */
    hideDisplay?: typeof inputDisplay;
  };
};

export type EditableCellProps<T extends EditorType = EditorType> = Omit<
  EditorInputProps<T>,
  "children" | "valueLabel"
> & {
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell>;
  truncate?: boolean;
  tooltipLabel?: string;
};

/** Owns cell presentation; editors supply input behavior without mirroring their state. */
export function EditableCell<T extends EditorType>({
  display,
  cellProps,
  truncate,
  tooltipLabel,
  ...props
}: EditableCellProps<T>) {
  const { config, labels, slotPrefix } = props;
  const { Editor, icon, hideDisplay }: EditorRegistry[T] = editors[config.type];
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
      config={config}
      valueLabel={typeof display === "string" ? display : undefined}
    >
      {renderEditor}
    </Editor>
  );
}
