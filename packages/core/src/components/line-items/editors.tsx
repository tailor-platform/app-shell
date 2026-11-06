import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import { TypingEditor } from "@/components/internals/table-core/editors/typing";
import { BooleanEditor } from "@/components/internals/table-core/editors/boolean";
import { DateEditor } from "@/components/internals/table-core/editors/date";
import {
  ChoiceEditor,
  type ChoiceEditorConfig,
} from "@/components/internals/table-core/editors/choice";
import { parseDateValue } from "@/components/internals/table-core/date-values";
import {
  normalizeNumberText,
  parseNumberText,
  toNumberEditText,
  toNumberValue,
  toTextValue,
} from "@/components/internals/table-core/input-values";
import {
  EditorFrame,
  LINE_ITEMS_EDITOR_ADAPTER,
  packLineItemsEditor,
  type DefinedLineItemsEditor,
  type LineItemsEditorAdapter,
  type LineItemsEditorRenderContext,
} from "./editor-adapter";
import type { LineItemsEditorType, LineItemsOption } from "./types";

type Context<TRow extends Record<string, unknown>> = LineItemsEditorRenderContext<
  TRow,
  unknown,
  unknown
>;

function TypingCell<TRow extends Record<string, unknown>>({
  numeric,
  ...context
}: Context<TRow> & { numeric: boolean }) {
  const isEditing = context.status !== "idle";
  return (
    <EditorFrame
      context={context}
      hideDisplay={isEditing ? "focused" : "forced-colors"}
      onEditorLeave={() => {
        void context.onCommit();
      }}
    >
      <TypingEditor
        ariaLabel={context.ariaLabel}
        invalid={context.invalid}
        describedBy={context.describedBy}
        value={String(context.draft)}
        editing={isEditing}
        numeric={numeric}
        align={context.ui.cellProps.align}
        inputMode={numeric ? "decimal" : undefined}
        iconSpace={!!context.ui.error}
        containsErrorTarget={context.ui.containsTarget}
        onBegin={context.onBegin}
        onChange={context.onChange}
        onCommit={() => {
          void context.onCommit();
        }}
        onCancel={context.onCancel}
        onTab={(event) => {
          void context.onCommit();
          // Parsing is synchronous, before native Tab moves focus.
          if (context.ui.session.getFailure()?.source === "parse") event.preventDefault();
        }}
      />
    </EditorFrame>
  );
}

function BooleanCell<TRow extends Record<string, unknown>>(context: Context<TRow>) {
  return (
    <EditorFrame context={context} hideDisplay="focused" clearTintOnFocus={false}>
      <BooleanEditor
        ariaLabel={context.ariaLabel}
        invalid={context.invalid}
        describedBy={context.describedBy}
        value={context.draft === true}
        onCommit={(next) => {
          context.onChange(next);
          void context.onCommit();
        }}
      />
    </EditorFrame>
  );
}

function DateCell<TRow extends Record<string, unknown>>({
  bounds,
  ...context
}: Context<TRow> & { bounds: { min?: string; max?: string } }) {
  const draftDisplay = typeof context.draft === "string" ? context.draft : "—";
  return (
    <EditorFrame
      context={context}
      display={context.status === "idle" ? context.ui.display : draftDisplay}
      icon={<CalendarDays />}
      hideDisplay="forced-colors"
    >
      <DateEditor
        ariaLabel={context.ariaLabel}
        invalid={context.invalid}
        describedBy={context.describedBy}
        value={typeof context.draft === "string" ? context.draft : null}
        {...bounds}
        onBegin={context.onBegin}
        onCancel={context.onCancel}
        cancelToken={context.ui.session.getCancellationRevision()}
        containsErrorTarget={context.ui.containsTarget}
        onCommit={(next) => {
          context.onChange(next);
          void context.onCommit();
        }}
      />
    </EditorFrame>
  );
}

function ChoiceCell<TRow extends Record<string, unknown>>({
  config,
  ...context
}: Context<TRow> & { config: ChoiceEditorConfig<TRow> }) {
  const [active, setActive] = useState(false);
  const showValue = context.status === "failed" || context.status === "confirming";
  return (
    <EditorFrame
      context={context}
      icon={<ChevronDown />}
      hideDisplay={active || showValue ? "focused" : "forced-colors"}
    >
      <ChoiceEditor
        ariaLabel={context.ariaLabel}
        invalid={context.invalid}
        describedBy={context.describedBy}
        value={
          typeof context.draft === "string" || typeof context.draft === "number"
            ? context.draft
            : null
        }
        row={context.row}
        config={config}
        onBegin={context.onBegin}
        onCancel={context.onCancel}
        cancelToken={context.ui.session.getCancellationRevision()}
        containsErrorTarget={context.ui.containsTarget}
        onCommit={(next) => {
          context.onChange(next);
          return context.onCommit();
        }}
        onActiveChange={setActive}
        showValue={showValue}
      />
    </EditorFrame>
  );
}

const TEXT = Symbol("text");
const NUMBER = Symbol("number");
const BOOLEAN = Symbol("boolean");
const DATE = Symbol("date");
const CHOICE = Symbol("choice");

export type EditorFactory = (
  config: Record<string, unknown>,
  options: Record<string, unknown>,
) => LineItemsEditorAdapter;

type Adoptable<TOutput, TValue, TEditor> = [TOutput] extends [TValue] ? TEditor : never;
type ChoiceEditorOptions<TRow extends Record<string, unknown>, TValue extends string | number> =
  | {
      options: readonly LineItemsOption<TValue>[];
      fetcher?: never;
      getOptionLabel?: never;
      placeholder?: string;
    }
  | {
      options?: never;
      fetcher: AsyncFetcher<LineItemsOption<TValue>>;
      getOptionLabel: (value: TValue, row: TRow) => string;
      placeholder?: string;
    };

/** Factory signatures are the source of supported kinds and field-specific configuration. */
export function createEditorFactories<TRow extends Record<string, unknown>, TValue>() {
  return {
    text(config: Adoptable<string | null, TValue, { options?: never }>) {
      if (config.options !== undefined) throw new Error("Text editors have no options");
      return packLineItemsEditor(
        {
          toDraft: (current: unknown) => toTextValue(current) ?? "",
          parse: (draft: unknown, t) =>
            typeof draft === "string"
              ? { ok: true, value: toTextValue(draft) }
              : { ok: false, message: t("invalidValue") },
          render: TypingCell,
        },
        { numeric: false },
        [TEXT],
      );
    },
    number(config: Adoptable<number | null, TValue, { options?: never }>) {
      if (config.options !== undefined) throw new Error("Number editors have no options");
      return packLineItemsEditor(
        {
          toDraft: (current: unknown) => toNumberEditText(toNumberValue(current)),
          parse: (draft: unknown, t) => {
            const parsed =
              typeof draft === "string" ? parseNumberText(normalizeNumberText(draft)) : undefined;
            return parsed === undefined
              ? { ok: false, message: t("invalidNumber") }
              : { ok: true, value: parsed };
          },
          render: TypingCell,
        },
        { numeric: true },
        [NUMBER],
      );
    },
    boolean(config: Adoptable<boolean, TValue, { options?: never }>) {
      if (config.options !== undefined) throw new Error("Boolean editors have no options");
      return packLineItemsEditor(
        {
          toDraft: (current: unknown) => current,
          parse: (draft: unknown, t) =>
            typeof draft === "boolean"
              ? { ok: true, value: draft }
              : { ok: false, message: t("invalidValue") },
          render: BooleanCell,
        },
        {},
        [BOOLEAN],
      );
    },
    date(
      config: [TValue] extends [string | null | undefined]
        ? Adoptable<string | null, TValue, { options?: { min?: string; max?: string } }>
        : never,
      options: Record<string, unknown>,
    ) {
      if ("min" in config || "max" in config)
        throw new Error("Date settings belong in editor.options");
      const { min, max } = options;
      if (
        (min !== undefined && typeof min !== "string") ||
        (max !== undefined && typeof max !== "string")
      )
        throw new Error("Date bounds must be date-only strings");
      const bounds = { min, max };
      parseDateValue(null, bounds);
      return packLineItemsEditor(
        {
          toDraft: (current: unknown) => current,
          parse: (draft: unknown, t) => {
            const parsed = parseDateValue(draft, bounds);
            return parsed === undefined
              ? { ok: false, message: t("invalidDate") }
              : { ok: true, value: parsed };
          },
          render: DateCell,
        },
        { bounds },
        [DATE, min, max],
      );
    },
    combobox(
      config: null extends TValue
        ? [Extract<TValue, string | number>] extends [never]
          ? never
          : { options: ChoiceEditorOptions<TRow, Extract<TValue, string | number>> }
        : never,
      options: Record<string, unknown>,
    ) {
      if ("fetcher" in config || "getOptionLabel" in config || "placeholder" in config)
        throw new Error("Choice settings belong in editor.options");
      if (options.fetcher === undefined && !Array.isArray(options.options))
        throw new Error("Choice editors require options or a fetcher");
      if (
        options.fetcher !== undefined &&
        (options.options !== undefined || typeof options.getOptionLabel !== "function")
      )
        throw new Error("Remote choices require getOptionLabel and cannot also define options");
      return packLineItemsEditor(
        {
          toDraft: (current: unknown) => current,
          parse: (draft: unknown, t) =>
            draft === null ||
            typeof draft === "string" ||
            (typeof draft === "number" && Number.isFinite(draft))
              ? { ok: true, value: draft }
              : { ok: false, message: t("invalidValue") },
          render: ChoiceCell,
        },
        { config: { ...options } as ChoiceEditorConfig<Record<string, unknown>> },
        [CHOICE, options.fetcher],
      );
    },
    custom(config: Omit<DefinedLineItemsEditor<TRow, TValue>, "type">) {
      if (!(LINE_ITEMS_EDITOR_ADAPTER in config))
        throw new Error("Custom editors must be created with defineLineItemsEditor");
      return config[LINE_ITEMS_EDITOR_ADAPTER];
    },
  } satisfies Record<string, (...args: never[]) => LineItemsEditorAdapter>;
}

// Only the validated runtime dispatcher erases the field-dependent input signatures.
export const editorFactories = createEditorFactories<
  Record<string, unknown>,
  unknown
>() as unknown as Record<LineItemsEditorType, EditorFactory>;

/** Validate editor configuration and resolve every editor into the same execution contract. */
export function resolveLineItemsEditor(value: unknown): LineItemsEditorAdapter {
  if (!value || typeof value !== "object") throw new Error("Unsupported LineItems cell editor");
  const config = value as Record<string, unknown>;
  const type = config.type;
  if (typeof type !== "string" || !Object.hasOwn(editorFactories, type))
    throw new Error("Unsupported LineItems cell editor");
  if (
    config.options !== undefined &&
    (!config.options || typeof config.options !== "object" || Array.isArray(config.options))
  )
    throw new Error("LineItems editor.options must be a configuration object");
  return editorFactories[type as LineItemsEditorType](
    config,
    (config.options ?? {}) as Record<string, unknown>,
  );
}
