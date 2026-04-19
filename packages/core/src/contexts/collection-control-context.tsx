import { createContext, useContext, type ReactNode } from "react";
import type { CollectionControl } from "@/types/collection";

const CollectionControlContext = createContext<CollectionControl | null>(null);

/**
 * Provider that shares collection control state via React Context.
 *
 * @example
 * ```tsx
 * const { variables, control } = useCollectionVariables({ params: { pageSize: 20 } });
 *
 * <CollectionControlProvider value={control}>
 *   <FilterPanel />
 *   <DataTable.Root>...</DataTable.Root>
 *   <Pagination />
 * </CollectionControlProvider>
 * ```
 */
export function CollectionControlProvider({
  value,
  children,
}: {
  value: CollectionControl;
  children: ReactNode;
}) {
  return (
    <CollectionControlContext.Provider value={value}>{children}</CollectionControlContext.Provider>
  );
}

/**
 * Hook to access collection control from the nearest `CollectionControlProvider`.
 *
 * @typeParam TFieldName - Union of allowed field name strings (default: `string`).
 *
 * @throws Error if used outside of `CollectionControlProvider`.
 */
export function useCollectionControl<
  TFieldName extends string = string,
>(): CollectionControl<TFieldName> {
  const ctx = useContext(CollectionControlContext);
  if (!ctx) {
    throw new Error("useCollectionControl must be used within <CollectionControlProvider>");
  }
  return ctx as unknown as CollectionControl<TFieldName>;
}

/**
 * Internal variant that returns `null` instead of throwing when no provider exists.
 */
export function useCollectionControlOptional<
  TFieldName extends string = string,
>(): CollectionControl<TFieldName> | null {
  return useContext(CollectionControlContext) as CollectionControl<TFieldName> | null;
}
