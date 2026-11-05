import { useCallback, useRef, type ComponentProps, type ReactNode } from "react";
import { useTimeZone } from "@/contexts/appshell-context";
import type { Table } from "@/components/table";
import { useCellError } from "@/components/internals/table-core/cell-error";
import {
  EditableCellSurface,
  type EditableCellSurfaceProps,
} from "@/components/internals/table-core/cell-surface";
import type { Column } from "../../types";
import { getCellValue, renderTypedValue } from "../../cell-renderers";
import { CellEditError } from "../../cell-edit-error";
import { resolveBadgeOptions } from "../../cell-values";
import type { CellEditNavigation } from "../use-navigation";
import { useDataTableT } from "../../i18n";
import type { CellEditFailure } from "../use-session";

export {
  ICON_SPACE_CLASS_NAME,
  OVERLAY_CLASS_NAME,
  CELL_FOCUS_CLASS_NAME,
  CELL_ERROR_CLASS_NAME,
  INPUT_CLASS_NAME,
  ICON_INPUT_CLASS_NAME,
  POPUP_CLASS_NAME,
} from "@/components/internals/table-core/cell-styles";

/** A typed column whose cells can be edited in place. @internal */
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

export function useCellValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: EditableColumn<TRow>,
  failure: CellEditFailure | undefined,
  dateRenderer?: (row: TRow) => ReactNode,
) {
  const { value: timeZone } = useTimeZone();
  const current = getCellValue(row, col);
  const render = col.render ?? dateRenderer;
  const display = render
    ? render(row)
    : renderTypedValue(row, col, current, { linkAsText: true, timeZone });
  const t = useDataTableT();
  const change = (value: unknown) =>
    (col.edit?.onValueChange as ((row: TRow, value: unknown) => unknown) | undefined)?.(row, value);
  const commit = (value: unknown) =>
    (col.edit?.onValueCommitted as ((row: TRow, value: unknown) => unknown) | undefined)?.(
      row,
      value,
    );
  const errorConfig = col.edit?.error;
  const renderError = errorConfig && errorConfig.render;
  const message =
    failure?.error instanceof CellEditError && failure.error.message
      ? failure.error.message
      : t("editCallbackError");
  const { error: callbackError, containsTarget: containsErrorTarget } = useCellError({
    failure: failure && failure.source !== "parse" ? failure : undefined,
    message: renderError ? t("editCallbackError") : message,
    renderContent:
      failure && renderError ? () => renderError({ row, error: failure.error }) : undefined,
  });
  return { current, display, change, commit, callbackError, containsErrorTarget };
}

/** Unregister every detached editor even when an underlying control merges callback refs. */
export function useNavigationRef<T extends HTMLElement>(
  navigation: CellEditNavigation,
  rowKey: string,
  colKey: string,
) {
  const unregisterRef = useRef<(() => void) | null>(null);
  return useCallback(
    (element: T | null) => {
      unregisterRef.current?.();
      unregisterRef.current = element ? navigation.register(rowKey, colKey, element) : null;
    },
    [navigation, rowKey, colKey],
  );
}

/** DataTable keeps its labels and DOM slot contract outside the shared surface. */
export function EditableCellFrame({
  label,
  ...props
}: Omit<EditableCellSurfaceProps, "labels" | "errorSlot"> & { label: string }) {
  const t = useDataTableT();
  return (
    <EditableCellSurface
      {...props}
      errorSlot="data-table-cell-error"
      labels={{
        errorHint: t("editErrorHint"),
        showError: t("editShowError", { label }),
        errorDialog: t("editErrorDialog", { label }),
        closeError: t("editCloseError"),
      }}
    />
  );
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
  /** data-slot, style, class and context-menu handlers shared with static cells. */
  cellProps: ComponentProps<typeof Table.Cell>;
}
