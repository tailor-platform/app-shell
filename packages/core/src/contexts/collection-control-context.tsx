import { createContext, useContext, type ReactNode } from "react";
import type { CollectionControl } from "@/types/collection";

const CollectionControlContext = createContext<CollectionControl | null>(null);

/**
 * Provider that shares collection control state via React Context.
 *
 * > **Note:** `DataTable.Root` automatically wraps its children with this provider
 * > when `control` is supplied to `useDataTable`. Use `CollectionControlProvider`
 * > directly only when you need to share control state with components that live
 * > **outside** of `DataTable.Root` (e.g. a sibling filter panel or pagination
 * > widget). Wrapping `DataTable.Root` with an outer `CollectionControlProvider`
 * > while also passing `control` to `useDataTable` results in a double-wrap: the
 * > inner provider (created by `DataTable.Root`) will silently shadow the outer
 * > one for all descendants inside the table.
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
