import type { ReactNode } from "react";
import type {
  ColumnCellType,
  ColumnDisplay,
  ColumnDisplayValues,
  TypedColumnDisplay,
} from "@/components/internals/table-core/column-types";
import type { createLineItemsIdentity } from "./identity";

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
    };
}[keyof TRow & string];

type ComputedColumn<TRow extends Record<string, unknown>> = DisplayProps<TRow> & {
  id: string;
  accessorKey?: never;
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
