import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { useEditorProps, type DataTableEditableCellProps } from "./shared";

export function TypingEditCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow>,
) {
  const coreProps = useEditorProps(props);
  const numeric = props.col.type === "number" || props.col.type === "money";
  return <EditableCell {...coreProps} config={{ type: numeric ? "number" : "text" }} />;
}
