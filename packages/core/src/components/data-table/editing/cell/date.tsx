import { DateEditCell as CoreDateEditCell } from "@/components/internals/table-core/editing/date";
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
    <CoreDateEditCell
      {...coreProps}
      config={{ type: "date", withTime: props.col.typeOptions?.dateFormat === "datetime" }}
    />
  );
}
