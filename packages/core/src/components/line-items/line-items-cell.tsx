import { useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Table } from "@/components/table";
import { TypingEditor } from "@/components/internals/table-core/editors/typing";
import { BooleanEditor } from "@/components/internals/table-core/editors/boolean";
import { DateEditor } from "@/components/internals/table-core/editors/date";
import {
  ChoiceEditor,
  type ChoiceEditorConfig,
} from "@/components/internals/table-core/editors/choice";
import { EditableCellSurface } from "@/components/internals/table-core/cell-surface";
import { useCellError } from "@/components/internals/table-core/cell-error";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { OVERLAY_CLASS_NAME } from "@/components/internals/table-core/cell-styles";
import { parseDateValue } from "@/components/internals/table-core/date-values";
import {
  normalizeNumberText,
  parseNumberText,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "@/components/internals/table-core/input-values";
import { cn } from "@/lib/utils";
import type { LineItemsEditing } from "./editing";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn, LineItemsCustomEditorContext } from "./types";

/** The cell owns parsing and UI policy; its document owner owns sessions and adoption. */
export function LineItemsCell<T extends Record<string, unknown>>({
  row,
  column,
  index,
  editing,
  display,
  cellProps,
}: {
  row: T;
  column: LineItemsColumn<T>;
  index: number;
  editing: LineItemsEditing<T>;
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell>;
}) {
  const t = useLineItemsT();
  const [choiceActive, setChoiceActive] = useState(false);
  const columnId = (column.id ?? column.accessorKey)!;
  const session = editing.getSession(row, column);
  const snapshot = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const state = editing.isCurrentEditor(column) ? snapshot : { status: "idle" as const };
  const config = column.edit;
  const kind = config?.editorType;
  const typed = kind === "text" || kind === "number";
  const editable = !!config && (config.canEdit?.(row) ?? true);
  const label = `${column.label ?? columnId}, ${t("row", { index: index + 1 })}`;
  // Public line keys stay stable in this slice: IDs cannot change without save acknowledgment.
  const lineKey = editing.getLineKey(row);
  const raw = () =>
    column.accessorKey === undefined
      ? undefined
      : editing.getCurrentRow(lineKey)?.[column.accessorKey];
  const baseline = () => {
    if (kind === "number") return toNumberEditText(toNumberValue(raw()));
    if (kind === "text") return toTextValue(raw()) ?? "";
    return raw();
  };
  const parse = (draft: unknown): { valid: true; value: unknown } | { valid: false } => {
    if (kind === "number") {
      const value =
        typeof draft === "string" ? parseNumberText(normalizeNumberText(draft)) : undefined;
      return value === undefined ? { valid: false } : { valid: true, value };
    }
    if (kind === "text")
      return typeof draft === "string"
        ? { valid: true, value: toTextValue(draft) }
        : { valid: false };
    if (kind === "date") {
      const value = parseDateValue(draft, config?.editorType === "date" ? config : undefined);
      return value === undefined ? { valid: false } : { valid: true, value };
    }
    if (kind === "boolean" && typeof draft !== "boolean") return { valid: false };
    if (
      kind === "combobox" &&
      draft !== null &&
      typeof draft !== "string" &&
      (typeof draft !== "number" || !Number.isFinite(draft))
    )
      return { valid: false };
    return { valid: true, value: draft };
  };
  const commit = (): Promise<boolean> => {
    if (!editing.isCurrentEditor(column)) return Promise.resolve(false);
    const current = session.getState();
    if (current.status === "idle") return Promise.resolve(true);
    if (current.status === "confirming" || Object.is(current.draft, baseline()))
      return session.confirm(() => undefined);
    const parsed = parse(current.draft);
    if (!parsed.valid) {
      session.fail(undefined, "parse");
      return Promise.resolve(false);
    }
    return session.confirm(() => {
      if (!Object.is(parsed.value, raw()))
        return editing.commitField(lineKey, columnId, parsed.value);
    });
  };
  const choose = (value: unknown) => {
    if (!editing.isCurrentEditor(column)) return Promise.resolve(false);
    session.change(value);
    return commit();
  };
  const failure = state.status === "failed" ? state : undefined;
  let parseKey: "invalidNumber" | "invalidDate" | "invalidValue" = "invalidValue";
  if (kind === "number") parseKey = "invalidNumber";
  if (kind === "date") parseKey = "invalidDate";
  let message = t("commitError");
  if (failure?.source === "parse") message = t(parseKey);
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
  if (!editable || !config) return <Table.Cell {...cellProps}>{display}</Table.Cell>;
  const value = state.status === "idle" ? raw() : state.draft;
  const a11y = { ariaLabel: label, invalid: !!error, describedBy: error?.id };
  const begin = () => {
    if (editing.isCurrentEditor(column)) session.begin(baseline());
  };
  const popup = {
    onBegin: begin,
    onCancel: () => session.cancel(),
    cancelToken: session.getCancellationRevision(),
    containsErrorTarget: containsTarget,
  };
  let editor: ReactNode;
  let icon: ReactNode;
  let hideDisplay: "focused" | "forced-colors" = "forced-colors";
  if (typed) {
    if (state.status !== "idle") hideDisplay = "focused";
    editor = (
      <TypingEditor
        {...a11y}
        value={String(state.status === "idle" ? baseline() : state.draft)}
        editing={state.status !== "idle"}
        numeric={kind === "number"}
        align={cellProps.align}
        inputMode={kind === "number" ? "decimal" : undefined}
        iconSpace={!!error}
        containsErrorTarget={containsTarget}
        onBegin={begin}
        onChange={(text) => {
          if (editing.isCurrentEditor(column)) session.change(text);
        }}
        onCommit={() => {
          void commit();
        }}
        onCancel={() => session.cancel()}
        onTab={(event) => {
          const current = session.getState();
          if (current.status !== "idle" && !parse(current.draft).valid) event.preventDefault();
          void commit();
        }}
      />
    );
  } else if (config.editorType === "boolean") {
    hideDisplay = "focused";
    editor = (
      <BooleanEditor
        {...a11y}
        value={value === true}
        onCommit={(next) => {
          void choose(next);
        }}
      />
    );
  } else if (config.editorType === "date") {
    icon = <CalendarDays />;
    editor = (
      <DateEditor
        {...a11y}
        {...popup}
        value={typeof value === "string" ? value : null}
        min={config.min}
        max={config.max}
        onCommit={(next) => {
          void choose(next);
        }}
      />
    );
  } else if (config.editorType === "combobox") {
    icon = <ChevronDown />;
    if (choiceActive || state.status === "failed" || state.status === "confirming")
      hideDisplay = "focused";
    editor = (
      <ChoiceEditor
        {...a11y}
        {...popup}
        value={typeof value === "string" || typeof value === "number" ? value : null}
        row={row}
        config={config as unknown as ChoiceEditorConfig<T>}
        onCommit={choose}
        onActiveChange={setChoiceActive}
        showValue={state.status === "failed" || state.status === "confirming"}
      />
    );
  } else if (config.editorType === "custom") {
    hideDisplay = "focused";
    // The property-column contract checks TValue before this heterogeneous rendering boundary.
    const render = config.renderEditor as (
      ctx: LineItemsCustomEditorContext<T, unknown>,
    ) => ReactNode;
    editor = (
      <div className={cn(OVERLAY_CLASS_NAME, "astw:flex astw:items-center astw:gap-1")}>
        {render({
          value,
          onCommit: (next) => {
            void choose(next);
          },
          onCancel: () => session.cancel(),
          row,
          ariaLabel: label,
        })}
      </div>
    );
  }
  let surfaceDisplay = display;
  if (kind === "date" && state.status !== "idle")
    surfaceDisplay = typeof value === "string" ? value : "—";
  return (
    <EditableCellSurface
      cellProps={cellProps}
      display={surfaceDisplay}
      editing={state.status !== "idle"}
      clearTintOnFocus={kind !== "boolean"}
      hideDisplay={hideDisplay}
      icon={icon}
      callbackError={error}
      labels={{
        errorHint: t("errorHint"),
        showError: t("showError", { label }),
        errorDialog: t("errorDialog", { label }),
        closeError: t("closeError"),
      }}
      errorSlot="line-items-cell-error"
      onEditorLeave={
        typed
          ? () => {
              void commit();
            }
          : undefined
      }
      onEditorCancel={() => session.cancel()}
      getFailure={session.getFailure}
      confirming={state.status === "confirming"}
    >
      {editor}
    </EditableCellSurface>
  );
}
