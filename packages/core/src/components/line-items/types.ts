import type { ReactNode } from "react";
import type { AsyncFetcher } from "@/hooks/use-async-items";
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

export interface LineItemsCustomEditorContext<TRow extends Record<string, unknown>, TValue> {
  value: TValue;
  onCommit: (next: TValue) => void;
  onCancel: () => void;
  row: Readonly<TRow>;
  ariaLabel: string;
}

type Adoptable<TOutput, TValue, TEditor> = [TOutput] extends [TValue] ? TEditor : never;
type ChoiceEditor<TRow extends Record<string, unknown>, TValue extends string | number> =
  | {
      editorType: "combobox";
      options: readonly LineItemsOption<TValue>[];
      fetcher?: never;
      getOptionLabel?: never;
      placeholder?: string;
    }
  | {
      editorType: "combobox";
      options?: never;
      fetcher: AsyncFetcher<LineItemsOption<TValue>>;
      getOptionLabel: (value: TValue, row: TRow) => string;
      placeholder?: string;
    };

/** Editor output must fit its property, including the null emitted by an explicit clear. */
export type LineItemsEditor<TRow extends Record<string, unknown>, TValue> =
  | Adoptable<string | null, TValue, EditorBase<TRow, string | null> & { editorType: "text" }>
  | Adoptable<number | null, TValue, EditorBase<TRow, number | null> & { editorType: "number" }>
  | Adoptable<boolean, TValue, EditorBase<TRow, boolean> & { editorType: "boolean" }>
  | ([TValue] extends [string | null | undefined]
      ? Adoptable<
          string | null,
          TValue,
          EditorBase<TRow, string | null> & { editorType: "date"; min?: string; max?: string }
        >
      : never)
  | (null extends TValue
      ? [Extract<TValue, string | number>] extends [never]
        ? never
        : EditorBase<TRow, Extract<TValue, string | number> | null> &
            ChoiceEditor<TRow, Extract<TValue, string | number>>
      : never)
  | (EditorBase<TRow, TValue> & {
      editorType: "custom";
      renderEditor: (ctx: LineItemsCustomEditorContext<TRow, TValue>) => ReactNode;
    });

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
      edit?: LineItemsEditor<TRow, TRow[K]>;
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
