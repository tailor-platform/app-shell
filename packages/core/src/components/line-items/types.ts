import type { ReactNode } from "react";
import type { createEditorFactories } from "./editors";
import type {
  ColumnCellType,
  ColumnDisplay,
  ColumnDisplayValues,
  TypedColumnDisplay,
} from "@/components/internals/table-core/column-types";

type EditorBase<TRow extends Record<string, unknown>, TValue> = {
  /** A check before adoption; throw/reject retains the draft. This is not a persistence callback. */
  onValueCommitted?: (row: Readonly<TRow>, value: TValue) => void | Promise<void>;
  canEdit?: (row: TRow) => boolean;
  /** Opt out of interception and adopt eagerly; the caller owns callback failures. */
  error?: false | { render: (ctx: { row: TRow; error: unknown }) => ReactNode };
};

export type LineItemsOption<TValue extends string | number> = {
  value: TValue;
  label: string;
  description?: string;
};

export interface LineItemsCustomEditorContext<
  TRow extends Record<string, unknown>,
  TValue,
  TDraft,
> {
  /** Current adopted value; draft changes do not update the document. */
  value: TValue;
  /** An immutable input snapshot, which may be incomplete or invalid. */
  draft: TDraft;
  onBegin: () => void;
  onChange: (draft: TDraft) => void;
  /** Parse and confirm the session's latest draft, never a supplied value. */
  onCommit: () => Promise<boolean>;
  onCancel: () => void;
  row: Readonly<TRow>;
  status: "idle" | "editing" | "confirming" | "failed";
  error: Readonly<{ source: "parse" | "change" | "commit"; error: unknown }> | undefined;
  ariaLabel: string;
  invalid: boolean;
  describedBy?: string;
}

type EditorFactories<TRow extends Record<string, unknown>, TValue> = ReturnType<
  typeof createEditorFactories<TRow, TValue>
>;
type EditorTypeMap<TRow extends Record<string, unknown>, TValue> = {
  [K in keyof EditorFactories<TRow, TValue>]: Parameters<EditorFactories<TRow, TValue>[K]>[0];
};

export type LineItemsEditorType = keyof EditorFactories<Record<string, unknown>, unknown>;

/** Editor output must fit its property, including the null emitted by an explicit clear. */
export type LineItemsEditor<TRow extends Record<string, unknown>, TValue> = {
  [K in LineItemsEditorType]: { type: K } & EditorTypeMap<TRow, TValue>[K];
}[LineItemsEditorType];

type DisplayProps<TRow extends Record<string, unknown>> = {
  label?: string;
  /** Overrides the built-in renderer, including when it returns null. */
  render?: (row: TRow) => ReactNode;
  align?: "left" | "center" | "right";
};

type PropertyColumn<TRow extends Record<string, unknown>> = {
  [K in keyof TRow & string]: DisplayProps<TRow> &
    ColumnDisplay<TRow, TRow[K]> & {
      accessorKey: K;
      accessor?: never;
      id?: string;
      edit?: EditorBase<TRow, TRow[K]> & { editor: LineItemsEditor<TRow, TRow[K]> };
    };
}[keyof TRow & string];

type ComputedColumn<TRow extends Record<string, unknown>> = DisplayProps<TRow> & {
  id: string;
  accessorKey?: never;
  edit?: never;
} & (
    | { type?: undefined; typeOptions?: never; accessor: (row: TRow) => unknown }
    | {
        [K in ColumnCellType]: TypedColumnDisplay<TRow, K> & {
          accessor: (row: TRow) => ColumnDisplayValues[K];
        };
      }[ColumnCellType]
  );

type SourceLessColumn<TRow extends Record<string, unknown>> = DisplayProps<TRow> &
  ColumnDisplay<TRow, undefined> & {
    id: string;
    accessorKey?: never;
    accessor?: never;
    edit?: never;
  };

/** A property with an optional editor, computed value, or value-less display column. */
export type LineItemsColumn<TRow extends Record<string, unknown>> =
  | PropertyColumn<TRow>
  | ComputedColumn<TRow>
  | SourceLessColumn<TRow>;

/** Initial document ownership and cell editing; persistence and business validation are not supported. */
export type UseLineItemsOptions<TRow extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<TRow>[];
  /** Read once. ID-less rows are unsaved creations removed by revert. Remount to change documents. */
  defaultLines?: readonly TRow[];
  /** Server identity property; missing IDs receive stable client-only keys. Defaults to id. */
  idKey?: keyof TRow & string;
  /** Enables manual row movement. Defaults to true; false does not restrict other row commands. */
  orderer?: boolean;
};

export type UseLineItemsReturn<TRow extends Record<string, unknown>> = {
  readonly columns: readonly LineItemsColumn<TRow>[];
  readonly lines: readonly TRow[];
  readonly orderer: boolean;
  /** Adopted changes to the persisted baseline; unconfirmed cell drafts are not included. */
  readonly isDirty: boolean;
  getLineKey: (row: TRow) => string;
  /** Updates an accessorKey-owned property and discards drafts for that property. */
  updateField: <K extends keyof TRow & string>(lineKey: string, key: K, value: TRow[K]) => void;
  /** Appends a new creation, removing any server ID from the supplied row. */
  addLine: (line: TRow) => string;
  removeLine: (lineKey: string) => void;
  /** Moves a line after another current line; null moves it to the front. Requires orderer: true. */
  reorderLine: (lineKey: string, afterLineKey: string | null) => void;
  /** Restores persisted initial rows and discards every unsaved creation and cell draft. */
  revert: () => void;
};
