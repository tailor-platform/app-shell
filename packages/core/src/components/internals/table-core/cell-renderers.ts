import type { ReactNode } from "react";
import type { ColumnCellType, TypedColumnDisplay, ValueDisplayDescriptor } from "./column-types";
import { displayCellAdapters } from "./display-cell-adapters";

export type ValueRenderer<TRow extends Record<string, unknown>> = (
  value: unknown,
  row: TRow,
) => ReactNode;

export interface ValueRendererContext {
  /** Display environment resolved by the owning table, not by the shared dispatcher. */
  timeZone: string;
  /** Optional, already-resolved display label policy for individual badge values. */
  resolveBadgeLabel?: (value: string) => string;
}

export interface DisplayCellAdapter<K extends ColumnCellType> {
  defaultAlign: "left" | "right";
  createRenderer<TRow extends Record<string, unknown>>(
    display: TypedColumnDisplay<TRow, K>,
    context: ValueRendererContext,
  ): ValueRenderer<TRow>;
}

/** Read presentation metadata without constructing a renderer; unknown runtime kinds retain the text fallback. */
export function getDisplayCellAdapter(type: ColumnCellType | undefined) {
  return typeof type === "string" && Object.hasOwn(displayCellAdapters, type)
    ? displayCellAdapters[type]
    : displayCellAdapters.text;
}

/** Keep keyed selection correlated with its descriptor and row-dependent options. */
function createTypedValueRenderer<TRow extends Record<string, unknown>, K extends ColumnCellType>(
  type: K,
  descriptor: TypedColumnDisplay<TRow, K>,
  context: ValueRendererContext,
): ValueRenderer<TRow> {
  const adapters: { [P in ColumnCellType]: DisplayCellAdapter<P> } = displayCellAdapters;
  return adapters[type].createRenderer<TRow>(descriptor, context);
}

/** Prepare a built-in renderer without interpreting its settings or environment dependencies. */
export function createValueRenderer<TRow extends Record<string, unknown>>(
  descriptor: ValueDisplayDescriptor<TRow>,
  context: ValueRendererContext,
): ValueRenderer<TRow> {
  if (typeof descriptor.type !== "string" || !Object.hasOwn(displayCellAdapters, descriptor.type)) {
    return displayCellAdapters.text.createRenderer<TRow>({ type: "text" }, context);
  }
  return createTypedValueRenderer<TRow, ColumnCellType>(descriptor.type, descriptor, context);
}
