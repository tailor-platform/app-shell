import type { Column } from "../types";
import { columnChoices, type EditableColumn, type DataTableEditableCellProps } from "./shared";
import { TypingEditCell } from "./typing-cell";
import { ChoiceEditCell } from "./choice-cell";
import { DateEditCell } from "./date-cell";

/**
 * Whether the column carries an `edit` config it can use: any typed column
 * except a `badge` one with no choices to offer.
 *
 * @internal
 */
export function isEditableColumn<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
): col is EditableColumn<TRow> {
  if (col.edit === undefined || col.type === undefined) return false;
  return col.type !== "badge" || (columnChoices(col)?.length ?? 0) > 0;
}

/**
 * Whether the column's editor shows an icon (a dropdown's chevron or a date's
 * calendar). Typed-into cells show none: the cell's tint already says it's
 * editable, and a pen in every cell reads as noise.
 *
 * @internal
 */
export function hasEditorIcon<TRow extends Record<string, unknown>>(col: Column<TRow>): boolean {
  return (
    col.type === "date" ||
    col.type === "badge" ||
    ((col.type === "text" || col.type === "link") && !!col.edit?.options)
  );
}

/**
 * A body cell whose value can be edited in place. The value belongs to the
 * consumer: the cell only holds a draft while it is being edited, and notifies
 * `edit.onValueChange` for drafts and `edit.onValueCommitted` for changed,
 * confirmed values. Validation and persistence belong to the consumer.
 *
 * - `number`, `money`, and `text` / `link` without choices are typed into.
 * - `badge`, and `text` / `link` with `edit.options`, are dropdowns you can
 *   type into to search.
 * - `date` opens a calendar.
 *
 * @internal
 */
export function DataTableEditableCell<TRow extends Record<string, unknown>>(
  props: DataTableEditableCellProps<TRow>,
) {
  const { col } = props;
  const mode = col.edit?.error === false ? "unhandled" : "handled";
  if (col.type === "date") return <DateEditCell key={mode} {...props} col={col} />;
  if (col.type === "badge" || ((col.type === "text" || col.type === "link") && col.edit?.options)) {
    return <ChoiceEditCell key={mode} {...props} col={col} />;
  }
  return <TypingEditCell key={mode} {...props} col={col} />;
}
