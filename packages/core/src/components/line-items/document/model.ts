import { createLineItemsIdentity, persistedId } from "./identity";
import { createLineItemsSnapshots } from "./snapshot";
import type { DocumentOptions, LineItemsColumn } from "./types";

/** Resolve document property ownership independently of display column identities. */
function compileLineItemsColumns<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
): ReadonlySet<keyof T & string> {
  const ids = new Set<string>();
  const properties = new Set<keyof T & string>();
  for (const column of columns) {
    const id = column.id ?? column.accessorKey;
    if (typeof id !== "string" || id === "" || ids.has(id))
      throw new Error("LineItems column IDs must be non-empty and unique");
    if (column.edit !== undefined) {
      if (column.accessorKey === undefined)
        throw new Error("Cell editors require an accessorKey property");
      if (!["text", "number", "date", "combobox"].includes(column.edit.editorType))
        throw new Error("Unsupported LineItems editor type");
      if (
        column.edit.editorType === "combobox" &&
        (!Array.isArray(column.edit.options) ||
          column.edit.options.some(
            (option) => typeof option.value !== "string" || typeof option.label !== "string",
          ))
      )
        throw new Error("Combobox editors require fixed string options");
    }
    ids.add(id);
    if (column.accessorKey !== undefined) properties.add(column.accessorKey);
  }
  return properties;
}

/**
 * Creates the domain model for one document's rows, identities, baseline, and adopted order.
 * It has no subscriptions or framework integration; createLineItemsDocumentStore wraps
 * its commands when callers need observable snapshots.
 *
 * Initial rows and subsequent row copies are shallow-frozen. Nested values are not
 * cloned and must also be treated as immutable. Only initial rows with persisted IDs form
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
export function createLineItemsDocument<T extends Record<string, unknown>>(
  options: DocumentOptions<T>,
) {
  const { columns, lines = [] } = options;
  const idKey = (options.idKey ?? "id") as keyof T & string;
  const properties = compileLineItemsColumns(columns);
  const identity = createLineItemsIdentity<T>(idKey);
  const snapshots = createLineItemsSnapshots(identity, idKey);
  let current = snapshots.adopt(lines.map((row) => identity.tag(row, identity.newClientKey())));
  // ID-less initial rows are unsaved creations, not part of the persisted baseline.
  const baseline = snapshots.create(
    current.lines.filter((row) => persistedId(row[idKey]) !== undefined),
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
     * Resolves a row's line key: its persisted ID, or its client key for an unsaved creation.
     * Accepts owned rows, previously returned rows, and spreads retaining the client tag;
     * rejects untagged or foreign rows. This is not a current-membership check: a removed
     * row still resolves, but its line key cannot be used by commands until it is restored.
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
        current.clientKeys.length !== baseline.clientKeys.length ||
        current.clientKeys.some((clientKey, index) => clientKey !== baseline.clientKeys[index])
      )
        return true;
      for (const clientKey of current.clientKeys) {
        const row = current.byClientKey.get(clientKey)!;
        const base = baseline.byClientKey.get(clientKey)!;
        for (const property of properties) {
          if (property !== idKey && !Object.is(row[property], base[property])) return true;
        }
      }
      return false;
    },
    /**
     * Replaces one current row with a copy containing an updated accessorKey-owned property,
     * preserving its client key and reusing all other rows. Values are adopted as-is,
     * without normalization or business validation. A valid Object.is-equal write is a no-op.
     * @throws If the line key is not current, the property is unowned, or the persisted ID changes.
     */
    updateField<K extends keyof T & string>(lineKey: string, property: K, value: T[K]) {
      const clientKey = identity.resolveClientKey(lineKey, current.clientKeys);
      const row = current.byClientKey.get(clientKey)!;
      if (property === idKey && !Object.is(row[property], value))
        throw new Error("Line IDs may only change through save acknowledgment");
      if (property !== idKey && !properties.has(property))
        throw new Error(`Property "${property}" has no document owner`);
      if (Object.is(row[property], value)) return;
      const updated = identity.tag({ ...row, [property]: value }, clientKey);
      current = snapshots.adopt(
        current.lines.map((line) => (identity.clientKeyOf(line) === clientKey ? updated : line)),
      );
    },
    /**
     * Appends an unsaved creation from a shallow copy of input.
     * Drops the configured persisted ID and assigns a fresh client key even for an owned
     * row. The input is not mutated, nested values are reused, and the baseline is unchanged.
     * Returns the line key accepted by the row commands; the creation makes the
     * document dirty until it is removed or discarded by revert.
     */
    addLine(input: T): string {
      const raw = { ...input };
      delete raw[idKey];
      const added = identity.tag(raw, identity.newClientKey());
      current = snapshots.adopt([...current.lines, added]);
      return identity.getLineKey(added);
    },
    /**
     * Removes one current row without changing the baseline.
     * Removing an unsaved creation can cancel its dirty contribution; removing a persisted
     * row stays dirty until restored by revert. Remaining rows retain their objects and keys.
     * @throws If the line key does not identify a current row.
     */
    removeLine(lineKey: string) {
      const clientKey = identity.resolveClientKey(lineKey, current.clientKeys);
      current = snapshots.adopt(
        current.lines.filter((row) => identity.clientKeyOf(row) !== clientKey),
      );
    },
    /**
     * Moves a current row immediately after another current row; null moves it to the front.
     * Adopts a new view only when order changes, preserving row objects, identities, and
     * membership. A self-anchor or unchanged position is a no-op. Movement permission is
     * checked by the caller; this primitive does not enforce orderer.
     * @throws If the moved row or a non-null anchor is not in the current document.
     */
    reorderLine(lineKey: string, afterLineKey: string | null) {
      const clientKey = identity.resolveClientKey(lineKey, current.clientKeys);
      const afterClientKey =
        afterLineKey === null ? null : identity.resolveClientKey(afterLineKey, current.clientKeys);
      if (clientKey === afterClientKey) return;
      const clientKeys = current.clientKeys.filter((candidate) => candidate !== clientKey);
      clientKeys.splice(
        afterClientKey === null ? 0 : clientKeys.indexOf(afterClientKey) + 1,
        0,
        clientKey,
      );
      if (clientKeys.some((candidate, index) => candidate !== current.clientKeys[index]))
        current = snapshots.adopt(
          clientKeys.map((candidate) => current.byClientKey.get(candidate)!),
        );
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
