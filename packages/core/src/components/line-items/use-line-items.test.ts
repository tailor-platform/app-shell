import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { createLineItemHelper } from "./field";
import type { LineItemsField, LineItemsMode, UseLineItemsOptions } from "./types";
import { useLineItems } from "./use-line-items";

type Line = {
  lineRef: string;
  sku: string;
  quantity: number;
  total: number;
};

const f = createLineItemHelper<Line>();

const fields: LineItemsField<Line>[] = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    sort: { comparator: (a, b) => a.quantity - b.quantity },
  }),
  f.field({ key: "total", label: "Total", render: (l) => l.total.toFixed(2) }),
];

const seed: Line[] = [
  { lineRef: "1", sku: "APPLE-01", quantity: 2, total: 10 },
  { lineRef: "2", sku: "BANANA-02", quantity: 5, total: 25 },
];

function setup(options?: Partial<UseLineItemsOptions<Line>>) {
  return renderHook(() =>
    useLineItems<Line>({ fields, defaultLines: seed, selection: true, ...options }),
  );
}

describe("useLineItems", () => {
  it("seeds lines from data and starts clean", () => {
    const { result } = setup();
    expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.getChangeSet().isEmpty).toBe(true);
  });

  it("generates a lineRef for rows that arrive without one", () => {
    const { result } = setup({
      defaultLines: [{ sku: "NO-REF", quantity: 1, total: 0 } as unknown as Line],
    });
    expect(result.current.allLines[0]?.lineRef).toBeTruthy();
  });

  describe("mutations", () => {
    it("adds a line and reports it as an add op", () => {
      const { result } = setup();
      let newRef = "";
      act(() => {
        newRef = result.current.addLine({ sku: "CHERRY-03", quantity: 1 });
      });

      expect(result.current.allLines).toHaveLength(3);
      expect(result.current.isDirty).toBe(true);
      expect(result.current.getChangeSet().lineChanges).toContainEqual({
        action: "add",
        tempId: newRef,
        data: { sku: "CHERRY-03", quantity: 1 },
      });
    });

    it("adds many lines in one batch, producing one add op each", () => {
      const { result } = setup();
      act(() => {
        result.current.addLines([{ sku: "A" }, { sku: "B" }, { sku: "C" }]);
      });

      expect(result.current.allLines).toHaveLength(5);
      const adds = result.current.getChangeSet().lineChanges.filter((c) => c.action === "add");
      expect(adds).toHaveLength(3);
    });

    it("inserts after a given line when asked", () => {
      const { result } = setup();
      act(() => {
        result.current.addLine({ sku: "MIDDLE" }, { afterLineRef: "1" });
      });
      expect(result.current.allLines.map((l) => l.sku)).toEqual([
        "APPLE-01",
        "MIDDLE",
        "BANANA-02",
      ]);
    });

    it("prepends when afterLineRef is null", () => {
      const { result } = setup();
      act(() => {
        result.current.addLine({ sku: "FIRST" }, { afterLineRef: null });
      });
      expect(result.current.allLines[0]?.sku).toBe("FIRST");
    });

    it("updates a field and reports only that field", () => {
      const { result } = setup();
      act(() => {
        result.current.updateField("1", "quantity", 9);
      });

      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "update", lineId: "1", patch: { quantity: 9 } },
      ]);
    });

    it("removes a persisted line as a remove op", () => {
      const { result } = setup();
      act(() => {
        result.current.removeLine("2");
      });

      expect(result.current.allLines).toHaveLength(1);
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "remove", lineId: "2" },
      ]);
    });

    it("removing a freshly added line leaves no trace in the change-set", () => {
      const { result } = setup();
      let ref = "";
      act(() => {
        ref = result.current.addLine({ sku: "TEMP" });
      });
      act(() => {
        result.current.removeLine(ref);
      });

      expect(result.current.getChangeSet().isEmpty).toBe(true);
      expect(result.current.isDirty).toBe(false);
    });

    it("applies batched updates in a single commit", () => {
      const { result } = setup();
      act(() => {
        result.current.updateLines([
          { lineRef: "1", patch: { quantity: 11 } },
          { lineRef: "2", patch: { quantity: 22 } },
        ]);
      });

      const changes = result.current.getChangeSet().lineChanges;
      expect(changes).toHaveLength(2);
      expect(changes.every((c) => c.action === "update")).toBe(true);
    });

    it("duplicates the last line as a new add", () => {
      const { result } = setup();
      act(() => {
        result.current.duplicateLastLine();
      });

      expect(result.current.allLines).toHaveLength(3);
      expect(result.current.allLines[2]?.sku).toBe("BANANA-02");
      expect(result.current.allLines[2]?.lineRef).not.toBe("2");
    });
  });

  describe("ordering", () => {
    it("ignores reorderLine under sort ordering", () => {
      const { result } = setup({ ordering: "sort" });
      act(() => {
        result.current.reorderLine("2", null);
      });
      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("moves a line and emits reorder ops under manual ordering", () => {
      const { result } = setup({ ordering: "manual" });
      act(() => {
        result.current.reorderLine("2", null);
      });

      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["2", "1"]);
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "reorder", lineId: "2", position: 0 },
        { action: "reorder", lineId: "1", position: 1 },
      ]);
    });

    it("emits nothing when a line is moved back to where it started", () => {
      const { result } = setup({ ordering: "manual" });
      act(() => {
        result.current.reorderLine("1", "2");
      });
      act(() => {
        result.current.reorderLine("1", null);
      });

      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2"]);
      expect(result.current.getChangeSet().isEmpty).toBe(true);
    });
  });

  describe("sort", () => {
    it("starts unsorted, in document order", () => {
      const { result } = setup();
      expect(result.current.sortState).toBeNull();
      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("cycles ascending, descending, then back to document order", () => {
      const { result } = setup();

      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.sortState).toEqual({ columnId: "quantity", direction: "asc" });
      expect(result.current.lines.map((l) => l.quantity)).toEqual([2, 5]);

      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.sortState).toEqual({ columnId: "quantity", direction: "desc" });
      expect(result.current.lines.map((l) => l.quantity)).toEqual([5, 2]);

      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.sortState).toBeNull();
      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("leaves allLines in document order while sorted", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSort("quantity");
        result.current.toggleSort("quantity");
      });
      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["2", "1"]);
      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("ignores a column with no comparator", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSort("total");
      });
      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("is inert under manual ordering, which owns row order", () => {
      const { result } = setup({ ordering: "manual" });
      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.sortState).toBeNull();
      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["1", "2"]);
    });

    it("does not make the document dirty", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.getChangeSet().isEmpty).toBe(true);
    });
  });

  describe("baseline", () => {
    it("reset snaps the baseline forward and clears dirty", () => {
      const { result } = setup();
      act(() => {
        result.current.updateField("1", "quantity", 9);
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.allLines[0]?.quantity).toBe(9);
    });

    it("revert restores rows and drops inserts and removals", () => {
      const { result } = setup();
      act(() => {
        result.current.updateField("1", "quantity", 9);
        result.current.addLine({ sku: "TEMP" });
        result.current.removeLine("2");
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.revert();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2"]);
      expect(result.current.allLines[0]?.quantity).toBe(2);
    });
  });

  describe("filter", () => {
    it("narrows lines by the searchable fields but leaves allLines intact", () => {
      const { result } = setup();
      act(() => {
        result.current.setFilter("banana");
      });

      expect(result.current.lines.map((l) => l.lineRef)).toEqual(["2"]);
      expect(result.current.allLines).toHaveLength(2);
    });

    it("returns everything for a blank query", () => {
      const { result } = setup();
      act(() => {
        result.current.setFilter("   ");
      });
      expect(result.current.lines).toHaveLength(2);
    });
  });

  describe("selection", () => {
    it("toggles a row on and off", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toEqual(["1"]);

      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toEqual([]);
    });

    it("ignores selection when disabled", () => {
      const { result } = setup({ selection: false });
      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toEqual([]);
    });

    it("selects only the rows passing the filter", () => {
      const { result } = setup();
      act(() => {
        result.current.setFilter("banana");
      });
      act(() => {
        result.current.selectAllVisible();
      });
      expect(result.current.selectedIds).toEqual(["2"]);
    });

    it("bulk-updates every selected row", () => {
      const { result } = setup();
      act(() => {
        result.current.selectAllVisible();
      });
      act(() => {
        result.current.bulkUpdate({ quantity: 42 });
      });

      expect(result.current.allLines.every((l) => l.quantity === 42)).toBe(true);
    });

    it("bulk-removes every selected row and clears the selection", () => {
      const { result } = setup();
      act(() => {
        result.current.selectAllVisible();
      });
      act(() => {
        result.current.bulkRemove();
      });

      expect(result.current.allLines).toEqual([]);
      expect(result.current.selectedIds).toEqual([]);
    });

    it("drops a removed row from the selection", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSelect("2");
      });
      act(() => {
        result.current.removeLine("2");
      });
      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe("controlled mode", () => {
    /** The usual `lines` + `onLinesChange` loop, with the parent echoing every change. */
    function renderRoundTrip() {
      return renderHook(() => {
        const [lines, setLines] = React.useState<Line[]>(seed);
        return useLineItems<Line>({ fields, lines, onLinesChange: setLines });
      });
    }

    it("keeps an added line in the change-set after the parent echoes it back", () => {
      const { result } = renderRoundTrip();
      act(() => void result.current.addLine({ sku: "NEW-01", quantity: 1, total: 0 }));

      expect(result.current.allLines).toHaveLength(3);
      expect(result.current.isDirty).toBe(true);
      expect(result.current.getChangeSet().lineChanges.map((c) => c.action)).toEqual(["add"]);
    });

    it("keeps a removed line in the change-set after the parent echoes it back", () => {
      const { result } = renderRoundTrip();
      act(() => result.current.removeLine("2"));

      expect(result.current.isDirty).toBe(true);
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "remove", lineId: "2" },
      ]);
    });

    it("notifies the parent once per mutation", () => {
      const onLinesChange = vi.fn();
      const { result } = renderHook(() =>
        useLineItems<Line>({ fields, lines: seed, onLinesChange }),
      );

      expect(onLinesChange).not.toHaveBeenCalled();

      act(() => {
        result.current.updateField("1", "quantity", 3);
      });

      expect(onLinesChange).toHaveBeenCalledTimes(1);
      expect(onLinesChange.mock.calls[0]?.[0]?.[0]?.quantity).toBe(3);
    });

    it("re-seeds when the set of lineRefs changes", () => {
      const { result, rerender } = renderHook(
        ({ lines }: { lines: Line[] }) => useLineItems<Line>({ fields, lines }),
        { initialProps: { lines: seed } },
      );

      rerender({ lines: [...seed, { lineRef: "3", sku: "CHERRY-03", quantity: 1, total: 5 }] });

      expect(result.current.allLines.map((l) => l.lineRef)).toEqual(["1", "2", "3"]);
      expect(result.current.isDirty).toBe(false);
    });

    it("keeps local edits when the parent re-renders with the same lineRefs", () => {
      const { result, rerender } = renderHook(
        ({ lines }: { lines: Line[] }) => useLineItems<Line>({ fields, lines }),
        { initialProps: { lines: seed } },
      );

      act(() => {
        result.current.updateField("1", "quantity", 99);
      });
      rerender({ lines: [...seed] });

      expect(result.current.allLines[0]?.quantity).toBe(99);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("mode", () => {
    it("defaults to edit and follows the prop", () => {
      const { result, rerender } = renderHook(
        ({ mode }: { mode: LineItemsMode }) =>
          useLineItems<Line>({ fields, defaultLines: seed, mode }),
        { initialProps: { mode: "edit" as LineItemsMode } },
      );
      expect(result.current.mode).toBe("edit");

      rerender({ mode: "view" });
      expect(result.current.mode).toBe("view");
    });

    it("can be driven imperatively", () => {
      const { result } = setup();
      act(() => {
        result.current.setMode("view");
      });
      expect(result.current.mode).toBe("view");
    });
  });
});
