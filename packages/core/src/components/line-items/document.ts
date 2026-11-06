import { compileLineItemsColumns } from "./columns";
import { createLineItemsIdentity, serverId } from "./identity";
import { createLineItemsSnapshots } from "./snapshot";
import type { LineItemsColumn } from "./types";

export type DocumentOptions<T extends Record<string, unknown>> = {
  /** Initial definitions whose accessorKey fields establish document property ownership. */
  columns: readonly LineItemsColumn<T>[];
  /** Initial rows, read once; only rows with server IDs establish the persisted baseline. */
  lines?: readonly T[];
  /** Server identity property, fixed for the document's lifetime. Defaults to id. */
  idKey?: keyof T & string;
};

/**
 * Creates the domain model for one document's rows, identities, baseline, and adopted order.
 * It has no subscriptions or framework integration; createLineItemsDocumentStore wraps
 * its commands when callers need observable snapshots.
 *
 * Initial rows and subsequent row copies are shallow-frozen. Nested values are not
 * cloned and must also be treated as immutable. Only initial rows with server IDs form
 * the persisted baseline; ID-less initial rows are unsaved creations, start dirty,
 * and are discarded by revert. This model does not advance the baseline or implement
 * draft editing, business validation, normalization, or persistence.
 *
 * Inspection and configuration checks do not mutate state. Commands validate keys and
 * ownership before adopting a new row view. Returned functions are stable and do not
 * depend on this. Movement permissions belong to the caller, not the ordering primitive.
 *
 * @internal
 */
export function createLineItemsDocument<T extends Record<string, unknown>>({
  columns,
  lines = [],
  idKey = "id" as keyof T & string,
}: DocumentOptions<T>) {
  const properties = compileLineItemsColumns(columns);
  const identity = createLineItemsIdentity<T>(idKey);
  const snapshots = createLineItemsSnapshots(identity, idKey);
  let current = snapshots.adopt(lines.map((row) => identity.tag(row, identity.newKey())));
  // ID-less initial rows are unsaved creations, not part of the persisted baseline.
  const baseline = snapshots.create(
    current.lines.filter((row) => serverId(row[idKey]) !== undefined),
  );

  return {
    /** Identity property captured at creation; a different idKey requires a new model. */
    idKey,
    /**
     * Returns the current shallow-frozen row view in adopted document order.
     * Repeated reads are referentially equal until a command adopts a new array.
     */
    getRows: () => current.lines,
    /**
     * Resolves a row's stable identity to a string server ID or a client-only key.
     * Accepts owned rows, previously returned rows, and spreads retaining private identity;
     * rejects untagged or foreign rows. This is not a current-membership check: a removed
     * row still resolves, but its key cannot be used by commands until it is restored.
     */
    getLineKey: identity.getLineKey,
    /**
     * Validates replacement display definitions against the original property ownership.
     * Despite its name, this only checks configuration: it does not store the new definitions
     * or mutate rows. This check is safe without committing any configuration changes.
     * Reordering/renaming columns and adding duplicate displays of an owned property are
     * allowed; changing the accessorKey property set requires a new document instance.
     * @throws If column definitions are invalid or document property ownership changes.
     */
    setColumns(nextColumns: readonly LineItemsColumn<T>[]) {
      const next = compileLineItemsColumns(nextColumns);
      if (next.size !== properties.size || [...next].some((key) => !properties.has(key)))
        throw new Error("Remount LineItems to change document property ownership");
    },
    /**
     * Inspects differences from the persisted initial baseline without modifying the model.
     * Membership or adopted order changes are dirty, including ID-less initial creations.
     * Owned field values use Object.is, not deep equality or formatted display precision;
     * replacing a row object alone does not make it dirty. Drafts are not tracked here.
     */
    isDirty() {
      if (
        current.order.length !== baseline.order.length ||
        current.order.some((key, index) => key !== baseline.order[index])
      )
        return true;
      for (const key of current.order) {
        const row = current.byKey.get(key)!;
        const base = baseline.byKey.get(key)!;
        for (const property of properties) {
          if (property !== idKey && !Object.is(row[property], base[property])) return true;
        }
      }
      return false;
    },
    /**
     * Replaces one current row with a copy containing an updated accessorKey-owned property,
     * preserving its private identity and reusing all other rows. Values are adopted as-is,
     * without normalization or business validation. A valid Object.is-equal write is a no-op.
     * @throws If the key is not current, the property is unowned, or the server ID changes.
     */
    updateField<K extends keyof T & string>(lineKey: string, property: K, value: T[K]) {
      const key = identity.resolveKey(lineKey, current.order);
      const row = current.byKey.get(key)!;
      if (property === idKey && !Object.is(row[property], value))
        throw new Error("Line IDs may only change through save acknowledgment");
      if (property !== idKey && !properties.has(property))
        throw new Error(`Property "${property}" has no document owner`);
      if (Object.is(row[property], value)) return;
      const updated = identity.tag({ ...row, [property]: value }, key);
      current = snapshots.adopt(
        current.lines.map((line) => (identity.keyOf(line) === key ? updated : line)),
      );
    },
    /**
     * Appends an unsaved creation from a shallow copy of input.
     * Drops the configured server ID and assigns fresh identity even when copying an owned
     * row. The input is not mutated, nested values are reused, and the baseline is unchanged.
     * Returns the client-only key accepted by the row commands; the creation makes the
     * document dirty until it is removed or discarded by revert.
     */
    addLine(input: T): string {
      const raw = { ...input };
      delete raw[idKey];
      const added = identity.tag(raw, identity.newKey());
      current = snapshots.adopt([...current.lines, added]);
      return identity.getLineKey(added);
    },
    /**
     * Removes one current row without changing the baseline.
     * Removing an unsaved creation can cancel its dirty contribution; removing a persisted
     * row stays dirty until restored by revert. Remaining rows retain their objects and keys.
     * @throws If the key does not identify a current row.
     */
    removeLine(lineKey: string) {
      const key = identity.resolveKey(lineKey, current.order);
      current = snapshots.adopt(current.lines.filter((row) => identity.keyOf(row) !== key));
    },
    /**
     * Moves a current row immediately after another current row; null moves it to the front.
     * Adopts a new view only when order changes, preserving row objects, identities, and
     * membership. A self-anchor or unchanged position is a no-op. Movement permission is
     * checked by the caller; this primitive does not enforce orderer.
     * @throws If the moved row or a non-null anchor is not in the current document.
     */
    reorderLine(lineKey: string, afterLineKey: string | null) {
      const key = identity.resolveKey(lineKey, current.order);
      const after = afterLineKey === null ? null : identity.resolveKey(afterLineKey, current.order);
      if (key === after) return;
      const order = current.order.filter((candidate) => candidate !== key);
      order.splice(after === null ? 0 : order.indexOf(after) + 1, 0, key);
      if (order.some((candidate, index) => candidate !== current.order[index]))
        current = snapshots.adopt(order.map((candidate) => current.byKey.get(candidate)!));
    },
    /**
     * Restores the persisted initial rows, values, and order without advancing the baseline.
     * Discards every unsaved creation, including ID-less rows supplied at initialization.
     * Restored rows retain their initial frozen objects and identities. Always adopts a new
     * row array, even when already clean; this is restoration, not manual movement.
     */
    revert() {
      current = snapshots.adopt(baseline.lines);
    },
  };
}
