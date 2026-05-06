import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createLineItemHelper } from "./field";
import { useLineItems } from "./use-line-items";
import { useLineItemsGroup } from "./use-line-items-group";
import type { LineItemsField, LineItemsRowData } from "./types";

afterEach(() => {
  cleanup();
});

type JLine = LineItemsRowData & { account: string; amount: number };

const f = createLineItemHelper<JLine>();
const fields: LineItemsField<JLine>[] = [
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

const seedDebits = (): JLine[] => [{ lineRef: "d1", account: "Cash", amount: 100 }];
const seedCredits = (): JLine[] => [{ lineRef: "c1", account: "AR", amount: 100 }];

describe("useLineItemsGroup", () => {
  it("aggregates isDirty across members", () => {
    const { result } = renderHook(() => {
      const debits = useLineItems<JLine>({ fields, data: seedDebits() });
      const credits = useLineItems<JLine>({ fields, data: seedCredits() });
      const group = useLineItemsGroup({ debits, credits });
      return { debits, credits, group };
    });

    expect(result.current.group.isDirty).toBe(false);

    act(() => {
      result.current.debits.updateField("d1", "amount", 200);
    });
    expect(result.current.group.isDirty).toBe(true);
  });

  it("getChangeSet returns a keyed bundle with isEmpty rolled up", () => {
    const { result } = renderHook(() => {
      const debits = useLineItems<JLine>({ fields, data: seedDebits() });
      const credits = useLineItems<JLine>({ fields, data: seedCredits() });
      return { debits, credits, group: useLineItemsGroup({ debits, credits }) };
    });

    let cs = result.current.group.getChangeSet();
    expect(cs.isEmpty).toBe(true);
    expect(cs.debits.lineChanges).toEqual([]);
    expect(cs.credits.lineChanges).toEqual([]);

    act(() => {
      result.current.credits.updateField("c1", "amount", 250);
    });
    cs = result.current.group.getChangeSet();
    expect(cs.isEmpty).toBe(false);
    expect(cs.debits.isEmpty).toBe(true);
    expect(cs.credits.lineChanges).toEqual([
      { action: "update", lineId: "c1", patch: { amount: 250 } },
    ]);
  });

  it("revert() rolls back every member", () => {
    const { result } = renderHook(() => {
      const debits = useLineItems<JLine>({ fields, data: seedDebits() });
      const credits = useLineItems<JLine>({ fields, data: seedCredits() });
      return { debits, credits, group: useLineItemsGroup({ debits, credits }) };
    });

    act(() => {
      result.current.debits.updateField("d1", "amount", 999);
      result.current.credits.updateField("c1", "amount", 999);
    });
    expect(result.current.group.isDirty).toBe(true);

    act(() => {
      result.current.group.revert();
    });
    expect(result.current.group.isDirty).toBe(false);
    expect(result.current.debits.allLines[0]!.amount).toBe(100);
    expect(result.current.credits.allLines[0]!.amount).toBe(100);
  });
});
