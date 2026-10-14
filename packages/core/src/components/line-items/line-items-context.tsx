import * as React from "react";

import type { LineItemsRowData, UseLineItemsReturn } from "./types";

/** Cell contents for the totals row, keyed by column id. */
export type LineItemsTotalsRenderer = (
  lines: LineItemsRowData[],
) => Record<string, React.ReactNode>;

export type LineItemsContextValue<T extends LineItemsRowData = LineItemsRowData> = {
  lineItems: UseLineItemsReturn<T>;
  fullscreen: boolean;
  setFullscreen: (next: boolean) => void;
  /**
   * Registered by `<LineItems.TotalsRow>` so the table can render it inside its
   * own `<tfoot>`, where the cells stay aligned with the columns above.
   */
  totalsRenderer: LineItemsTotalsRenderer | undefined;
  setTotalsRenderer: (renderer: LineItemsTotalsRenderer | undefined) => void;
};

const LineItemsContext = React.createContext<LineItemsContextValue | null>(null);

export const LineItemsContextProvider = LineItemsContext.Provider;

/**
 * Reads the enclosing `<LineItems.Root>` value.
 *
 * Grid interaction state (active cell, selected range, drag) deliberately does
 * not live here — it stays local to `<LineItems.Table>` and reaches cells as
 * props, so a pointer drag across the grid cannot re-render every sibling part.
 */
export function useLineItemsContext<T extends LineItemsRowData = LineItemsRowData>(
  part: string,
): LineItemsContextValue<T> {
  const ctx = React.useContext(LineItemsContext);
  if (!ctx) {
    throw new Error(`<LineItems.${part}> must be used within <LineItems.Root>`);
  }
  return ctx as LineItemsContextValue<T>;
}
