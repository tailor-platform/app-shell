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
import {
  EditableCellSurface,
  type EditableCellSurfaceProps,
} from "@/components/internals/table-core/cell-surface";
import { useCellError } from "@/components/internals/table-core/cell-error";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import type { CellEditFailure } from "@/components/internals/table-core/cell-session";
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

type LineItemsCellProps<T extends Record<string, unknown>> = {
  row: T;
  column: LineItemsColumn<T>;
  index: number;
  editing: LineItemsEditing<T>;
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell>;
};
type CellConfig<T extends Record<string, unknown>> = NonNullable<LineItemsColumn<T>["edit"]>;
type CellEditing = ReturnType<typeof useLineItemsCellEditing>;
type CellProps = Pick<EditableCellSurfaceProps, "cellProps" | "display"> & {
  cell: CellEditing;
};

/** The cell owns parsing and UI policy; its document owner owns sessions and adoption. */
export function LineItemsCell<T extends Record<string, unknown>>(props: LineItemsCellProps<T>) {
  const cell = useLineItemsCellEditing(props);
  const config = props.column.edit;
  if (!cell.editable || !config)
    return <Table.Cell {...props.cellProps}>{props.display}</Table.Cell>;

  const cellProps = { cell, cellProps: props.cellProps, display: props.display };
  switch (config.editorType) {
    case "text":
    case "number":
      return <TypingCell {...cellProps} numeric={config.editorType === "number"} />;
    case "boolean":
      return <BooleanCell {...cellProps} />;
    case "date":
      return <DateCell {...cellProps} min={config.min} max={config.max} />;
    case "combobox":
      return (
        <ChoiceCell
          {...cellProps}
          row={props.row}
          config={config as unknown as ChoiceEditorConfig<T>}
        />
      );
    case "custom":
      // The property-column contract checks TValue before this heterogeneous rendering boundary.
      return (
        <CustomCell
          {...cellProps}
          row={props.row}
          renderEditor={
            config.renderEditor as (ctx: LineItemsCustomEditorContext<T, unknown>) => ReactNode
          }
        />
      );
  }
}

function TypingCell({ cell, numeric, ...props }: CellProps & { numeric: boolean }) {
  const isEditing = cell.state.status !== "idle";
  return (
    <LineItemsCellFrame
      {...props}
      cell={cell}
      hideDisplay={isEditing ? "focused" : "forced-colors"}
      onEditorLeave={() => {
        void cell.commit();
      }}
    >
      <TypingEditor
        {...cell.a11y}
        value={String(isEditing ? cell.value : cell.baseline())}
        editing={isEditing}
        numeric={numeric}
        align={props.cellProps.align}
        inputMode={numeric ? "decimal" : undefined}
        iconSpace={!!cell.error}
        containsErrorTarget={cell.containsTarget}
        onBegin={cell.begin}
        onChange={cell.change}
        onCommit={() => {
          void cell.commit();
        }}
        onCancel={cell.cancel}
        onTab={(event) => {
          const current = cell.session.getState();
          if (current.status !== "idle" && !cell.parse(current.draft).valid) event.preventDefault();
          void cell.commit();
        }}
      />
    </LineItemsCellFrame>
  );
}

function BooleanCell({ cell, ...props }: CellProps) {
  return (
    <LineItemsCellFrame {...props} cell={cell} hideDisplay="focused" clearTintOnFocus={false}>
      <BooleanEditor
        {...cell.a11y}
        value={cell.value === true}
        onCommit={(next) => {
          void cell.choose(next);
        }}
      />
    </LineItemsCellFrame>
  );
}

function DateCell({
  cell,
  min,
  max,
  ...props
}: CellProps & Pick<ComponentProps<typeof DateEditor>, "min" | "max">) {
  const draftDisplay = typeof cell.value === "string" ? cell.value : "—";
  const display = cell.state.status === "idle" ? props.display : draftDisplay;
  return (
    <LineItemsCellFrame
      {...props}
      cell={cell}
      display={display}
      icon={<CalendarDays />}
      hideDisplay="forced-colors"
    >
      <DateEditor
        {...cell.a11y}
        {...cell.popup}
        value={typeof cell.value === "string" ? cell.value : null}
        min={min}
        max={max}
        onCommit={(next) => {
          void cell.choose(next);
        }}
      />
    </LineItemsCellFrame>
  );
}

function ChoiceCell<T extends Record<string, unknown>>({
  cell,
  config,
  row,
  ...props
}: CellProps & { row: T; config: ChoiceEditorConfig<T> }) {
  const [active, setActive] = useState(false);
  const showValue = cell.state.status === "failed" || cell.state.status === "confirming";
  return (
    <LineItemsCellFrame
      {...props}
      cell={cell}
      icon={<ChevronDown />}
      hideDisplay={active || showValue ? "focused" : "forced-colors"}
    >
      <ChoiceEditor
        {...cell.a11y}
        {...cell.popup}
        value={typeof cell.value === "string" || typeof cell.value === "number" ? cell.value : null}
        row={row}
        config={config}
        onCommit={cell.choose}
        onActiveChange={setActive}
        showValue={showValue}
      />
    </LineItemsCellFrame>
  );
}

function CustomCell<T extends Record<string, unknown>>({
  cell,
  renderEditor,
  row,
  ...props
}: CellProps & {
  row: T;
  renderEditor: (ctx: LineItemsCustomEditorContext<T, unknown>) => ReactNode;
}) {
  return (
    <LineItemsCellFrame {...props} cell={cell} hideDisplay="focused">
      <div className={cn(OVERLAY_CLASS_NAME, "astw:flex astw:items-center astw:gap-1")}>
        {renderEditor({
          value: cell.value,
          onCommit: (next) => {
            void cell.choose(next);
          },
          onCancel: cell.cancel,
          row,
          ariaLabel: cell.a11y.ariaLabel,
        })}
      </div>
    </LineItemsCellFrame>
  );
}

function LineItemsCellFrame({
  cell,
  ...props
}: CellProps &
  Pick<
    EditableCellSurfaceProps,
    "children" | "icon" | "hideDisplay" | "clearTintOnFocus" | "onEditorLeave"
  >) {
  return (
    <EditableCellSurface
      {...props}
      editing={cell.state.status !== "idle"}
      callbackError={cell.error}
      labels={cell.labels}
      errorSlot="line-items-cell-error"
      onEditorCancel={cell.cancel}
      getFailure={cell.session.getFailure}
      confirming={cell.state.status === "confirming"}
    />
  );
}

function useLineItemsCellEditing<T extends Record<string, unknown>>({
  row,
  column,
  index,
  editing,
}: LineItemsCellProps<T>) {
  const t = useLineItemsT();
  const columnId = (column.id ?? column.accessorKey)!;
  const session = editing.getSession(row, column);
  const snapshot = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const state = editing.isCurrentEditor(column) ? snapshot : { status: "idle" as const };
  const config = column.edit;
  const editable = !!config && (config.canEdit?.(row) ?? true);
  const label = `${column.label ?? columnId}, ${t("row", { index: index + 1 })}`;
  // Public line keys stay stable in this slice: IDs cannot change without save acknowledgment.
  const lineKey = editing.getLineKey(row);
  const raw = () =>
    column.accessorKey === undefined
      ? undefined
      : editing.getCurrentRow(lineKey)?.[column.accessorKey];
  const baseline = () => getEditBaseline<T>(config?.editorType, raw());
  const parse = (draft: unknown) =>
    parseEditDraft<T>(
      config?.editorType,
      draft,
      config?.editorType === "date" ? config : undefined,
    );
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
  const message = getEditErrorMessage<T>(config?.editorType, failure, t);
  const renderError = config?.error && config.error.render;
  const { error, containsTarget } = useCellError({
    failure,
    message: renderError && failure?.source !== "parse" ? t("commitError") : message,
    renderContent:
      failure && renderError && failure.source !== "parse"
        ? () => renderError({ row, error: failure.error })
        : undefined,
  });
  const value = state.status === "idle" ? raw() : state.draft;
  const a11y = { ariaLabel: label, invalid: !!error, describedBy: error?.id };
  const begin = () => {
    if (editing.isCurrentEditor(column)) session.begin(baseline());
  };
  const change = (draft: unknown) => {
    if (editing.isCurrentEditor(column)) session.change(draft);
  };
  const cancel = () => session.cancel();
  const popup = {
    onBegin: begin,
    onCancel: cancel,
    cancelToken: session.getCancellationRevision(),
    containsErrorTarget: containsTarget,
  };
  return {
    session,
    state,
    editable,
    value,
    baseline,
    parse,
    begin,
    change,
    commit,
    choose,
    cancel,
    error,
    containsTarget,
    a11y,
    popup,
    labels: {
      errorHint: t("errorHint"),
      showError: t("showError", { label }),
      errorDialog: t("errorDialog", { label }),
      closeError: t("closeError"),
    },
  };
}

function getEditBaseline<T extends Record<string, unknown>>(
  kind: CellConfig<T>["editorType"] | undefined,
  value: unknown,
) {
  if (kind === "number") return toNumberEditText(toNumberValue(value));
  if (kind === "text") return toTextValue(value) ?? "";
  return value;
}

function parseEditDraft<T extends Record<string, unknown>>(
  kind: CellConfig<T>["editorType"] | undefined,
  draft: unknown,
  dateBounds?: Parameters<typeof parseDateValue>[1],
): { valid: true; value: unknown } | { valid: false } {
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
    const value = parseDateValue(draft, dateBounds);
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
}

function getEditErrorMessage<T extends Record<string, unknown>>(
  kind: CellConfig<T>["editorType"] | undefined,
  failure: CellEditFailure | undefined,
  t: ReturnType<typeof useLineItemsT>,
) {
  if (failure?.source === "parse") {
    if (kind === "number") return t("invalidNumber");
    if (kind === "date") return t("invalidDate");
    return t("invalidValue");
  }
  if (failure?.error instanceof CellEditError && failure.error.message)
    return failure.error.message;
  return t("commitError");
}
