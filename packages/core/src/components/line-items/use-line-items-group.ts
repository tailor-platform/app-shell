import type { LineItemsChangeSet, UseLineItemsReturn } from "./types";

/**
 * `useLineItems` returns keyed by collection name. The row type is erased so
 * one document can mix collections with different row shapes (component lines
 * and operation lines under one Work Order).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous row types per member
export type LineItemsGroupMembers = Record<string, UseLineItemsReturn<any>>;

/** The group's change-set: one entry per member, plus a rolled-up `isEmpty`. */
export type LineItemsGroupChangeSet<G extends LineItemsGroupMembers> = {
  /** True when every member's change-set is empty. */
  isEmpty: boolean;
  /** Each member's change-set, keyed by the names passed to `useLineItemsGroup`. */
  changeSets: { [K in keyof G]: LineItemsChangeSet };
};

export type UseLineItemsGroupReturn<G extends LineItemsGroupMembers> = {
  /** The members passed in, for forwarding into each `LineItems.Root`. */
  members: G;
  /** True when any member has uncommitted changes. */
  isDirty: boolean;
  /** `isDirty`, read live — see `UseLineItemsReturn.hasUnsavedChanges`. */
  hasUnsavedChanges: () => boolean;
  /** Collects every member's change-set for one document-level submit. */
  getChangeSet: () => LineItemsGroupChangeSet<G>;
  /**
   * Snaps every member's baseline forward. Call after a successful save, with
   * each member's saved lines or `{ idMap }` keyed by member name, so new
   * lines pick up their server ids — see `LineItemsResetInput`.
   */
  reset: (
    saved?: { [K in keyof G]?: Parameters<G[K]["reset"]>[0] },
    /** `sent`: the group change-set that was saved — see `LineItemsResetOptions`. */
    options?: { sent?: LineItemsGroupChangeSet<G> },
  ) => void;
  /** Discards every member's changes back to its baseline. */
  revert: () => void;
};

/**
 * Puts several `useLineItems` collections under one save boundary — for a
 * document that owns more than one list of lines, like a Journal Entry with
 * debits and credits, or a Work Order with components and operations. Each
 * collection keeps its own table, selection and dirty tracking; the group adds
 * a shared `isDirty`, a keyed change-set, and one Save / Discard.
 *
 * @example
 * ```tsx
 * const debits = useLineItems<JournalLine>({ fields, defaultLines: entry.debits });
 * const credits = useLineItems<JournalLine>({ fields, defaultLines: entry.credits });
 * const group = useLineItemsGroup({ debits, credits });
 *
 * const onSave = async () => {
 *   const { isEmpty, changeSets } = group.getChangeSet();
 *   if (isEmpty) return;
 *   const saved = await saveJournalEntry(entry.id, changeSets.debits, changeSets.credits);
 *   group.reset({ debits: saved.debits, credits: saved.credits });
 * };
 * ```
 */
export function useLineItemsGroup<G extends LineItemsGroupMembers>(
  members: G,
): UseLineItemsGroupReturn<G> {
  const all = Object.values(members);

  const getChangeSet = (): LineItemsGroupChangeSet<G> => {
    const changeSets = {} as { [K in keyof G]: LineItemsChangeSet };
    for (const key of Object.keys(members) as (keyof G)[]) {
      changeSets[key] = members[key].getChangeSet();
    }
    return {
      isEmpty: Object.values(changeSets).every((cs) => cs.isEmpty),
      changeSets,
    };
  };

  return {
    members,
    isDirty: all.some((m) => m.isDirty),
    hasUnsavedChanges: () => all.some((m) => m.hasUnsavedChanges()),
    getChangeSet,
    reset: (saved, options) => {
      for (const key of Object.keys(members) as (keyof G)[]) {
        const sent = options?.sent?.changeSets[key];
        members[key].reset(saved?.[key], sent ? { sent } : undefined);
      }
    },
    revert: () => all.forEach((m) => m.revert()),
  };
}
