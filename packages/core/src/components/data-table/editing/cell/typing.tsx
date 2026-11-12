import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { numberEditor, textEditor } from "@/components/internals/table-core/editing/typing";
import { useEditorProps, type DataTableEditableCellProps } from "./shared";

export function TypingEditCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow>,
) {
  const coreProps = useEditorProps(props);
  const numeric = props.col.type === "number" || props.col.type === "money";
  return numeric ? (
    <EditableCell {...coreProps} editor={numberEditor} options={{}} />
  ) : (
    <EditableCell {...coreProps} editor={textEditor} options={{}} />
  );
}
