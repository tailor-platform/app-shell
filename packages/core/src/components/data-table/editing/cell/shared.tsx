import { useCallback, useRef, type ComponentProps, type ReactNode } from "react";
import type { Table } from "@/components/table";
import { useCellError } from "@/components/internals/table-core/cell-error";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import type { CellEditFailure } from "@/components/internals/table-core/cell-session";
import {
  EditableCellSurface,
  type EditableCellSurfaceProps,
} from "@/components/internals/table-core/cell-surface";
import type { Column } from "../../types";
import { getCellValue } from "../../cell-values";
import type { CellEditNavigation } from "../use-navigation";
import { useDataTableT } from "../../i18n";

export function useCellValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  failure: CellEditFailure | undefined,
  display: ReactNode,
) {
  const current = getCellValue(row, col);
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

export interface DataTableEditableCellProps<TRow extends Record<string, unknown>> {
  row: TRow;
  col: Column<TRow>;
  rowKey: string;
  colKey: string;
  /** Accessible name for the editor — the column's label. */
  label: string;
  align: "left" | "right";
  tooltipLabel?: string;
  navigation: CellEditNavigation;
  /** Display and icon policy are resolved once by the column adapter. */
  display: ReactNode;
  icon?: ReactNode;
  /** data-slot, style, class and context-menu handlers shared with static cells. */
  cellProps: ComponentProps<typeof Table.Cell>;
}
