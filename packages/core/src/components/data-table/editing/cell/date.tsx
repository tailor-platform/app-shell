import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { useEditorProps, type EditableColumn, type DataTableEditableCellProps } from "./shared";

type DateColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "date" }
>;

export function DateEditCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow, DateColumn<TRow>>,
) {
  const coreProps = useEditorProps(props);
  return (
    <EditableCell
      {...coreProps}
      config={{ type: "date", withTime: props.col.typeOptions?.dateFormat === "datetime" }}
    />
  );
}
