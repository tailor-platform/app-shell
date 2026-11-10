import { BadgeList } from "@/components/badge-list";
import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { choiceEditor } from "@/components/internals/table-core/editing/choice";
import {
  columnChoices,
  useEditorProps,
  type EditableColumn,
  type DataTableEditableCellProps,
} from "./shared";

type ChoiceColumn<TRow extends Record<string, unknown>> = Extract<
  EditableColumn<TRow>,
  { type: "text" | "link" | "badge" }
>;

export function ChoiceEditCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow, ChoiceColumn<TRow>>,
) {
  const coreProps = useEditorProps(props);
  const { col } = props;
  return (
    <EditableCell
      {...coreProps}
      editor={choiceEditor}
      options={{
        choices: columnChoices(col) ?? [],
        renderOption:
          col.type === "badge"
            ? (value, label) => (
                <BadgeList value={value} options={col.typeOptions} resolveLabel={() => label} />
              )
            : undefined,
      }}
    />
  );
}
