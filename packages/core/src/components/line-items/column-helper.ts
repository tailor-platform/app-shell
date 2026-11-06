import type { LineItemsColumn } from "./types";

type UnionKeys<T> = T extends unknown ? keyof T : never;
type NoExtra<T, Allowed> = Record<Exclude<keyof T, UnionKeys<Allowed>>, never>;

type ColumnChecks<TRow extends Record<string, unknown>, C> = NoExtra<C, LineItemsColumn<TRow>> &
  (C extends { edit: infer E extends { editorType: string } }
    ? {
        edit: NoExtra<
          E,
          Extract<NonNullable<LineItemsColumn<TRow>["edit"]>, { editorType: E["editorType"] }>
        >;
      }
    : unknown) &
  (C extends { type: infer K; typeOptions: infer O }
    ? {
        typeOptions: NoExtra<
          O,
          NonNullable<Extract<LineItemsColumn<TRow>, { type: K }>["typeOptions"]>
        >;
      }
    : unknown);

/** Bind the row once, retaining the original definition rather than widening to the whole family. */
export function createLineItemHelper<TRow extends Record<string, unknown>>() {
  return {
    column: <const C extends LineItemsColumn<TRow>>(definition: C & ColumnChecks<TRow, C>): C => ({
      ...definition,
    }),
  };
}
