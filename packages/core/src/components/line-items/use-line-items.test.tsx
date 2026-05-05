import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createLineItemHelper } from "./field";
import { useLineItems } from "./use-line-items";
import type { LineItemsField, LineItemsRowData } from "./types";

afterEach(() => {
  cleanup();
});

type DemoLine = LineItemsRowData & {
  sku: string;
  qty: number;
  unitPrice: number;
  note: string;
};

const f = createLineItemHelper<DemoLine>();

const fields: LineItemsField<DemoLine>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
  }),
  f.field({
    key: "qty",
    label: "Qty",
    render: (l) => l.qty,
    editable: ["edit", "amend"],
    type: { kind: "number", decimals: 0 },
  }),
  f.field({
    key: "unitPrice",
    label: "Unit price",
    render: (l) => l.unitPrice,
    editable: ["edit"],
    type: { kind: "number", decimals: 2 },
  }),
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    commit: "metadata",
  }),
];

const seed = (): DemoLine[] => [
  { lineRef: "a", sku: "X", qty: 1, unitPrice: 10, note: "" },
  { lineRef: "b", sku: "Y", qty: 2, unitPrice: 20, note: "" },
];

describe("useLineItems", () => {
  it("seeds rows and reports a clean baseline", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    expect(result.current.allLines).toHaveLength(2);
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.getChangeSet().lineChanges).toEqual([]);
  });

  it("addLine returns the new lineRef and marks dirty", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    let newRef = "";
    act(() => {
      newRef = result.current.addLine({ sku: "Z", qty: 3, unitPrice: 30, note: "" });
    });
    expect(newRef).toBeTruthy();
    expect(result.current.allLines).toHaveLength(3);
    expect(result.current.isDirty).toBe(true);
    const cs = result.current.getChangeSet();
    expect(cs.lineChanges.some((c) => c.action === "add" && c.lineRef === newRef)).toBe(true);
  });

  it("updateField writes a single cell and shows up as an update in the change set", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.updateField("a", "qty", 5);
    });
    expect(result.current.isDirty).toBe(true);
    const cs = result.current.getChangeSet();
    expect(cs.lineChanges).toEqual([{ action: "update", lineRef: "a", patch: { qty: 5 } }]);
  });

  it("updateLines applies batched patches in one render", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.updateLines([
        { lineRef: "a", patch: { qty: 7 } },
        { lineRef: "b", patch: { qty: 9 } },
      ]);
    });
    const cs = result.current.getChangeSet();
    expect(cs.lineChanges).toEqual([
      { action: "update", lineRef: "a", patch: { qty: 7 } },
      { action: "update", lineRef: "b", patch: { qty: 9 } },
    ]);
  });

  it("removeLine emits a remove change", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.removeLine("a");
    });
    expect(result.current.allLines).toHaveLength(1);
    expect(result.current.getChangeSet().lineChanges).toEqual([{ action: "remove", lineRef: "a" }]);
  });

  it("reorderLine emits a move change in manual ordering", () => {
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({ fields, data: seed(), ordering: "manual" }),
    );
    act(() => {
      result.current.reorderLine("a", "b");
    });
    expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["b", "a"]);
    const cs = result.current.getChangeSet();
    expect(cs.lineChanges.some((c) => c.action === "move" && c.lineRef === "a")).toBe(true);
  });

  it("reorderLine is a no-op in sort ordering", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.reorderLine("a", "b");
    });
    expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["a", "b"]);
  });

  it("isDirty toggles back to false after reset()", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.updateField("a", "qty", 99);
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.getChangeSet().lineChanges).toEqual([]);
  });

  it("filter narrows `lines` but keeps `allLines` unchanged", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      result.current.setFilter("X");
    });
    expect(result.current.lines.map((l) => l.lineRef)).toEqual(["a"]);
    expect(result.current.allLines).toHaveLength(2);
  });

  it("selectAllVisible only selects filtered rows", () => {
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({ fields, data: seed(), selection: true }),
    );
    act(() => {
      result.current.setFilter("X");
    });
    act(() => {
      result.current.selectAllVisible();
    });
    expect(result.current.selectedIds).toEqual(["a"]);
  });

  it("toggleSelect adds and removes ids; clearSelection empties them", () => {
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({ fields, data: seed(), selection: true }),
    );
    act(() => {
      result.current.toggleSelect("a");
      result.current.toggleSelect("b");
    });
    expect(new Set(result.current.selectedIds)).toEqual(new Set(["a", "b"]));
    act(() => {
      result.current.toggleSelect("a");
    });
    expect(result.current.selectedIds).toEqual(["b"]);
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedIds).toEqual([]);
  });

  it("bulkUpdate applies the patch to every selected row", () => {
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({ fields, data: seed(), selection: true }),
    );
    act(() => {
      result.current.toggleSelect("a");
      result.current.toggleSelect("b");
    });
    act(() => {
      result.current.bulkUpdate({ qty: 100 });
    });
    expect(result.current.allLines.map((l) => l.qty)).toEqual([100, 100]);
  });

  it("bulkRemove removes every selected row", () => {
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({ fields, data: seed(), selection: true }),
    );
    act(() => {
      result.current.toggleSelect("a");
    });
    act(() => {
      result.current.bulkRemove();
    });
    expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["b"]);
    expect(result.current.selectedIds).toEqual([]);
  });

  it("metadata fields do NOT show up in the change set", () => {
    const events: { lineRef: string; patch: Record<string, unknown> }[] = [];
    const { result } = renderHook(() =>
      useLineItems<DemoLine>({
        fields,
        data: seed(),
        onMetadataCommit: (e) => {
          events.push({ lineRef: e.lineRef, patch: e.patch });
        },
      }),
    );
    act(() => {
      result.current.updateField("a", "note", "hello");
    });
    // Metadata commit fires as a per-cell delta…
    expect(events).toEqual([{ lineRef: "a", patch: { note: "hello" } }]);
    // …and is excluded from the document change set.
    expect(result.current.getChangeSet().lineChanges).toEqual([]);
    // But isDirty still tracks the row state vs baseline; metadata edits don't dirty
    // the document, so the document is still clean here.
    expect(result.current.isDirty).toBe(false);
  });

  it("number fields normalize cosmetic edits as no-ops", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    act(() => {
      // Re-write the same numeric value as a string with extra precision; the
      // adapter normalizes both sides so the change set stays empty.
      result.current.updateField("a", "qty", Number("1.0") as DemoLine["qty"]);
    });
    expect(result.current.getChangeSet().lineChanges).toEqual([]);
    expect(result.current.isDirty).toBe(false);
  });

  it("duplicateLastLine appends a copy with a new lineRef", () => {
    const { result } = renderHook(() => useLineItems<DemoLine>({ fields, data: seed() }));
    let newRef: string | undefined;
    act(() => {
      newRef = result.current.duplicateLastLine();
    });
    expect(newRef).toBeTruthy();
    expect(result.current.allLines).toHaveLength(3);
    const last = result.current.allLines.at(-1)!;
    expect(last.lineRef).toBe(newRef);
    expect(last.sku).toBe("Y");
  });
});
