import { createContext, useContext } from "react";
import type { UseLineItemsReturn } from "./types";

export const LineItemsContext = createContext<unknown>(null);

export function useLineItemsContext<T extends Record<string, unknown>>(
  part: string,
): UseLineItemsReturn<T> {
  const value = useContext(LineItemsContext) as UseLineItemsReturn<T> | null;
  if (!value) throw new Error(`${part} must be rendered inside LineItems.Root`);
  return value;
}
