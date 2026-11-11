import { persistedId } from "./identity";
import type { LineItemsIdentity, LineItemsSnapshot } from "./types";

/**
 * Binds one document's identity registry and persisted-ID property to snapshot construction.
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
  /** Validate row ownership and unique client/line keys before producing a fresh row view. */
  function create(input: readonly T[]): LineItemsSnapshot<T> {
    const byClientKey = new Map<string, T>();
    const lineKeys = new Set<string>();
    const clientKeys: string[] = [];
    for (const row of input) {
      const clientKey = identity.clientKeyOf(row);
      const lineKey = persistedId(row[idKey]) ?? clientKey;
      if (byClientKey.has(clientKey) || lineKeys.has(lineKey))
        throw new Error("Line IDs must be unique");
      byClientKey.set(clientKey, row);
      lineKeys.add(lineKey);
      clientKeys.push(clientKey);
    }
    return Object.freeze({
      lines: Object.freeze([...input]),
      clientKeys: Object.freeze(clientKeys),
      byClientKey,
    });
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
