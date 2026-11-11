import { describe, expect, it } from "vitest";
import { createLineItemsIdentity } from "./identity";
import { createLineItemsSnapshots } from "./snapshot";

type Row = { id?: string | number; value: string };

describe("document-bound snapshot factory", () => {
  it("constructs an immutable row view and client-key indexes without registering candidates", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const firstClientKey = identity.newClientKey();
    const secondClientKey = identity.newClientKey();
    const first = identity.tag({ id: 0, value: "First" }, firstClientKey);
    const second = identity.tag({ value: "Second" }, secondClientKey);
    const input = [first, second];
    const candidate = snapshots.create(input);
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.lines)).toBe(true);
    expect(Object.isFrozen(candidate.clientKeys)).toBe(true);
    expect(candidate.lines).not.toBe(input);
    expect(candidate.clientKeys).toEqual([firstClientKey, secondClientKey]);
    expect(candidate.byClientKey.get(firstClientKey)).toBe(candidate.lines[0]);
    expect(candidate.byClientKey.get(secondClientKey)).toBe(candidate.lines[1]);
    input.reverse();
    expect(candidate.lines).toEqual([first, second]);
    expect(identity.getLineKey(first)).toBe(firstClientKey);
  });

  it("registers adopted identities and returns fresh snapshots without owning current state", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const clientKey = identity.newClientKey();
    const row = identity.tag({ id: "A", value: "Initial" }, clientKey);
    const first = snapshots.adopt([row]);
    expect(identity.getLineKey(first.lines[0])).toBe("A");
    const second = snapshots.adopt(first.lines);
    expect(second.lines).not.toBe(first.lines);
    expect(second.lines[0]).toBe(first.lines[0]);
    expect(first.clientKeys).toEqual([clientKey]);
    expect(second.clientKeys).toEqual(first.clientKeys);
  });

  it("finishes duplicate and ownership validation before registering any identities", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const firstClientKey = identity.newClientKey();
    const first = identity.tag({ id: 1, value: "First" }, firstClientKey);
    const alias = identity.tag({ id: "1", value: "Alias" }, identity.newClientKey());
    expect(() => snapshots.adopt([first, alias])).toThrow("Line IDs must be unique");
    expect(() => snapshots.adopt([first, first])).toThrow("Line IDs must be unique");
    const other = createLineItemsIdentity<Row>("id");
    const foreign = other.tag({ id: "B", value: "Foreign" }, other.newClientKey());
    expect(() => snapshots.adopt([first, foreign])).toThrow("does not belong");
    expect(identity.getLineKey(first)).toBe(firstClientKey);
  });

  it("uses the persisted-ID property bound at construction", () => {
    type Custom = { code?: number; value: string };
    const identity = createLineItemsIdentity<Custom>("code");
    const snapshots = createLineItemsSnapshots(identity, "code");
    const first = identity.tag({ code: 0, value: "First" }, identity.newClientKey());
    const alias = identity.tag({ code: 0, value: "Alias" }, identity.newClientKey());
    expect(() => snapshots.adopt([first, alias])).toThrow("Line IDs must be unique");
    const adopted = snapshots.adopt([first]);
    expect(identity.getLineKey(adopted.lines[0])).toBe("0");
  });
});
