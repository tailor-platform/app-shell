import { describe, expect, it } from "vitest";
import { createLineItemsIdentity, serverId } from "./identity";

type Row = { id?: string | number; value: string };

describe("document-scoped line identity", () => {
  it("normalizes valid server IDs and rejects invalid identities", () => {
    expect(serverId(undefined)).toBeUndefined();
    expect(serverId(null)).toBeUndefined();
    expect(serverId(0)).toBe("0");
    expect(serverId(1)).toBe(serverId("1"));
    expect(serverId(" A ")).toBe(" A ");
    for (const value of ["", Number.NaN, Number.POSITIVE_INFINITY, true, {}]) {
      expect(() => serverId(value)).toThrow("non-empty strings or finite numbers");
    }
  });

  it("tags immutable copies with fresh keys without registering server IDs", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const source = Object.freeze({ id: 0, value: "Initial" });
    const key = identity.newKey();
    const tagged = identity.tag(source, key);
    expect(tagged).not.toBe(source);
    expect(Object.isFrozen(tagged)).toBe(true);
    expect(Object.getOwnPropertySymbols(source)).toHaveLength(0);
    expect(identity.newKey()).not.toBe(key);
    expect(identity.getLineKey(tagged)).toBe(key);
    identity.remember([tagged]);
    expect(identity.getLineKey({ ...tagged })).toBe("0");
    const updated = identity.tag({ ...tagged, value: "Updated" }, key);
    expect(identity.keyOf(updated)).toBe(identity.keyOf(tagged));
    expect(identity.getLineKey(updated)).toBe("0");
    expect(source.value).toBe("Initial");
  });

  it("rejects untagged rows and rows owned by another factory", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const other = createLineItemsIdentity<Row>("id");
    const source: Row = { id: "A", value: "Initial" };
    expect(() => identity.keyOf(source)).toThrow("does not belong");
    const foreign = other.tag(source, other.newKey());
    expect(() => identity.getLineKey(foreign)).toThrow("does not belong");
  });

  it("resolves registered and client keys only within the supplied current candidates", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const serverKey = identity.newKey();
    const clientKey = identity.newKey();
    const persisted = identity.tag({ id: 0, value: "Persisted" }, serverKey);
    const creation = identity.tag({ value: "Creation" }, clientKey);
    identity.remember([persisted, creation]);
    const currentKeys = Object.freeze([serverKey, clientKey]);
    expect(identity.resolveKey("0", currentKeys)).toBe(serverKey);
    expect(identity.resolveKey(clientKey, currentKeys)).toBe(clientKey);
    expect(() => identity.resolveKey("missing", currentKeys)).toThrow('Unknown line "missing"');
    expect(() => identity.resolveKey("0", [clientKey])).toThrow('Unknown line "0"');
    expect(() => identity.resolveKey(clientKey, [])).toThrow("Unknown line");
    expect(identity.getLineKey(persisted)).toBe("0");
    expect(currentKeys).toEqual([serverKey, clientKey]);
  });

  it("retains registered IDs until adoption, including identities for retired rows", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const key = identity.newKey();
    const adopted = identity.tag({ id: "A", value: "Initial" }, key);
    identity.remember([adopted]);
    const unadopted = identity.tag({ id: "Changed", value: "Candidate" }, key);
    expect(identity.getLineKey(unadopted)).toBe("A");
    identity.remember([]);
    expect(identity.getLineKey(adopted)).toBe("A");
    expect(identity.getLineKey(unadopted)).toBe("A");
  });
});
