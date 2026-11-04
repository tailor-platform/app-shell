import { compileLineItemsColumns } from "./columns";
import type {
  LineItemsChangeSet,
  LineItemsColumn,
  LineItemsLineChange,
  LineItemsLineRef,
  LineItemsResetInput,
  LineItemsResetOptions,
} from "./types";

const IDENTITY = Symbol("LineItems.identity");
type Identity = { owner: object; epoch: number; key: string };
type Tagged = { [IDENTITY]?: Identity };
type Snapshot<T> = { order: readonly string[]; rows: ReadonlyMap<string, T> };
type Receipt<T> = {
  epoch: number;
  generation: number;
  submitted: Snapshot<T>;
  baseline: Snapshot<T>;
  acknowledged: boolean;
};

type DocumentOptions<T extends Record<string, unknown>> = {
  columns: readonly LineItemsColumn<T>[];
  lines?: readonly T[];
  idKey?: keyof T & string;
  ordering?: "sort" | "manual";
};

function serverId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    value === "" ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw new Error("Line IDs must be non-empty strings or finite numbers");
  }
  return String(value);
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function rowsOf<T>(state: Snapshot<T>): readonly T[] {
  return state.order.map((key) => state.rows.get(key)!);
}

/** A document-owned engine; values and nested leaves must be treated as immutable. @internal */
export function createLineItemsDocument<T extends Record<string, unknown>>({
  columns,
  lines = [],
  idKey = "id" as keyof T & string,
  ordering = "sort",
}: DocumentOptions<T>) {
  let schema = compileLineItemsColumns(columns);
  let propertyKeys = new Set([...schema.documentKeys, ...schema.metadataKeys]);
  const owner = {};
  let epoch = 0;
  let generation = 0;
  let revision = 0;
  let serial = 0;
  const prefix = crypto.randomUUID();
  const receipts = new WeakMap<LineItemsChangeSet<T>, Receipt<T>>();
  const identities = new Map<string, string | number | undefined>();
  const metadata = new Map<string, Readonly<Partial<T>>>();

  const keyOf = (row: T): string => {
    const identity = (row as Tagged)[IDENTITY];
    if (!identity || identity.owner !== owner || identity.epoch !== epoch) {
      throw new Error("The line does not belong to this document");
    }
    return identity.key;
  };
  const tag = (row: T, key: string): T =>
    Object.freeze({ ...row, [IDENTITY]: Object.freeze({ owner, epoch, key }) }) as T;
  const newKey = () => `line:${prefix}:${++serial}`;
  const clean = (row: T, omitId = false): Partial<T> => {
    const copy = { ...row } as T & Tagged;
    delete copy[IDENTITY];
    if (omitId) delete copy[idKey];
    return copy;
  };
  const snapshot = (rows: readonly T[]): Snapshot<T> => {
    const byKey = new Map<string, T>();
    const publicKeys = new Set<string>();
    const order: string[] = [];
    for (const row of rows) {
      const key = keyOf(row);
      const externalKey = serverId(row[idKey]) ?? key;
      if (byKey.has(key) || publicKeys.has(externalKey))
        throw new Error("Line identities and IDs must be unique");
      byKey.set(key, row);
      publicKeys.add(externalKey);
      order.push(key);
    }
    return { order: Object.freeze(order), rows: byKey };
  };
  let current: Snapshot<T> = { order: [], rows: new Map() };
  let baseline: Snapshot<T> = current;
  let rows: readonly T[] = Object.freeze([]);

  function rememberMetadata(state: Snapshot<T>) {
    for (const [key, row] of state.rows) {
      const values: Partial<T> = {};
      for (const property of schema.metadataKeys) {
        (values as Record<string, unknown>)[property] = row[property];
      }
      metadata.set(key, Object.freeze(values));
    }
  }
  function adopt(state: Snapshot<T>) {
    current = state;
    rows = Object.freeze(rowsOf(state));
    for (const [key, row] of state.rows)
      identities.set(key, row[idKey] as string | number | undefined);
    rememberMetadata(state);
    revision++;
  }
  function normalizeInput(input: readonly T[], reuse: boolean): Snapshot<T> {
    const byServerId = new Map<string, string>();
    if (reuse) {
      for (const [key, id] of identities) {
        const value = serverId(id);
        if (value !== undefined) byServerId.set(value, key);
      }
    }
    return snapshot(
      input.map((row) => {
        const identity = (row as Tagged)[IDENTITY];
        const normalized = schema.normalize(row);
        const id = serverId(normalized[idKey]);
        let key: string;
        if (reuse && identity?.owner === owner) {
          if (identity.epoch !== epoch || !identities.has(identity.key))
            throw new Error("Stale line identity");
          key = identity.key;
          if (serverId(identities.get(key)) !== id)
            throw new Error("Line IDs may only change through save acknowledgment");
        } else {
          key = (id === undefined ? undefined : byServerId.get(id)) ?? newKey();
        }
        return tag(normalized, key);
      }),
    );
  }
  function initialize(input: readonly T[]) {
    const state = normalizeInput(input, false);
    baseline = snapshot(rowsOf(state).filter((row) => serverId(row[idKey]) !== undefined));
    adopt(state);
  }
  initialize(lines);

  function publicKey(key: string): string {
    return serverId(identities.get(key)) ?? key;
  }
  function findKey(lineKey: string): string {
    const key = current.order.find((candidate) => publicKey(candidate) === lineKey);
    if (!key) throw new Error(`Unknown line "${lineKey}"`);
    return key;
  }
  function getLineKey(row: T): string {
    return publicKey(keyOf(row));
  }
  function changes(): LineItemsChangeSet<T> {
    const lineChanges: LineItemsLineChange<T>[] = [];
    for (const key of baseline.order) {
      if (!current.rows.has(key))
        lineChanges.push(Object.freeze({ action: "remove", lineId: publicKey(key) }));
    }
    for (const key of current.order) {
      const row = current.rows.get(key)!;
      const base = baseline.rows.get(key);
      if (!base) {
        lineChanges.push(
          Object.freeze({ action: "add", tempId: key, data: Object.freeze(clean(row, true)) }),
        );
        continue;
      }
      const patch: Partial<T> = {};
      for (const property of schema.documentKeys) {
        if (property !== idKey && !schema.equals(property, row[property], base[property], row)) {
          (patch as Record<string, unknown>)[property] = row[property];
        }
      }
      if (Object.keys(patch).length > 0)
        lineChanges.push(
          Object.freeze({ action: "update", lineId: publicKey(key), patch: Object.freeze(patch) }),
        );
    }
    const order: readonly LineItemsLineRef[] | undefined =
      ordering === "manual" && !sameOrder(current.order, baseline.order)
        ? Object.freeze(
            current.order.map((key) =>
              Object.freeze(baseline.rows.has(key) ? { lineId: publicKey(key) } : { tempId: key }),
            ),
          )
        : undefined;
    const result = Object.freeze({
      isEmpty: lineChanges.length === 0 && order === undefined,
      lineChanges: Object.freeze(lineChanges),
      ...(order ? { order } : {}),
    });
    receipts.set(result, { epoch, generation, submitted: current, baseline, acknowledged: false });
    return result;
  }

  function reset(saved?: LineItemsResetInput<T>, options: LineItemsResetOptions<T> = {}) {
    const sent = options.sent;
    if (!sent) {
      if (saved !== undefined && !Array.isArray(saved))
        throw new Error("ID mapping requires the submitted change-set");
      const replacement = saved === undefined ? rows : (saved as readonly T[]);
      if (replacement.some((row) => serverId(row[idKey]) === undefined))
        throw new Error("New lines require a submitted snapshot and ID mapping");
      // Validate before invalidating receipts or the current document.
      const prepared = replacement.map((row) => schema.normalize(row));
      const ids = prepared.map((row) => serverId(row[idKey]));
      if (ids.some((id) => id === undefined))
        throw new Error("Replacement rows require server IDs");
      if (new Set(ids).size !== ids.length) throw new Error("Line IDs must be unique");
      epoch++;
      identities.clear();
      metadata.clear();
      const state = snapshot(prepared.map((row) => tag(row, newKey())));
      baseline = state;
      adopt(state);
      generation++;
      return;
    }
    const receipt = receipts.get(sent);
    if (!receipt || receipt.epoch !== epoch)
      throw new Error("Unknown or foreign submitted snapshot");
    if (receipt.acknowledged) return;
    if (receipt.generation !== generation)
      throw new Error("Stale submitted snapshot; serialize document saves");
    const mapped =
      saved !== undefined && !Array.isArray(saved)
        ? (saved as { idMap: Readonly<Record<string, string | number>> }).idMap
        : (options.idMap ?? {});
    const added = receipt.submitted.order.filter((key) => !receipt.baseline.rows.has(key));
    if (Object.keys(mapped).some((key) => !added.includes(key)))
      throw new Error("ID mapping contains an unknown creation");
    const assigned = new Map<string, string | number>();
    const seenIds = new Set<string>();
    for (const key of receipt.submitted.order) {
      const old = receipt.submitted.rows.get(key)!;
      let rawId: unknown;
      if (receipt.baseline.rows.has(key)) rawId = old[idKey];
      else if (Object.hasOwn(mapped, key)) rawId = mapped[key];
      const id = serverId(rawId);
      if (id === undefined) throw new Error(`Missing server ID mapping for "${key}"`);
      if (seenIds.has(id)) throw new Error("Server ID mappings must be unique");
      seenIds.add(id);
      assigned.set(key, rawId as string | number);
    }
    const keyByServerId = new Map([...assigned].map(([key, id]) => [String(id), key]));
    const serverRows = Array.isArray(saved) ? (saved as readonly T[]) : undefined;
    let acknowledged: Snapshot<T>;
    if (serverRows) {
      const normalized = serverRows.map((row) => schema.normalize(row));
      if (normalized.length !== receipt.submitted.order.length)
        throw new Error("Saved rows must match the submitted document membership");
      const acknowledgedRows = normalized.map((row) => {
        const id = serverId(row[idKey]);
        const key = id === undefined ? undefined : keyByServerId.get(id);
        if (!key) throw new Error("Saved row has an unknown or missing server ID");
        return tag(row, key);
      });
      acknowledged = snapshot(acknowledgedRows);
    } else {
      acknowledged = snapshot(
        receipt.submitted.order.map((key) => {
          const normalized = schema.normalize({
            ...receipt.submitted.rows.get(key)!,
            [idKey]: assigned.get(key),
          });
          if (serverId(normalized[idKey]) !== serverId(assigned.get(key)))
            throw new Error("Normalization cannot change an acknowledged line ID");
          return tag(normalized, key);
        }),
      );
    }

    const merged = new Map<string, T>();
    for (const key of current.order) {
      const local = current.rows.get(key)!;
      const submitted = receipt.submitted.rows.get(key);
      const server = acknowledged.rows.get(key);
      if (!submitted || !server) {
        if (!submitted && receipt.baseline.rows.has(key)) {
          // A submitted deletion succeeded; restoring this line now requires a new create.
          const recreated = schema.normalize(clean(local, true) as T);
          if (serverId(recreated[idKey]) !== undefined)
            throw new Error("A recreated line cannot have a server ID");
          merged.set(key, tag(recreated, key));
        } else merged.set(key, local);
        continue;
      }
      const row = { ...server } as T;
      let changed = false;
      for (const property of new Set([...Object.keys(submitted), ...Object.keys(local)])) {
        if (property === idKey) continue;
        const preserveMetadata =
          receipt.baseline.rows.has(key) && schema.metadataKeys.includes(property);
        if (
          preserveMetadata ||
          !schema.equals(property, local[property], submitted[property], local)
        ) {
          changed ||=
            !Object.is(row[property], local[property]) ||
            Object.hasOwn(row, property) !== Object.hasOwn(local, property);
          (row as Record<string, unknown>)[property] = local[property];
        }
      }
      // A three-way merge creates a new row context for cross-property normalizers.
      const adopted = changed ? schema.normalize(row) : server;
      if (serverId(adopted[idKey]) !== serverId(server[idKey]))
        throw new Error("Normalization cannot change an acknowledged line ID");
      merged.set(key, changed ? tag(adopted, key) : server);
    }
    const locallyReordered = !sameOrder(current.order, receipt.submitted.order);
    const order = locallyReordered ? current.order : acknowledged.order;
    const rebased = snapshot(order.filter((key) => merged.has(key)).map((key) => merged.get(key)!));
    const nextMetadata = new Map(metadata);
    for (const [key, acknowledgedRow] of acknowledged.rows) {
      const previous = metadata.get(key);
      const submitted = receipt.submitted.rows.get(key)!;
      const values: Partial<T> = {};
      for (const property of schema.metadataKeys) {
        const preserve =
          previous &&
          (receipt.baseline.rows.has(key) ||
            !schema.equals(property, previous[property], submitted[property], acknowledgedRow));
        (values as Record<string, unknown>)[property] = preserve
          ? previous![property]
          : acknowledgedRow[property];
      }
      nextMetadata.set(key, Object.freeze(values));
    }
    // All correlation/normalization/equality checks finish before state advances.
    for (const [key, id] of assigned) identities.set(key, id);
    baseline = acknowledged;
    metadata.clear();
    for (const [key, values] of nextMetadata) metadata.set(key, values);
    adopt(rebased);
    receipt.acknowledged = true;
    generation++;
  }

  return {
    getRows: () => rows,
    getClientKey: keyOf,
    getLineKey,
    setColumns(nextColumns: readonly LineItemsColumn<T>[]) {
      const next = compileLineItemsColumns(nextColumns);
      const nextKeys = new Set([...next.documentKeys, ...next.metadataKeys]);
      if (
        nextKeys.size !== propertyKeys.size ||
        [...nextKeys].some((key) => !propertyKeys.has(key))
      )
        throw new Error("Remount LineItems to change document property ownership");
      schema = next;
      propertyKeys = nextKeys;
    },
    isNewLine: (row: T) => serverId(identities.get(keyOf(row))) === undefined,
    getRevision: () => revision,
    getChangeSet: changes,
    getErrors: () => schema.validate(rows, getLineKey),
    isDirty: () => !changes().isEmpty,
    addLines(input: readonly T[], options: { afterLineKey?: string | null } = {}): string[] {
      const added = input.map((row) => {
        const raw = clean(row, true) as T;
        const normalized = schema.normalize(raw);
        if (serverId(normalized[idKey]) !== undefined)
          throw new Error("A new line cannot have a server ID");
        return tag(normalized, newKey());
      });
      let index = rows.length;
      if (options.afterLineKey === null) index = 0;
      else if (options.afterLineKey !== undefined)
        index = current.order.indexOf(findKey(options.afterLineKey)) + 1;
      const next = [...rows];
      next.splice(index, 0, ...added);
      const state = snapshot(next);
      if (added.length > 0) adopt(state);
      return added.map(getLineKey);
    },
    removeLines(lineKeys: readonly string[]) {
      const remove = new Set(lineKeys.map(findKey));
      if (remove.size > 0) adopt(snapshot(rows.filter((row) => !remove.has(keyOf(row)))));
    },
    updateLines(patches: readonly { lineKey: string; patch: Partial<T> }[]) {
      const merged = new Map<string, Partial<T>>();
      for (const { lineKey, patch } of patches) {
        const key = findKey(lineKey);
        for (const property of Object.keys(patch)) {
          if (property !== idKey && !propertyKeys.has(property))
            throw new Error(`Property "${property}" has no document or metadata owner`);
        }
        if (Object.hasOwn(patch, idKey) && !Object.is(patch[idKey], current.rows.get(key)![idKey]))
          throw new Error("Line IDs may only change through save acknowledgment");
        merged.set(key, { ...merged.get(key), ...patch });
      }
      if (merged.size === 0) return;
      const next = rows.map((row) => {
        const key = keyOf(row);
        const patch = merged.get(key);
        if (!patch) return row;
        const normalized = schema.normalize({ ...row, ...patch });
        if (serverId(normalized[idKey]) !== serverId(row[idKey]))
          throw new Error("Normalization cannot change an existing line ID");
        return tag(normalized, key);
      });
      adopt(snapshot(next));
    },
    reorder(lineKey: string, afterLineKey: string | null) {
      if (ordering !== "manual") throw new Error("Document reordering requires manual ordering");
      const key = findKey(lineKey);
      const after = afterLineKey === null ? null : findKey(afterLineKey);
      if (key === after) return;
      const order = current.order.filter((candidate) => candidate !== key);
      order.splice(after === null ? 0 : order.indexOf(after) + 1, 0, key);
      if (!sameOrder(order, current.order))
        adopt(snapshot(order.map((candidate) => current.rows.get(candidate)!)));
    },
    adoptExternal(input: readonly T[]) {
      adopt(normalizeInput(input, true));
    },
    revert() {
      // shortcut: Discard preserves both scopes as-is; settle cross-scope normalization before exposing the hook.
      adopt(
        snapshot(
          baseline.order.map((key) =>
            tag({ ...baseline.rows.get(key)!, ...metadata.get(key) }, key),
          ),
        ),
      );
    },
    reset,
  };
}
