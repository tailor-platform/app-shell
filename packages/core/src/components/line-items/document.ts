import { compileLineItemsColumns } from "./columns";
import type { LineItemsColumn } from "./types";

const IDENTITY = Symbol("LineItems.identity");
type Identity = { owner: object; key: string };
type Tagged = { [IDENTITY]?: Identity };
type Snapshot<T> = { order: readonly string[]; rows: ReadonlyMap<string, T> };

type DocumentOptions<T extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<T>[];
  lines?: readonly T[];
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

/** A document-owned engine; values and nested leaves must be treated as immutable. */
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
    idKey,
    getRows: () => rows,
    getLineKey,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setColumns(nextColumns: readonly LineItemsColumn<T>[]) {
      const next = compileLineItemsColumns(nextColumns);
      if (next.size !== properties.size || [...next].some((key) => !properties.has(key)))
        throw new Error("Remount LineItems to change document property ownership");
    },
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
    addLine(input: T): string {
      const raw = { ...input };
      delete raw[idKey];
      const added = tag(raw, newKey());
      adopt(snapshot([...rows, added]));
      return getLineKey(added);
    },
    removeLine(lineKey: string) {
      const key = findKey(lineKey);
      adopt(snapshot(rows.filter((row) => keyOf(row) !== key)));
    },
    reorderLine(lineKey: string, afterLineKey: string | null) {
      const key = findKey(lineKey);
      const after = afterLineKey === null ? null : findKey(afterLineKey);
      if (key === after) return;
      const order = current.order.filter((candidate) => candidate !== key);
      order.splice(after === null ? 0 : order.indexOf(after) + 1, 0, key);
      if (order.some((candidate, index) => candidate !== current.order[index]))
        adopt(snapshot(order.map((candidate) => current.rows.get(candidate)!)));
    },
    revert() {
      adopt(snapshot(baseline.order.map((key) => baseline.rows.get(key)!)));
    },
  };
}
