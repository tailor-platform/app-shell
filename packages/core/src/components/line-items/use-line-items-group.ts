import * as React from "react";

import type { LineItemsChangeSet, UseLineItemsReturn } from "./types";

/* ======================================================================== */
/* Group helper for documents with multiple line collections under one header */
/* ======================================================================== */

/**
 * Map of `useLineItems` return values keyed by collection name. Each value is
 * the full hook return — we type-erase the row generic via `any` so consumers
 * can mix collections that have different row shapes (e.g. component lines vs
 * operation lines under one Work Order header).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: heterogeneous row types per member
export type LineItemsGroupInput = Record<string, UseLineItemsReturn<any>>;

/** Aggregate change-set keyed by the same names as the input map. */
export type LineItemsGroupChangeSet<G extends LineItemsGroupInput> = {
  isEmpty: boolean;
} & {
  [K in keyof G]: LineItemsChangeSet;
};

export type LineItemsGroupReturn<G extends LineItemsGroupInput> = {
  /** Pass-through reference to the input — convenient for forwarding into children. */
  members: G;
  /** True when ANY member is dirty. Mirrors the hook's `isDirty` semantics. */
  isDirty: boolean;
  /**
   * Aggregate change-set keyed by collection name. Each member's `getChangeSet()`
   * is called once and bundled. `isEmpty` is true iff every member is empty.
   * The page-level submit handler typically reads this and dispatches a single
   * mutation per document.
   */
  getChangeSet: () => LineItemsGroupChangeSet<G>;
  /** Snap baselines forward on every member. Call after a successful save. */
  reset: () => void;
  /** Restore every member to its baseline. Call on Discard. */
  revert: () => void;
};

/**
 * Compose multiple `useLineItems` hooks into a single document-level boundary.
 *
 * Use this when one header record owns more than one ordered list of lines —
 * e.g. a Journal Entry with `debits` + `credits` that must balance, or a Work
 * Order with `componentLines` + `operationLines`. Each collection still gets
 * its own table + selection + dirty tracking; this helper gives you a shared
 * `isDirty`, a keyed change-set, and one Discard / Save boundary.
 *
 * @example
 * ```tsx
 * const debits  = useLineItems<JournalLine>({ ... });
 * const credits = useLineItems<JournalLine>({ ... });
 * const group   = useLineItemsGroup({ debits, credits });
 *
 * const onSave = async () => {
 *   const cs = group.getChangeSet();
 *   if (cs.isEmpty) return;
 *   await api.updateJournalEntry({
 *     id,
 *     debits: cs.debits.lineChanges,
 *     credits: cs.credits.lineChanges,
 *   });
 *   group.reset();
 * };
 *
 * return (
 *   <>
 *     <LineItems.Root value={debits}>...</LineItems.Root>
 *     <LineItems.Root value={credits}>...</LineItems.Root>
 *     <FloatingActions
 *       isDirty={group.isDirty}
 *       onDiscard={group.revert}
 *       onSave={onSave}
 *     />
 *   </>
 * );
 * ```
 */
export function useLineItemsGroup<G extends LineItemsGroupInput>(
  group: G,
): LineItemsGroupReturn<G> {
  // Aggregate `isDirty` is just an OR — derive on every render. No memo needed
  // because it's an O(N) boolean fold and the React rules-of-hooks don't allow
  // dynamic dep arrays anyway.
  const isDirty = Object.values(group).some((m) => m.isDirty);

  const getChangeSet = React.useCallback((): LineItemsGroupChangeSet<G> => {
    const out = {} as LineItemsGroupChangeSet<G>;
    let allEmpty = true;
    for (const key of Object.keys(group) as (keyof G)[]) {
      const cs = group[key].getChangeSet();
      (out as Record<string, LineItemsChangeSet>)[key as string] = cs;
      if (!cs.isEmpty) allEmpty = false;
    }
    out.isEmpty = allEmpty;
    return out;
  }, [group]);

  const reset = React.useCallback(() => {
    for (const m of Object.values(group)) m.reset();
  }, [group]);

  const revert = React.useCallback(() => {
    for (const m of Object.values(group)) m.revert();
  }, [group]);

  return { members: group, isDirty, getChangeSet, reset, revert };
}
