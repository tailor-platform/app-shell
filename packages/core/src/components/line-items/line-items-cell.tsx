import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { TypingEditor } from "@/components/internals/table-core/editors/typing";
import { Table } from "@/components/table";
import { Text } from "@/components/text";
import { Tooltip } from "@/components/tooltip";
import { useCellError } from "@/components/internals/table-core/cell-error";
import { EditableCellSurface } from "@/components/internals/table-core/cell-surface";
import { BooleanEditor } from "@/components/internals/table-core/editors/boolean";
import {
  ChoiceEditor,
  type ChoiceEditorConfig,
} from "@/components/internals/table-core/editors/choice";
import { DateEditor } from "@/components/internals/table-core/editors/date";
import { parseDateValue } from "@/components/internals/table-core/date-values";
import { OVERLAY_CLASS_NAME } from "@/components/internals/table-core/cell-styles";
import {
  normalizeNumberText,
  parseNumberText,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "@/components/internals/table-core/input-values";
import { cn } from "@/lib/utils";
import type { LineItemsController } from "./controller";
import { useLineItemsT } from "./i18n";
import type { LineItemsColumn, LineItemsCustomEditorContext, LineItemsMode } from "./types";

type ParsedDraft =
  | { valid: true; value: unknown }
  | { valid: false; message: "invalidNumber" | "invalidDate" | "invalidValue" };

export function LineItemsCell<T extends Record<string, unknown>>({
  row,
  column,
  index,
  mode,
  controller,
  display,
  cellProps,
  message,
}: {
  row: T;
  column: LineItemsColumn<T>;
  index: number;
  mode: LineItemsMode;
  controller: LineItemsController<T>;
  display: ReactNode;
  cellProps: ComponentProps<typeof Table.Cell>;
  message: string | undefined;
}) {
  const t = useLineItemsT();
  const [choiceActive, setChoiceActive] = useState(false);
  const columnId = (column.id ?? column.accessorKey)!;
  const clientKey = controller.getClientKey(row);
  const session = controller.getSession<unknown>(row, columnId);
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const config = column.edit;
  const kind = config?.editorType ?? "text";
  const typed = kind === "text" || kind === "number";
  const editable = mode !== "view" && !!config && (config.modes ?? ["edit"]).includes(mode);
  const label = `${column.label ?? columnId}, ${t("row", { index: index + 1 })}`;
  const raw = () => {
    const current = controller.getCurrentRow(clientKey);
    return column.accessorKey === undefined ? undefined : current?.[column.accessorKey];
  };
  const baseline = (): unknown => {
    if (kind === "number") return toNumberEditText(toNumberValue(raw()));
    if (kind === "text") return toTextValue(raw()) ?? "";
    return raw();
  };
  const parse = (draft: unknown): ParsedDraft => {
    if (kind === "number") {
      const value =
        typeof draft === "string" ? parseNumberText(normalizeNumberText(draft)) : undefined;
      return value === undefined
        ? { valid: false, message: "invalidNumber" }
        : { valid: true, value };
    }
    if (kind === "text")
      return typeof draft === "string"
        ? { valid: true, value: toTextValue(draft) }
        : { valid: false, message: "invalidValue" };
    if (kind === "date") {
      const value = parseDateValue(draft, config?.editorType === "date" ? config : undefined);
      return value === undefined
        ? { valid: false, message: "invalidDate" }
        : { valid: true, value };
    }
    if (kind === "boolean" && typeof draft !== "boolean")
      return { valid: false, message: "invalidValue" };
    if (
      kind === "combobox" &&
      draft !== null &&
      typeof draft !== "string" &&
      typeof draft !== "number"
    )
      return { valid: false, message: "invalidValue" };
    return { valid: true, value: draft };
  };
  const isChanged = () => {
    const current = session.getState();
    if (current.status === "idle" || Object.is(current.draft, baseline())) return false;
    const parsed = parse(current.draft);
    return !parsed.valid || !Object.is(parsed.value, raw());
  };
  const commit = (): Promise<boolean> => {
    const current = session.getState();
    if (current.status === "idle") return Promise.resolve(true);
    if (current.status === "confirming") return session.confirm(() => undefined);
    if (Object.is(current.draft, baseline())) return session.confirm(() => undefined);
    const parsed = parse(current.draft);
    if (!parsed.valid) {
      session.fail(new Error(t(parsed.message)), "parse");
      return Promise.resolve(false);
    }
    return session.confirm(() => {
      if (!Object.is(parsed.value, raw()))
        controller.commitField(clientKey, columnId, parsed.value);
    });
  };
  const choose = (value: unknown) => {
    session.change(value);
    void commit();
  };
  useLayoutEffect(() => {
    if (!config) return;
    return controller.registerEditor(row, columnId, {
      commit,
      isChanged,
      editorType: config.editorType,
    });
  });

  const validation = useMemo(() => (message ? { source: "validation" } : undefined), [message]);
  const failure = session.getFailure();
  let errorMessage = message ?? "";
  if (failure) errorMessage = t("commitError");
  if (failure?.source === "parse") {
    let key: "invalidNumber" | "invalidDate" | "invalidValue" = "invalidValue";
    if (kind === "number") key = "invalidNumber";
    if (kind === "date") key = "invalidDate";
    errorMessage = t(key);
  }
  const renderError = config?.error && config.error.render;
  const { error, containsTarget } = useCellError({
    failure: failure ?? validation,
    message: errorMessage,
    renderContent:
      failure && renderError ? () => renderError({ row, error: failure.error }) : undefined,
  });
  const formattedTooltip =
    typeof display === "string" || typeof display === "number" ? String(display) : undefined;
  const truncate = !!column.truncate;
  const tooltipConfig = typeof column.truncate === "object" ? column.truncate.tooltip : undefined;
  let tooltip: ReactNode = formattedTooltip;
  if (tooltipConfig === false) tooltip = undefined;
  else if (typeof tooltipConfig === "function") tooltip = tooltipConfig({ row, display });

  if (!editable || !config) {
    const cell = (
      <Table.Cell {...cellProps} aria-invalid={error ? true : undefined}>
        <span className={cn("astw:block", truncate && "astw:truncate")}>{display}</span>
        {error && (
          <Text variant="body-sm" className="astw:whitespace-normal astw:text-danger-text">
            {errorMessage}
          </Text>
        )}
      </Table.Cell>
    );
    if (!truncate || tooltip == null || error) return cell;
    return (
      <Tooltip.Root>
        <Tooltip.Trigger render={cell} />
        <Tooltip.Content>{tooltip}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  const value = state.status === "idle" ? raw() : state.draft;
  let surfaceDisplay = display;
  if (kind === "date" && state.status !== "idle")
    surfaceDisplay = typeof value === "string" ? value : "—";
  const a11y = { ariaLabel: label, invalid: !!error, describedBy: error?.id };
  const popup = {
    onBegin: () => session.begin(baseline()),
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
        onBegin={() => {
          if (session.getState().status === "idle") session.begin(baseline());
        }}
        onChange={(text) => session.change(text)}
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
    editor = <BooleanEditor {...a11y} value={value === true} onCommit={choose} />;
  } else if (config.editorType === "date") {
    icon = <CalendarDays />;
    editor = (
      <DateEditor
        {...a11y}
        {...popup}
        value={typeof value === "string" ? value : null}
        min={config.min}
        max={config.max}
        onCommit={choose}
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
    // The column helper checks the property's value contract before this heterogeneous UI boundary.
    const render = config.renderEditor as (
      context: LineItemsCustomEditorContext<T, unknown>,
    ) => ReactNode;
    editor = (
      <div className={cn(OVERLAY_CLASS_NAME, "astw:flex astw:items-center astw:gap-1")}>
        {render({
          value,
          onCommit: choose,
          onCancel: () => session.cancel(),
          row,
          mode,
          ariaLabel: label,
        })}
      </div>
    );
  }
  return (
    <EditableCellSurface
      cellProps={cellProps}
      display={surfaceDisplay}
      truncate={truncate}
      tooltipLabel={truncate ? tooltip : undefined}
      editing={state.status !== "idle"}
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
      getFailure={() => session.getFailure() ?? validation}
      confirming={state.status === "confirming"}
    >
      {editor}
    </EditableCellSurface>
  );
}
