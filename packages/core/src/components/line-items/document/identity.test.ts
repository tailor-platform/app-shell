import { describe, expect, it } from "vitest";
import { clientKeyOf, createLineItemsIdentity, persistedId } from "./identity";

type Row = { id?: string | number; value: string };

describe("document-scoped line identity", () => {
  it("normalizes valid persisted IDs and rejects invalid identities", () => {
    expect(persistedId(undefined)).toBeUndefined();
    expect(persistedId(null)).toBeUndefined();
    expect(persistedId(0)).toBe("0");
    expect(persistedId(1)).toBe(persistedId("1"));
    expect(persistedId(" A ")).toBe(" A ");
    for (const value of ["", Number.NaN, Number.POSITIVE_INFINITY, true, {}]) {
      expect(() => persistedId(value)).toThrow("non-empty strings or finite numbers");
    }
  });

  it("tags immutable copies with fresh client keys without registering persisted IDs", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const source = Object.freeze({ id: 0, value: "Initial" });
    const clientKey = identity.newClientKey();
    const tagged = identity.tag(source, clientKey);
    expect(tagged).not.toBe(source);
    expect(Object.isFrozen(tagged)).toBe(true);
    expect(Object.getOwnPropertySymbols(source)).toHaveLength(0);
    expect(identity.newClientKey()).not.toBe(clientKey);
    expect(identity.getLineKey(tagged)).toBe(clientKey);
    expect(clientKeyOf(tagged)).toBe(clientKey);
    identity.remember([tagged]);
    expect(identity.getLineKey({ ...tagged })).toBe("0");
    const updated = identity.tag({ ...tagged, value: "Updated" }, clientKey);
    expect(identity.clientKeyOf(updated)).toBe(identity.clientKeyOf(tagged));
    expect(clientKeyOf({ ...updated })).toBe(clientKey);
    expect(identity.getLineKey(updated)).toBe("0");
    expect(source.value).toBe("Initial");
  });

  it("rejects untagged rows and rows owned by another factory", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const other = createLineItemsIdentity<Row>("id");
    const source: Row = { id: "A", value: "Initial" };
    expect(() => identity.clientKeyOf(source)).toThrow("does not belong");
    expect(() => clientKeyOf(source)).toThrow("does not belong");
    const foreign = other.tag(source, other.newClientKey());
    expect(() => identity.getLineKey(foreign)).toThrow("does not belong");
  });

  it("resolves line keys only within the supplied current client keys", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const persistedClientKey = identity.newClientKey();
    const creationClientKey = identity.newClientKey();
    const persisted = identity.tag({ id: 0, value: "Persisted" }, persistedClientKey);
    const creation = identity.tag({ value: "Creation" }, creationClientKey);
    identity.remember([persisted, creation]);
    const currentClientKeys = Object.freeze([persistedClientKey, creationClientKey]);
    expect(identity.resolveClientKey("0", currentClientKeys)).toBe(persistedClientKey);
    expect(identity.resolveClientKey(creationClientKey, currentClientKeys)).toBe(creationClientKey);
    expect(() => identity.resolveClientKey("missing", currentClientKeys)).toThrow(
      'Unknown line "missing"',
    );
    expect(() => identity.resolveClientKey("0", [creationClientKey])).toThrow('Unknown line "0"');
    expect(() => identity.resolveClientKey(creationClientKey, [])).toThrow("Unknown line");
    expect(() => identity.resolveClientKey(persistedClientKey, currentClientKeys)).toThrow(
      "Unknown line",
    );
    expect(identity.getLineKey(persisted)).toBe("0");
    expect(currentClientKeys).toEqual([persistedClientKey, creationClientKey]);
  });

  it("retains registered IDs until adoption, including identities for retired rows", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const clientKey = identity.newClientKey();
    const adopted = identity.tag({ id: "A", value: "Initial" }, clientKey);
    identity.remember([adopted]);
    const unadopted = identity.tag({ id: "Changed", value: "Candidate" }, clientKey);
    expect(identity.getLineKey(unadopted)).toBe("A");
    identity.remember([]);
    expect(identity.getLineKey(adopted)).toBe("A");
    expect(identity.getLineKey(unadopted)).toBe("A");
  });
});
