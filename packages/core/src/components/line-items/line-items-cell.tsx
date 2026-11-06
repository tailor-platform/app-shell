import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { Table } from "@/components/table";
import { useCellError } from "@/components/internals/table-core/cell-error";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import type { LineItemsEditorAdapter, LineItemsEditorRenderContext } from "./editor-adapter";
import type { LineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn } from "./types";

type LineItemsCellProps<T extends Record<string, unknown>> = {
  row: T;
  column: LineItemsColumn<T>;
  index: number;
  editing: LineItemsEditing<T>;
  display: ReactNode;
  adapter?: LineItemsEditorAdapter;
  cellProps: ComponentProps<typeof Table.Cell>;
};

/** Views render adapters; their document owner coordinates every logical edit. */
export function LineItemsCell<T extends Record<string, unknown>>({
  row,
  column,
  index,
  editing,
  display,
  adapter,
  cellProps,
}: LineItemsCellProps<T>) {
  const t = useLineItemsT();
  const config = column.edit;
  const session = editing.getSession(row, column);
  const snapshot = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  // A replacement editor must never receive its predecessor's draft, even before commit.
  const state = editing.isCurrentEditor(column, adapter) ? snapshot : { status: "idle" as const };
  const failure = state.status === "failed" ? state : undefined;
  let message = t("commitError");
  if (failure?.source === "parse")
    message = typeof failure.error === "string" ? failure.error : t("invalidValue");
  else if (failure?.error instanceof CellEditError && failure.error.message)
    message = failure.error.message;
  const renderError = config?.error && config.error.render;
  const { error, containsTarget } = useCellError({
    failure,
    message: renderError && failure?.source !== "parse" ? t("commitError") : message,
    renderContent:
      failure && renderError && failure.source !== "parse"
        ? () => renderError({ row, error: failure.error })
        : undefined,
  });
  if (!adapter || !(config?.canEdit?.(row) ?? true))
    return <Table.Cell {...cellProps}>{display}</Table.Cell>;

  const columnId = (column.id ?? column.accessorKey)!;
  const label = `${column.label ?? columnId}, ${t("row", { index: index + 1 })}`;
  const value = column.accessorKey === undefined ? undefined : row[column.accessorKey];
  const context: LineItemsEditorRenderContext<T, unknown, unknown> = {
    row,
    value,
    draft: state.status === "idle" ? adapter.toDraft(value) : state.draft,
    status: state.status,
    error: failure ? { source: failure.source, error: failure.error } : undefined,
    onBegin: () => editing.begin(row, column, adapter),
    onChange: (draft) => editing.change(row, column, adapter, draft),
    onCommit: () => editing.commit(row, column, adapter, t),
    onCancel: session.cancel,
    ariaLabel: label,
    invalid: !!error,
    describedBy: error?.id,
    ui: {
      cellProps,
      display,
      error,
      containsTarget,
      session,
      labels: {
        errorHint: t("errorHint"),
        showError: t("showError", { label }),
        errorDialog: t("errorDialog", { label }),
        closeError: t("closeError"),
      },
    },
  };
  return adapter.render(context);
}
