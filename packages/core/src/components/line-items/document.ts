import { compileLineItemsColumns } from "./columns";
import type { LineItemsColumn } from "./types";

const IDENTITY = Symbol("LineItems.identity");
type Identity = { owner: object; key: string };
type Tagged = { [IDENTITY]?: Identity };
type Snapshot<T> = { order: readonly string[]; rows: ReadonlyMap<string, T> };

type DocumentOptions<T extends Record<string, unknown>> = {
  /** Initial definitions whose accessorKey fields establish document property ownership. */
  columns: readonly LineItemsColumn<T>[];
  /** Initial rows, read once; only rows with server IDs establish the persisted baseline. */
  lines?: readonly T[];
  /** Server identity property, fixed for the store's lifetime. Defaults to id. */
  idKey?: keyof T & string;
};

function serverId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    value === "" ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw new Error("Line IDs must be non-empty strings or finite numbers");
  return String(value);
}

/**
 * Creates a React-independent external store for one document's rows and adopted order.
 *
 * React adapters must retain one instance per mounted document, typically with a lazy
 * useState initializer. getRows supplies the cached snapshot for useSyncExternalStore:
 * it returns the same array until adoption replaces it, then subscribe listeners are
 * notified synchronously after the new snapshot is available. Returned functions are
 * stable and do not depend on this, so they can be passed directly or retained.
 *
 * Initial rows and subsequent row copies are shallow-frozen. Nested values are not
 * cloned and must also be treated as immutable. Only initial rows with server IDs form
 * the persisted baseline; ID-less initial rows are unsaved creations, start dirty,
 * and are discarded by revert. This store does not advance the baseline or implement
 * draft editing, business validation, normalization, or persistence.
 *
 * Inspection methods do not mutate state. Mutators validate keys and ownership before
 * adoption; subscriber callbacks observe committed state rather than vetoing writes.
 * Movement permissions belong to the adapter, not this store's ordering primitive.
 *
 * @example
 * const [document] = useState(() => createLineItemsDocument({ columns, lines }));
 * const rows = useSyncExternalStore(
 *   document.subscribe,
 *   document.getRows,
 *   document.getRows,
 * );
 *
 * @internal
 */
export function createLineItemsDocument<T extends Record<string, unknown>>({
  columns,
  lines = [],
  idKey = "id" as keyof T & string,
}: DocumentOptions<T>) {
  const properties = compileLineItemsColumns(columns);
  const owner = {};
  const prefix = crypto.randomUUID();
  let serial = 0;
  const identities = new Map<string, string | undefined>();
  const listeners = new Set<() => void>();
  const keyOf = (row: T): string => {
    const identity = (row as Tagged)[IDENTITY];
    if (identity?.owner !== owner) throw new Error("The line does not belong to this document");
    return identity.key;
  };
  const tag = (row: T, key: string): T =>
    Object.freeze({ ...row, [IDENTITY]: Object.freeze({ owner, key }) }) as T;
  const newKey = () => `line:${prefix}:${++serial}`;
  const publicKey = (key: string): string => identities.get(key) ?? key;
  const getLineKey = (row: T): string => publicKey(keyOf(row));
  const snapshot = (input: readonly T[]): Snapshot<T> => {
    const byKey = new Map<string, T>();
    const publicKeys = new Set<string>();
    const order: string[] = [];
    for (const row of input) {
      const key = keyOf(row);
      const externalKey = serverId(row[idKey]) ?? key;
      if (byKey.has(key) || publicKeys.has(externalKey)) throw new Error("Line IDs must be unique");
      byKey.set(key, row);
      publicKeys.add(externalKey);
      order.push(key);
    }
    return { order: Object.freeze(order), rows: byKey };
  };
  let current = snapshot(lines.map((row) => tag(row, newKey())));
  // ID-less initial rows are unsaved creations, not part of the persisted baseline.
  const baseline = snapshot(
    [...current.rows.values()].filter((row) => serverId(row[idKey]) !== undefined),
  );
  let rows: readonly T[] = Object.freeze([]);

  function adopt(state: Snapshot<T>) {
    current = state;
    rows = Object.freeze(state.order.map((key) => state.rows.get(key)!));
    for (const [key, row] of state.rows) identities.set(key, serverId(row[idKey]));
    // oxlint-disable-next-line unicorn/no-useless-spread -- Subscriptions can change during notification.
    for (const listener of [...listeners]) listener();
  }
  function findKey(lineKey: string): string {
    const key = current.order.find((candidate) => publicKey(candidate) === lineKey);
    if (key === undefined) throw new Error(`Unknown line "${lineKey}"`);
    return key;
  }

  adopt(current);

  return {
    /** Identity property captured at creation; a different idKey requires a new store. */
    idKey,
    /**
     * Returns the cached, shallow-frozen rows in adopted document order.
     * Use directly as getSnapshot (and getServerSnapshot) for useSyncExternalStore.
     * Repeated reads are referentially equal until adoption publishes a new array.
     */
    getRows: () => rows,
    /**
     * Resolves a row's stable identity to a string server ID or a client-only key.
     * Accepts owned rows, previously returned rows, and spreads retaining private identity;
     * rejects untagged or foreign rows. This is not a current-membership check: a removed
     * row still resolves, but its key cannot be used by commands until it is restored.
     */
    getLineKey,
    /**
     * Registers a payload-free change listener for useSyncExternalStore.
     * Registration does not invoke it. Each adoption notifies synchronously after replacing
     * the snapshot; listeners should reread getRows/isDirty rather than validate the write.
     * Returns an idempotent cleanup that removes the listener from future adoptions.
     * Invalid writes, same-value field updates, and no-op moves do not notify.
     */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Validates replacement display definitions against the original property ownership.
     * Despite its name, this only checks configuration: it does not store the new definitions,
     * mutate rows, or notify subscribers, so an adapter may call it during render.
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
     * Inspects differences from the persisted initial baseline without modifying the store.
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
        const row = current.rows.get(key)!;
        const base = baseline.rows.get(key)!;
        for (const property of properties) {
          if (property !== idKey && !Object.is(row[property], base[property])) return true;
        }
      }
      return false;
    },
    /**
     * Publishes a copy of one current row with an updated accessorKey-owned property,
     * preserving its private identity and reusing all other rows. Values are adopted as-is,
     * without normalization or business validation. A valid Object.is-equal write is a no-op.
     * @throws If the key is not current, the property is unowned, or the server ID changes.
     */
    updateField<K extends keyof T & string>(lineKey: string, property: K, value: T[K]) {
      const key = findKey(lineKey);
      const row = current.rows.get(key)!;
      if (property === idKey && !Object.is(row[property], value))
        throw new Error("Line IDs may only change through save acknowledgment");
      if (property !== idKey && !properties.has(property))
        throw new Error(`Property "${property}" has no document owner`);
      if (Object.is(row[property], value)) return;
      const updated = tag({ ...row, [property]: value }, key);
      adopt(snapshot(rows.map((line) => (keyOf(line) === key ? updated : line))));
    },
    /**
     * Appends and publishes an unsaved creation from a shallow copy of input.
     * Drops the configured server ID and assigns fresh identity even when copying an owned
     * row. The input is not mutated, nested values are reused, and the baseline is unchanged.
     * Returns the client-only key accepted by the row commands; the creation makes the
     * document dirty until it is removed or discarded by revert.
     */
    addLine(input: T): string {
      const raw = { ...input };
      delete raw[idKey];
      const added = tag(raw, newKey());
      adopt(snapshot([...rows, added]));
      return getLineKey(added);
    },
    /**
     * Removes one current row and publishes the remaining rows without changing the baseline.
     * Removing an unsaved creation can cancel its dirty contribution; removing a persisted
     * row stays dirty until restored by revert. Remaining rows retain their objects and keys.
     * @throws If the key does not identify a current row.
     */
    removeLine(lineKey: string) {
      const key = findKey(lineKey);
      adopt(snapshot(rows.filter((row) => keyOf(row) !== key)));
    },
    /**
     * Moves a current row immediately after another current row; null moves it to the front.
     * Publishes only when order changes, preserving row objects, identities, and membership.
     * A self-anchor or unchanged position is a no-op. This primitive does not enforce orderer;
     * useLineItems owns the manual-movement permission check.
     * @throws If the moved row or a non-null anchor is not in the current document.
     */
    reorderLine(lineKey: string, afterLineKey: string | null) {
      const key = findKey(lineKey);
      const after = afterLineKey === null ? null : findKey(afterLineKey);
      if (key === after) return;
      const order = current.order.filter((candidate) => candidate !== key);
      order.splice(after === null ? 0 : order.indexOf(after) + 1, 0, key);
      if (order.some((candidate, index) => candidate !== current.order[index]))
        adopt(snapshot(order.map((candidate) => current.rows.get(candidate)!)));
    },
    /**
     * Restores the persisted initial rows, values, and order without advancing the baseline.
     * Discards every unsaved creation, including ID-less rows supplied at initialization.
     * Restored rows retain their initial frozen objects and identities. Always adopts and
     * notifies, even when already clean; this is restoration, not permission-gated movement.
     */
    revert() {
      adopt(snapshot(baseline.order.map((key) => baseline.rows.get(key)!)));
    },
  };
}
