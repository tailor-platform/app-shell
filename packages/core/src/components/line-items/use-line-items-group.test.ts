import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createLineItemHelper } from "./field";
import type { LineItemsField } from "./types";
import { useLineItems } from "./use-line-items";
import { useLineItemsGroup } from "./use-line-items-group";

type JournalLine = { lineRef: string; account: string; amount: number };

const f = createLineItemHelper<JournalLine>();

const fields: LineItemsField<JournalLine>[] = [
  f.field({
    key: "account",
    label: "Account",
    render: (l) => l.account,
    editable: ["edit"],
    type: { kind: "text" },
  }),
  f.field({
    key: "amount",
    label: "Amount",
    render: (l) => l.amount,
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
  }),
];

function setup() {
  return renderHook(() => {
    const debits = useLineItems<JournalLine>({
      fields,
      data: [{ lineRef: "d1", account: "Cash", amount: 100 }],
    });
    const credits = useLineItems<JournalLine>({
      fields,
      data: [{ lineRef: "c1", account: "Receivables", amount: 100 }],
    });
    return { debits, credits, group: useLineItemsGroup({ debits, credits }) };
  });
}

describe("useLineItemsGroup", () => {
  it("is dirty when any member is dirty", () => {
    const { result } = setup();
    expect(result.current.group.isDirty).toBe(false);

    act(() => result.current.debits.updateField("d1", "amount", 200));
    expect(result.current.group.isDirty).toBe(true);
  });

  it("returns each member's change-set keyed by name, with isEmpty rolled up", () => {
    const { result } = setup();
    let cs = result.current.group.getChangeSet();
    expect(cs.isEmpty).toBe(true);
    expect(cs.changeSets.debits.lineChanges).toEqual([]);
    expect(cs.changeSets.credits.lineChanges).toEqual([]);

    act(() => result.current.credits.updateField("c1", "amount", 250));
    cs = result.current.group.getChangeSet();
    expect(cs.isEmpty).toBe(false);
    expect(cs.changeSets.debits.isEmpty).toBe(true);
    expect(cs.changeSets.credits.lineChanges).toEqual([
      { action: "update", lineId: "c1", patch: { amount: 250 } },
    ]);
  });

  it("does not let a member named isEmpty clobber the rolled-up flag", () => {
    const { result } = renderHook(() => {
      const isEmpty = useLineItems<JournalLine>({
        fields,
        data: [{ lineRef: "x1", account: "Cash", amount: 1 }],
      });
      return { isEmpty, group: useLineItemsGroup({ isEmpty }) };
    });
    act(() => result.current.isEmpty.updateField("x1", "amount", 2));

    const cs = result.current.group.getChangeSet();
    expect(cs.isEmpty).toBe(false);
    expect(cs.changeSets.isEmpty.isEmpty).toBe(false);
  });

  it("revert() rolls back every member", () => {
    const { result } = setup();
    act(() => {
      result.current.debits.updateField("d1", "amount", 999);
      result.current.credits.updateField("c1", "amount", 999);
    });
    expect(result.current.group.isDirty).toBe(true);

    act(() => result.current.group.revert());
    expect(result.current.group.isDirty).toBe(false);
    expect(result.current.debits.allLines[0]!.amount).toBe(100);
    expect(result.current.credits.allLines[0]!.amount).toBe(100);
  });

  it("reset() snaps every member's baseline forward", () => {
    const { result } = setup();
    act(() => {
      result.current.debits.updateField("d1", "amount", 300);
      result.current.credits.updateField("c1", "amount", 300);
    });

    act(() => result.current.group.reset());
    expect(result.current.group.isDirty).toBe(false);
    expect(result.current.group.getChangeSet().isEmpty).toBe(true);
    expect(result.current.debits.allLines[0]!.amount).toBe(300);
  });
});
