import type { ComponentProps, ReactNode } from "react";
import type { CellEditorOutput } from "@/components/internals/table-core/editing/props";
import type { lineItemsEditors } from "../editor-factory";
import type {
  ColumnCellType,
  ColumnDisplay,
  ColumnDisplayValues,
  TypedColumnDisplay,
} from "@/components/internals/table-core/column-types";
import type { createLineItemsIdentity } from "./identity";

type EditorBase<TRow extends Record<string, unknown>, TValue> = {
  /** Checks the resolved value before adoption, including Clear results; throw/rejection retains the draft. Not persistence. */
  onValueCommitted?: (row: Readonly<TRow>, value: TValue) => void | Promise<void>;
  /** UI policy only; direct row commands remain available. */
  canEdit?: (row: TRow) => boolean;
  /** Replaces error content only; checks always finish before adoption and failures retain the draft. */
  error?: { render: (ctx: { row: TRow; error: unknown }) => ReactNode };
};

/** A resolver cannot introduce asynchronous work into Clear value selection. */
type SynchronousValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | (object & { then?: never });
/** Null is the default only when accepted; otherwise the property needs an explicit Clear policy. */
type ClearOptions<TValue> = null extends TValue
  ? { clearValue?: false | (() => TValue & SynchronousValue) }
  : { clearValue: false | (() => TValue & SynchronousValue) };

type EditorCatalog = typeof lineItemsEditors;
type EditorAdapter<K extends keyof EditorCatalog> = ReturnType<EditorCatalog[K]["bind"]>;
type EditorOutput<K extends keyof EditorCatalog> = CellEditorOutput<EditorAdapter<K>["editor"]>;
type EditorSettings<K extends keyof EditorCatalog> = Parameters<EditorAdapter<K>["prepare"]>[0];
type ChoiceOptions = EditorSettings<"combobox">["editorOptions"];
type ChoiceOption = ChoiceOptions["options"][number];
type ChoiceValue = Exclude<EditorOutput<"combobox">, null>;
type PropertyChoiceValue<TValue> = ChoiceValue extends TValue
  ? ChoiceValue
  : Extract<TValue, ChoiceValue>;
type PropertyChoiceOption<TValue> = {
  [K in keyof ChoiceOption]: K extends "value" ? PropertyChoiceValue<TValue> : ChoiceOption[K];
};
type PropertyChoiceOptions<TValue> = {
  [K in keyof ChoiceOptions]: K extends "options"
    ? readonly PropertyChoiceOption<TValue>[]
    : ChoiceOptions[K];
};
type PropertyEditorOutput<K extends keyof EditorCatalog, TValue> = K extends "combobox"
  ? PropertyChoiceValue<TValue> | Extract<EditorOutput<K>, null>
  : EditorOutput<K>;
type PropertyEditorSettings<K extends keyof EditorCatalog, TValue> = K extends "combobox"
  ? { editorOptions: PropertyChoiceOptions<TValue> }
  : EditorSettings<K>;

/** Derive editor contracts from the adapters; fixed choices additionally follow the property. */
export type LineItemsEditor<TRow extends Record<string, unknown>, TValue> = {
  [K in keyof EditorCatalog]: [Exclude<PropertyEditorOutput<K, TValue>, null>] extends [never]
    ? never
    : [Exclude<PropertyEditorOutput<K, TValue>, null>] extends [TValue]
      ? EditorBase<TRow, TValue> &
          ClearOptions<TValue> & {
            editorType: K;
          } & PropertyEditorSettings<K, TValue>
      : never;
}[keyof EditorCatalog];

type DisplayProps<TRow extends Record<string, unknown>> = {
  label?: string;
  /** Overrides the built-in renderer, including when it returns null. */
  render?: (row: TRow) => ReactNode;
  align?: "left" | "center" | "right";
  /** Preferred column width in pixels; omitted widths are automatic and content may require more space. */
  width?: number;
  /** Header styling; return undefined to retain defaults. Column width takes precedence over style.width. */
  headerProps?: () => Pick<ComponentProps<"th">, "className" | "style" | "title"> | undefined;
  /** Row-specific styling for readonly and editable cells; content and editing behavior remain owned by the table. */
  cellProps?: (
    row: TRow,
  ) => Pick<ComponentProps<"td">, "className" | "style" | "title"> | undefined;
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

/** A property, computed value, or explicitly value-less display column. */
export type LineItemsColumn<TRow extends Record<string, unknown>> =
  | PropertyColumn<TRow>
  | ComputedColumn<TRow>
  | SourceLessColumn<TRow>;

type UnsafeIdentityKey<T> = T extends unknown
  ? string extends keyof T
    ? string // Index signatures cannot prove that a named identity property is optional.
    : {
        [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
      }[keyof T] &
        string
  : never;

type OptionalStringKey<T> = Exclude<keyof T & string, UnsafeIdentityKey<T>>;

/** Persisted identity property, defaulting to id; it must be optional in every row variant. */
export type LineItemsIdentityOptions<T extends Record<string, unknown>> =
  Extract<T, { id: unknown }> extends never
    ? { idKey?: OptionalStringKey<T> }
    : { idKey: OptionalStringKey<T> };

export type DocumentOptions<T extends Record<string, unknown>> = {
  /** Initial definitions whose accessorKey fields establish document property ownership. */
  columns: readonly LineItemsColumn<T>[];
  /** Initial rows, read once; only rows with persisted IDs establish the baseline. */
  lines?: readonly T[];
} & LineItemsIdentityOptions<T>;

export type LineItemsIdentity<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsIdentity<T>
>;

/** A validated row view, ordered client keys, and client-key index constructed together. */
export type LineItemsSnapshot<T> = {
  readonly lines: readonly T[];
  readonly clientKeys: readonly string[];
  readonly byClientKey: ReadonlyMap<string, T>;
};
