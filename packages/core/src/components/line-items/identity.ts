const IDENTITY = Symbol("LineItems.identity");
type Identity = { owner: object; key: string };
type Tagged = { [IDENTITY]?: Identity };

/** Normalize a server identity without trimming strings or conflating zero with absence. */
export function serverId(value: unknown): string | undefined {
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
 * Owns private row identity and registered server IDs for one document lifetime.
 * Candidate keys/tags do not register server IDs. The document validates a complete
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
  const identities = new Map<string, string | undefined>();
  const keyOf = (row: T): string => {
    const identity = (row as Tagged)[IDENTITY];
    if (identity?.owner !== owner) throw new Error("The line does not belong to this document");
    return identity.key;
  };
  const publicKey = (key: string): string => identities.get(key) ?? key;

  return {
    /** Resolves private identity, rejecting rows from outside this document owner. */
    keyOf,
    /** Copies and shallow-freezes a row with the supplied private key; spreads retain it. */
    tag: (row: T, key: string): T =>
      Object.freeze({ ...row, [IDENTITY]: Object.freeze({ owner, key }) }) as T,
    /** Allocates a fresh client-only key without registering a row or server ID. */
    newKey: () => `line:${prefix}:${++serial}`,
    /** Resolves a row through its private tag, not through potentially replaced row fields. */
    getLineKey: (row: T): string => publicKey(keyOf(row)),
    /**
     * Resolves a public key within the caller's current candidate keys only.
     * The registry may retain retired identities, but candidates define allowed membership.
     * @throws If no candidate resolves to the requested public key.
     */
    resolveKey(lineKey: string, currentKeys: readonly string[]): string {
      const key = currentKeys.find((candidate) => publicKey(candidate) === lineKey);
      if (key === undefined) throw new Error(`Unknown line "${lineKey}"`);
      return key;
    },
    /**
     * Registers IDs for already-validated, adopted rows. Does not forget retired rows.
     * The caller owns snapshot validation and decides when adoption is allowed.
     */
    remember(rows: readonly T[]) {
      for (const row of rows) identities.set(keyOf(row), serverId(row[idKey]));
    },
  };
}

export type LineItemsIdentity<T extends Record<string, unknown>> = ReturnType<
  typeof createLineItemsIdentity<T>
>;
