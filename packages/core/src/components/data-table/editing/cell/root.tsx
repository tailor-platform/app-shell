import type { DataTableCellEditor } from "../../column-adapter";
import type { DataTableEditableCellProps } from "./shared";

/** The column adapter already selected and configured a stable editor component. */
export function DataTableEditableCell<TRow extends Record<string, unknown>>({
  editor,
  ...props
}: DataTableEditableCellProps<TRow> & { editor: DataTableCellEditor<TRow> }) {
  return editor.render(props);
}
