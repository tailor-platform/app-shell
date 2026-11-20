import { assertLineItemsEditor } from "../editor-factory";
import { clientKeyOf, createLineItemsIdentity, persistedId } from "./identity";
import { createLineItemsSnapshots } from "./snapshot";
import type { DocumentOptions, LineItemsChangeset, LineItemsColumn } from "./types";

type FieldEquality = (baseline: unknown, current: unknown) => boolean;

/** Resolve document property ownership and equality independently of display column identities. */
function compileLineItemsColumns<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
): ReadonlyMap<keyof T & string, FieldEquality | undefined> {
  const ids = new Set<string>();
  const properties = new Map<keyof T & string, FieldEquality | undefined>();
  for (const column of columns) {
    const id = column.id ?? column.accessorKey;
    if (typeof id !== "string" || id === "" || ids.has(id))
      throw new Error("LineItems column IDs must be non-empty and unique");
    if (column.edit !== undefined) {
      if (column.accessorKey === undefined)
        throw new Error("Cell editors require an accessorKey property");
      assertLineItemsEditor(column.edit);
      if (
        column.type === "badge" &&
        column.edit.editorType === "combobox" &&
        column.typeOptions?.badgeLabelMap !== undefined
      )
        throw new Error("Combobox badge labels must be defined in editorOptions.options only");
    }
    ids.add(id);
    if (column.equals !== undefined && typeof column.equals !== "function")
      throw new Error("LineItems equals must be a function");
    if (column.accessorKey === undefined) {
      if (column.equals !== undefined) throw new Error("LineItems equals requires an accessorKey");
      continue;
    }
    const previous = properties.get(column.accessorKey);
    if (previous && column.equals && previous !== column.equals)
      throw new Error(`Conflicting equality functions for property "${column.accessorKey}"`);
    // Property/value correlation is established by LineItemsColumn before this heterogeneous map.
    properties.set(column.accessorKey, (column.equals as FieldEquality | undefined) ?? previous);
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
 * and are discarded by revert. Confirmed full-collection replacement advances the
 * baseline; draft editing, business validation, normalization, and persistence belong elsewhere.
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
  let baseline = snapshots.create(
    current.lines.filter((row) => persistedId(row[idKey]) !== undefined),
  );

  function assertColumns(nextColumns: readonly LineItemsColumn<T>[]) {
    const next = compileLineItemsColumns(nextColumns);
    if (next.size !== properties.size || [...next.keys()].some((key) => !properties.has(key)))
      throw new Error("Remount LineItems to change document property ownership");
    return next;
  }

  function getChanges(nextColumns: readonly LineItemsColumn<T>[] = columns): LineItemsChangeset<T> {
    const equalities = assertColumns(nextColumns);
    const added: T[] = [];
    const updated: LineItemsChangeset<T>["updated"][number][] = [];
    for (const [clientKey, row] of current.byClientKey) {
      const base = baseline.byClientKey.get(clientKey);
      if (!base) {
        added.push(row);
        continue;
      }
      const fields: [string, unknown][] = [];
      for (const [property, equals] of equalities) {
        if (property === idKey) continue;
        const equal = (equals ?? Object.is)(base[property], row[property]);
        if (typeof equal !== "boolean") throw new Error("LineItems equals must return a boolean");
        if (!equal) fields.push([property, row[property]]);
      }
      if (fields.length > 0)
        updated.push({
          lineKey: identity.getLineKey(row),
          changes: Object.fromEntries(fields) as Partial<T>,
        });
    }
    const removed = baseline.lines.filter(
      (row) => !current.byClientKey.has(identity.clientKeyOf(row)),
    );
    const orderChanged =
      current.clientKeys.length !== baseline.clientKeys.length ||
      current.clientKeys.some((key, index) => key !== baseline.clientKeys[index]);
    return {
      added,
      updated,
      removed,
      order: orderChanged ? current.lines.map(identity.getLineKey) : null,
    };
  }

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
     * Validates display definitions against the original property ownership without
     * storing configuration or mutating rows.
     * Reordering/renaming columns and adding duplicate displays of an owned property are
     * allowed; changing the accessorKey property set requires a new document instance.
     * @throws If column definitions are invalid or document property ownership changes.
     */
    assertColumns,
    /** Pure inspection with optional render-local comparison configuration; never adopts it. */
    getChanges,
    /** Uses exactly the same net comparison as changeset inspection; cell drafts are excluded. */
    isDirty(nextColumns: readonly LineItemsColumn<T>[] = columns) {
      const changes = getChanges(nextColumns);
      return (
        changes.added.length > 0 ||
        changes.updated.length > 0 ||
        changes.removed.length > 0 ||
        changes.order !== null
      );
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
     * Adopts confirmed rows as current state and the new saved baseline.
     * Every row requires a persisted ID; validation completes before registering identities.
     * Inputs remain untouched, and replacement rows receive fresh client identities.
     */
    replaceLines(confirmedLines: readonly T[]) {
      const ids = new Set<string>();
      for (const row of confirmedLines) {
        const id = persistedId(row[idKey]);
        if (id === undefined) throw new Error("Confirmed lines require persisted IDs");
        if (ids.has(id)) throw new Error("Line IDs must be unique");
        ids.add(id);
        let taggedKey: string | undefined;
        try {
          taggedKey = clientKeyOf(row);
        } catch {
          // Confirmed transport rows are normally untagged.
        }
        if (taggedKey !== undefined) identity.clientKeyOf(row);
      }
      const confirmed = snapshots.adopt(
        confirmedLines.map((row) => identity.tag(row, identity.newClientKey())),
      );
      current = baseline = confirmed;
    },
    /**
     * Restores the saved baseline rows, values, and order without advancing the baseline.
     * Discards every unsaved creation, including ID-less rows supplied at initialization.
     * Restored rows retain their saved frozen objects and identities. Always adopts a new
     * row array, even when already clean; this is restoration, not manual movement.
     */
    revert() {
      current = snapshots.adopt(baseline.lines);
    },
  };
}
