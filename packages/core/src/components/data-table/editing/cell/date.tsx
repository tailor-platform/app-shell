import { useTimeZone } from "@/contexts/appshell-context";
import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { dateEditor } from "@/components/internals/table-core/editing/date";
import { useEditorProps, type EditableColumn, type DataTableEditableCellProps } from "./shared";

type DateColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "date" }
>;

export function DateEditCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow, DateColumn<TRow>>,
) {
  const coreProps = useEditorProps(props);
  const { value: timeZone } = useTimeZone();
  return (
    <EditableCell
      {...coreProps}
      editor={dateEditor}
      options={{ withTime: props.col.typeOptions?.dateFormat === "datetime", timeZone }}
    />
  );
}
