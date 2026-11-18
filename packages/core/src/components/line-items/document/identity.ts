const IDENTITY = Symbol("LineItems.identity");
type Identity = { owner: object; clientKey: string };
type Tagged = { [IDENTITY]?: Identity };

/** Reads stable UI identity without exposing it through the public command API. */
export function clientKeyOf(row: Record<string, unknown>): string {
  const identity = (row as Tagged)[IDENTITY];
  if (!identity) throw new Error("The line does not belong to a document");
  return identity.clientKey;
}

/** Normalize a persisted ID without trimming strings or conflating zero with absence. */
export function persistedId(value: unknown): string | undefined {
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
 * Owns client keys and registered persisted IDs for one document lifetime.
 * Candidate tags do not register persisted IDs. The document validates a complete
 * snapshot first, then calls remember during adoption. Retired identities remain
 * resolvable; current membership and duplicate-ID checks belong to the document.
 *
 * @internal
 */
export function createLineItemsIdentity<T extends Record<string, unknown>>(
  idKey: keyof T & string,
) {
  const owner = {};
  const prefix = crypto.randomUUID();
  let serial = 0;
  const persistedIds = new Map<string, string | undefined>();
  const ownedClientKeyOf = (row: T): string => {
    const identity = (row as Tagged)[IDENTITY];
    if (identity?.owner !== owner) throw new Error("The line does not belong to this document");
    return identity.clientKey;
  };
  const toLineKey = (clientKey: string): string => persistedIds.get(clientKey) ?? clientKey;

  return {
    /** Reads the client key, rejecting rows from outside this document owner. */
    clientKeyOf: ownedClientKeyOf,
    /** Copies and shallow-freezes a row with its client key; spreads retain the tag. */
    tag: (row: T, clientKey: string): T =>
      Object.freeze({ ...row, [IDENTITY]: Object.freeze({ owner, clientKey }) }) as T,
    /** Allocates a fresh client key without registering a row or persisted ID. */
    newClientKey: () => `line:${prefix}:${++serial}`,
    /** Resolves a line key through the client tag, not potentially replaced row fields. */
    getLineKey: (row: T): string => toLineKey(ownedClientKeyOf(row)),
    /**
     * Resolves a line key within the caller's current client keys only.
     * The registry may retain retired identities, but candidates define allowed membership.
     * @throws If no candidate resolves to the requested line key.
     */
    resolveClientKey(lineKey: string, currentClientKeys: readonly string[]): string {
      const clientKey = currentClientKeys.find((candidate) => toLineKey(candidate) === lineKey);
      if (clientKey === undefined) throw new Error(`Unknown line "${lineKey}"`);
      return clientKey;
    },
    /**
     * Registers IDs for already-validated, adopted rows. Does not forget retired rows.
     * The caller owns snapshot validation and decides when adoption is allowed.
     */
    remember(rows: readonly T[]) {
      for (const row of rows) persistedIds.set(ownedClientKeyOf(row), persistedId(row[idKey]));
    },
  };
}
