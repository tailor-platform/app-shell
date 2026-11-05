import { describe, expect, it } from "vitest";
import { createLineItemsIdentity } from "./identity";
import { createLineItemsSnapshots } from "./snapshot";

type Row = { id?: string | number; value: string };

describe("document-bound snapshot factory", () => {
  it("constructs an immutable row view, order and key index without registering candidates", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const firstKey = identity.newKey();
    const secondKey = identity.newKey();
    const first = identity.tag({ id: 0, value: "First" }, firstKey);
    const second = identity.tag({ value: "Second" }, secondKey);
    const input = [first, second];
    const candidate = snapshots.create(input);
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(candidate.lines)).toBe(true);
    expect(Object.isFrozen(candidate.order)).toBe(true);
    expect(candidate.lines).not.toBe(input);
    expect(candidate.order).toEqual([firstKey, secondKey]);
    expect(candidate.byKey.get(firstKey)).toBe(candidate.lines[0]);
    expect(candidate.byKey.get(secondKey)).toBe(candidate.lines[1]);
    input.reverse();
    expect(candidate.lines).toEqual([first, second]);
    expect(identity.getLineKey(first)).toBe(firstKey);
  });

  it("registers adopted identities and returns fresh snapshots without owning current state", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const key = identity.newKey();
    const row = identity.tag({ id: "A", value: "Initial" }, key);
    const first = snapshots.adopt([row]);
    expect(identity.getLineKey(first.lines[0])).toBe("A");
    const second = snapshots.adopt(first.lines);
    expect(second.lines).not.toBe(first.lines);
    expect(second.lines[0]).toBe(first.lines[0]);
    expect(first.order).toEqual([key]);
    expect(second.order).toEqual(first.order);
  });

  it("finishes duplicate and ownership validation before registering any identities", () => {
    const identity = createLineItemsIdentity<Row>("id");
    const snapshots = createLineItemsSnapshots(identity, "id");
    const firstKey = identity.newKey();
    const first = identity.tag({ id: 1, value: "First" }, firstKey);
    const alias = identity.tag({ id: "1", value: "Alias" }, identity.newKey());
    expect(() => snapshots.adopt([first, alias])).toThrow("Line IDs must be unique");
    expect(() => snapshots.adopt([first, first])).toThrow("Line IDs must be unique");
    const other = createLineItemsIdentity<Row>("id");
    const foreign = other.tag({ id: "B", value: "Foreign" }, other.newKey());
    expect(() => snapshots.adopt([first, foreign])).toThrow("does not belong");
    expect(identity.getLineKey(first)).toBe(firstKey);
  });

  it("uses the server-ID property bound at construction", () => {
    type Custom = { code?: number; value: string };
    const identity = createLineItemsIdentity<Custom>("code");
    const snapshots = createLineItemsSnapshots(identity, "code");
    const first = identity.tag({ code: 0, value: "First" }, identity.newKey());
    const alias = identity.tag({ code: 0, value: "Alias" }, identity.newKey());
    expect(() => snapshots.adopt([first, alias])).toThrow("Line IDs must be unique");
    const adopted = snapshots.adopt([first]);
    expect(identity.getLineKey(adopted.lines[0])).toBe("0");
  });
});
