import type { ComponentProps, ReactNode } from "react";
import { useTimeZone } from "@/contexts/appshell-context";
import type { Table } from "@/components/table";
import type { EditableCellOwnerProps } from "@/components/internals/table-core/editing/cell";
import type { Column } from "../../types";
import { getCellValue, renderTypedValue } from "../../cell-renderers";
import { resolveBadgeOptions } from "../../cell-values";
import { useDataTableT } from "../../i18n";
import type { CellEditNavigation } from "../use-navigation";

export type EditableColumn<TRow extends Record<string, unknown>> = Extract<
  Column<TRow>,
  { type: "text" | "number" | "money" | "date" | "badge" | "link" }
>;

export function columnChoices<TRow extends Record<string, unknown>>(col: Column<TRow>) {
  if (col.type === "badge")
    return resolveBadgeOptions(col.edit?.options, col.typeOptions, col.filter);
  if (col.type === "text" || col.type === "link") return col.edit?.options;
  return undefined;
}

/** Bind collection-owned values, callbacks, formatting and localization to neutral cell UI. */
export function useEditorProps<TRow extends Record<string, unknown>>({
  row,
  col,
  dateRenderer,
  ...props
}: DataTableEditableCellProps<TRow>): EditableCellOwnerProps {
  const { value: timeZone } = useTimeZone();
  const t = useDataTableT();
  const current = getCellValue(row, col);
  const render = col.render ?? dateRenderer;
  const renderError = col.edit?.error && col.edit.error.render;
  return {
    ...props,
    current,
    display: render
      ? render(row)
      : renderTypedValue(row, col, current, { linkAsText: true, timeZone }),
    change: (value) =>
      (col.edit?.onValueChange as ((row: TRow, value: unknown) => unknown) | undefined)?.(
        row,
        value,
      ),
    commit: (value) =>
      (col.edit?.onValueCommitted as ((row: TRow, value: unknown) => unknown) | undefined)?.(
        row,
        value,
      ),
    renderError: renderError ? (error) => renderError({ row, error }) : undefined,
    interceptErrors: col.edit?.error !== false,
    truncate: col.truncate,
    slotPrefix: "data-table",
    labels: {
      notANumber: t("editNotANumber"),
      revertHint: t("editRevertHint"),
      callbackError: t("editCallbackError"),
      errorHint: t("editErrorHint"),
      showError: t("editShowError", { label: props.label }),
      errorDialog: t("editErrorDialog", { label: props.label }),
      closeError: t("editCloseError"),
      none: t("editNone"),
      noMatches: t("editNoMatches"),
      chooseTime: t("chooseTime"),
      clear: t("editClear"),
      done: t("editDone"),
    },
  };
}

export interface DataTableEditableCellProps<
  TRow extends Record<string, unknown>,
  TColumn extends EditableColumn<TRow> = EditableColumn<TRow>,
> {
  row: TRow;
  col: TColumn;
  rowKey: string;
  colKey: string;
  /** Accessible name for the editor — the column's label. */
  label: string;
  align: "left" | "right";
  tooltipLabel?: string;
  navigation: CellEditNavigation;
  /** Reuses the table's column-level date formatter cache. */
  dateRenderer?: (row: TRow) => ReactNode;
  /** `data-slot`, style, class and context-menu handlers shared with static cells. */
  cellProps: ComponentProps<typeof Table.Cell>;
}
