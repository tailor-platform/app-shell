import { serverId } from "./identity";
import type { LineItemsIdentity, LineItemsSnapshot } from "./types";

/**
 * Binds one document's identity registry and server-ID property to snapshot construction.
 * create validates and freezes a candidate without registering IDs; adopt additionally
 * registers the validated rows and returns the snapshot for the document to assign.
 * The factory owns no current state, baseline, subscriptions, or movement permissions.
 *
 * @internal
 */
export function createLineItemsSnapshots<T extends Record<string, unknown>>(
  identity: LineItemsIdentity<T>,
  idKey: keyof T & string,
) {
  /** Validate row ownership and unique private/public keys before producing a fresh row view. */
  function create(input: readonly T[]): LineItemsSnapshot<T> {
    const byKey = new Map<string, T>();
    const publicKeys = new Set<string>();
    const order: string[] = [];
    for (const row of input) {
      const key = identity.keyOf(row);
      const externalKey = serverId(row[idKey]) ?? key;
      if (byKey.has(key) || publicKeys.has(externalKey)) throw new Error("Line IDs must be unique");
      byKey.set(key, row);
      publicKeys.add(externalKey);
      order.push(key);
    }
    return Object.freeze({ lines: Object.freeze([...input]), order: Object.freeze(order), byKey });
  }

  return {
    create,
    /**
     * Construct and register a validated snapshot; the caller remains responsible for
     * replacing current state. Each call returns a fresh row view, including for revert.
     * Validation completes before any identity registration occurs.
     */
    adopt(input: readonly T[]): LineItemsSnapshot<T> {
      const next = create(input);
      identity.remember(next.lines);
      return next;
    },
  };
}
