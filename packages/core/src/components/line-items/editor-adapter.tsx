import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Table } from "@/components/table";
import {
  EditableCellSurface,
  type CellSurfaceLabels,
  type EditableCellSurfaceProps,
} from "@/components/internals/table-core/cell-surface";
import type { CellErrorUI } from "@/components/internals/table-core/cell-error";
import type { createCellEditSession } from "@/components/internals/table-core/cell-session";
import { OVERLAY_CLASS_NAME } from "@/components/internals/table-core/cell-styles";
import { cn } from "@/lib/utils";
import type { useLineItemsT } from "./i18n";
import type { LineItemsCustomEditorContext } from "./types";

export type LineItemsParseResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; message: string };

type EditorUI = {
  cellProps: ComponentProps<typeof Table.Cell>;
  display: ReactNode;
  error?: CellErrorUI;
  containsTarget: (target: EventTarget | null) => boolean;
  session: ReturnType<typeof createCellEditSession<unknown>>;
  labels: CellSurfaceLabels;
};

export type LineItemsEditorRenderContext<
  TRow extends Record<string, unknown>,
  TValue,
  TDraft,
> = LineItemsCustomEditorContext<TRow, TValue, TDraft> & { ui: EditorUI };

type RuntimeContext = LineItemsEditorRenderContext<Record<string, unknown>, unknown, unknown>;

export type LineItemsEditorAdapter = {
  readonly contract: readonly unknown[];
  readonly toDraft: (value: unknown) => unknown;
  readonly parse: (
    draft: unknown,
    t: ReturnType<typeof useLineItemsT>,
  ) => LineItemsParseResult<unknown>;
  readonly render: (context: RuntimeContext) => ReactNode;
};

export const LINE_ITEMS_EDITOR_ADAPTER = Symbol("LineItems.editor-adapter");
declare const compatibility: unique symbol;

/** The draft type is captured privately; both current input and possible output must fit. */
export interface DefinedLineItemsEditor<TRow extends Record<string, unknown>, TValue> {
  readonly type: "custom";
  readonly [LINE_ITEMS_EDITOR_ADAPTER]: LineItemsEditorAdapter;
  readonly [compatibility]?: {
    row: (row: TRow) => TRow;
    value: (value: TValue) => TValue;
  };
}

/** The owner may only feed a draft back to its matching editor contract. */
export function packLineItemsEditor<
  TRow extends Record<string, unknown>,
  TValue,
  TDraft,
  TProps extends object,
>(
  definition: {
    toDraft: (value: TValue) => TDraft;
    parse: (draft: TDraft, t: ReturnType<typeof useLineItemsT>) => LineItemsParseResult<TValue>;
    render: ComponentType<LineItemsEditorRenderContext<TRow, TValue, TDraft> & TProps>;
  },
  props: TProps,
  contract: readonly unknown[],
): LineItemsEditorAdapter {
  const { toDraft, parse, render: Render } = definition;
  const boundProps = Object.freeze({ ...props });
  return Object.freeze({
    contract: Object.freeze([...contract]),
    toDraft: (value: unknown) => toDraft(value as TValue),
    parse: (draft: unknown, t: ReturnType<typeof useLineItemsT>) => parse(draft as TDraft, t),
    render: (context: RuntimeContext) => (
      <Render
        {...(context as LineItemsEditorRenderContext<TRow, TValue, TDraft>)}
        {...boundProps}
      />
    ),
  });
}

export function sameEditorContract(
  left: LineItemsEditorAdapter,
  right: LineItemsEditorAdapter,
): boolean {
  return (
    left.contract.length === right.contract.length &&
    left.contract.every((value, index) => Object.is(value, right.contract[index]))
  );
}

export function EditorFrame({
  context,
  ...props
}: {
  context: Pick<RuntimeContext, "ui" | "status" | "onCancel">;
} & Pick<
  EditableCellSurfaceProps,
  "children" | "icon" | "hideDisplay" | "clearTintOnFocus" | "onEditorLeave"
> & { display?: ReactNode }) {
  return (
    <EditableCellSurface
      cellProps={context.ui.cellProps}
      display={context.ui.display}
      {...props}
      editing={context.status !== "idle"}
      callbackError={context.ui.error}
      labels={context.ui.labels}
      errorSlot="line-items-cell-error"
      onEditorCancel={context.onCancel}
      getFailure={context.ui.session.getFailure}
      confirming={context.status === "confirming"}
    />
  );
}

function CustomEditor<TRow extends Record<string, unknown>, TValue, TDraft>({
  Render,
  ui,
  ...context
}: LineItemsEditorRenderContext<TRow, TValue, TDraft> & {
  Render: ComponentType<LineItemsCustomEditorContext<TRow, TValue, TDraft>>;
}) {
  return (
    <EditorFrame
      context={{ ui, status: context.status, onCancel: context.onCancel }}
      hideDisplay="focused"
    >
      <div className={cn(OVERLAY_CLASS_NAME, "astw:flex astw:items-center astw:gap-1")}>
        <Render {...context} />
      </div>
    </EditorFrame>
  );
}

/** Define a stable custom editor with synchronous, pure conversion and immutable drafts. */
export function defineLineItemsEditor<
  TRow extends Record<string, unknown>,
  TValue,
  TDraft,
>(definition: {
  toDraft: (value: TValue) => TDraft;
  parse: (draft: TDraft) => LineItemsParseResult<TValue>;
  render: ComponentType<LineItemsCustomEditorContext<TRow, TValue, TDraft>>;
}): DefinedLineItemsEditor<TRow, TValue> {
  const { toDraft, parse, render } = definition;
  if (typeof toDraft !== "function" || typeof parse !== "function")
    throw new Error("Custom editors require toDraft and parse functions");
  return Object.freeze({
    type: "custom",
    [LINE_ITEMS_EDITOR_ADAPTER]: packLineItemsEditor<
      TRow,
      TValue,
      TDraft,
      { Render: typeof render }
    >({ toDraft, parse, render: CustomEditor<TRow, TValue, TDraft> }, { Render: render }, [{}]),
  });
}
