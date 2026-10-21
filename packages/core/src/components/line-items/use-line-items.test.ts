import { act, renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { createLineItemHelper } from "./field";
import type { LineItemsField, LineItemsMode, UseLineItemsOptions } from "./types";
import { useLineItems } from "./use-line-items";

type Line = {
  id?: string;
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
  { id: "1", sku: "APPLE-01", quantity: 2, total: 10 },
  { id: "2", sku: "BANANA-02", quantity: 5, total: 25 },
];

function setup(
  options?: Pick<UseLineItemsOptions<Line>, "rowSelection" | "mode" | "ordering"> & {
    defaultLines?: readonly Line[];
  },
) {
  return renderHook(() =>
    useLineItems<Line>({ fields, defaultLines: seed, rowSelection: {}, ...options }),
  );
}

describe("useLineItems", () => {
  it("seeds lines from data and starts clean", () => {
    const { result } = setup();
    expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2"]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.getChangeSet().isEmpty).toBe(true);
  });

  it("treats a line that arrives without an id as new", () => {
    const { result } = setup({ defaultLines: [{ sku: "NO-ID", quantity: 1, total: 0 }] });
    const line = result.current.allLines[0]!;

    expect(line.id).toBeUndefined();
    expect(result.current.isNewLine(line)).toBe(true);
    expect(result.current.getLineKey(line)).toBeTruthy();
    expect(result.current.getChangeSet().lineChanges).toEqual([
      expect.objectContaining({ action: "add", tempId: result.current.getLineKey(line) }),
    ]);
  });

  it("reads the id from idKey", () => {
    type Keyed = { lineNo: number; sku: string; quantity: number; total: number };
    const { result } = renderHook(() =>
      useLineItems<Keyed>({
        fields: fields as unknown as UseLineItemsOptions<Keyed>["fields"],
        idKey: "lineNo",
        defaultLines: [{ lineNo: 10, sku: "A", quantity: 1, total: 0 }],
      }),
    );
    act(() => result.current.updateField("10", "quantity", 2));

    expect(result.current.getChangeSet().lineChanges).toEqual([
      { action: "update", lineId: "10", patch: { quantity: 2 } },
    ]);
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
        line: { sku: "CHERRY-03", quantity: 1 },
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
        result.current.addLine({ sku: "MIDDLE" }, { afterLineKey: "1" });
      });
      expect(result.current.allLines.map((l) => l.sku)).toEqual([
        "APPLE-01",
        "MIDDLE",
        "BANANA-02",
      ]);
    });

    it("prepends when afterLineKey is null", () => {
      const { result } = setup();
      act(() => {
        result.current.addLine({ sku: "FIRST" }, { afterLineKey: null });
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
          { lineKey: "1", patch: { quantity: 11 } },
          { lineKey: "2", patch: { quantity: 22 } },
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
      expect(result.current.allLines[2]?.id).toBeUndefined();
    });
  });

  describe("ordering", () => {
    it("ignores reorderLine under sort ordering", () => {
      const { result } = setup({ ordering: "sort" });
      act(() => {
        result.current.reorderLine("2", null);
      });
      expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2"]);
    });

    it("moves a line and emits reorder ops under manual ordering", () => {
      const { result } = setup({ ordering: "manual" });
      act(() => {
        result.current.reorderLine("2", null);
      });

      expect(result.current.allLines.map((l) => l.id)).toEqual(["2", "1"]);
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

      expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2"]);
      expect(result.current.getChangeSet().isEmpty).toBe(true);
    });
  });

  describe("sort", () => {
    it("starts unsorted, in document order", () => {
      const { result } = setup();
      expect(result.current.sortState).toBeNull();
      expect(result.current.lines.map((l) => l.id)).toEqual(["1", "2"]);
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
      expect(result.current.lines.map((l) => l.id)).toEqual(["1", "2"]);
    });

    it("leaves allLines in document order while sorted", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSort("quantity");
        result.current.toggleSort("quantity");
      });
      expect(result.current.lines.map((l) => l.id)).toEqual(["2", "1"]);
      expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2"]);
    });

    it("ignores a column with no comparator", () => {
      const { result } = setup();
      act(() => {
        result.current.toggleSort("total");
      });
      expect(result.current.lines.map((l) => l.id)).toEqual(["1", "2"]);
    });

    it("is inert under manual ordering, which owns row order", () => {
      const { result } = setup({ ordering: "manual" });
      act(() => {
        result.current.toggleSort("quantity");
      });
      expect(result.current.sortState).toBeNull();
      expect(result.current.lines.map((l) => l.id)).toEqual(["1", "2"]);
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
      expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2"]);
      expect(result.current.allLines[0]?.quantity).toBe(2);
    });

    it("never writes a temp key into the line's id", () => {
      const { result } = setup();
      act(() => {
        result.current.addLine({ id: "should-be-dropped", sku: "NEW" });
      });
      const added = result.current.allLines[2]!;

      expect(added.id).toBeUndefined();
      expect(result.current.isNewLine(added)).toBe(true);
      expect(JSON.stringify(added)).not.toContain(result.current.getLineKey(added));
    });

    it("reset(savedLines) takes the server's lines, ids and values", () => {
      const { result } = setup();
      act(() => {
        result.current.addLine({ sku: "NEW", quantity: 1, total: 0 });
      });

      act(() => {
        result.current.reset([...seed, { id: "77", sku: "NEW", quantity: 1, total: 4 }]);
      });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.allLines[2]).toMatchObject({ id: "77", total: 4 });

      act(() => {
        result.current.updateField("77", "quantity", 3);
      });
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "update", lineId: "77", patch: { quantity: 3 } },
      ]);
    });

    it("reset({ idMap }) re-keys new lines with their server ids", () => {
      const { result } = setup();
      let tempId = "";
      act(() => {
        tempId = result.current.addLine({ sku: "NEW", quantity: 1, total: 0 });
      });
      expect(result.current.getChangeSet().lineChanges[0]).toMatchObject({ tempId });

      act(() => {
        result.current.reset({ idMap: { [tempId]: 501 } });
      });
      const saved = result.current.allLines[2]!;
      expect(saved.id).toBe(501);
      expect(result.current.isNewLine(saved)).toBe(false);
      expect(result.current.getLineKey(saved)).toBe("501");

      act(() => {
        result.current.removeLine("501");
      });
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "remove", lineId: "501" },
      ]);
    });

    it("warns when reset() leaves new lines on temp keys", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = setup();
      act(() => {
        result.current.addLine({ sku: "NEW" });
      });
      act(() => {
        result.current.reset();
      });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("reset(savedLines)"));
      warn.mockRestore();
    });

    it("hasUnsavedChanges is false straight after reset, before a re-render", () => {
      const { result } = setup();
      act(() => {
        result.current.updateField("1", "quantity", 9);
      });
      const api = result.current;
      expect(api.hasUnsavedChanges()).toBe(true);

      let readInSameTick: boolean | undefined;
      act(() => {
        api.reset();
        readInSameTick = api.hasUnsavedChanges();
      });
      expect(readInSameTick).toBe(false);
    });
  });

  describe("metadata fields", () => {
    type Memo = Line & { memo?: string };
    const memoFields = [
      ...fields,
      createLineItemHelper<Memo>().field({
        key: "memo",
        label: "Memo",
        render: (l) => l.memo,
        editable: ["edit"],
        commit: "metadata",
        type: { kind: "text" },
      }),
    ] as LineItemsField<Memo>[];

    it("sends a new line's metadata with its add, not through onMetadataCommit", () => {
      const onMetadataCommit = vi.fn();
      const { result } = renderHook(() =>
        useLineItems<Memo>({ fields: memoFields, defaultLines: seed, onMetadataCommit }),
      );
      let key = "";
      act(() => {
        key = result.current.addLine({ sku: "NEW", quantity: 1, total: 0 });
      });
      act(() => {
        result.current.updateField(key, "memo", "rush");
      });

      expect(onMetadataCommit).not.toHaveBeenCalled();
      expect(result.current.getChangeSet().lineChanges[0]).toMatchObject({
        action: "add",
        data: { memo: "rush" },
      });
    });

    it("commits a saved line's metadata out-of-band, and Discard leaves it", () => {
      const onMetadataCommit = vi.fn();
      const { result } = renderHook(() =>
        useLineItems<Memo>({ fields: memoFields, defaultLines: seed, onMetadataCommit }),
      );
      act(() => {
        result.current.updateField("1", "memo", "checked");
        result.current.updateField("1", "quantity", 9);
      });
      expect(onMetadataCommit).toHaveBeenCalledWith(
        expect.objectContaining({ lineId: "1", patch: { memo: "checked" } }),
      );

      act(() => {
        result.current.revert();
      });
      expect(result.current.allLines[0]).toMatchObject({ quantity: 2, memo: "checked" });
    });

    it("warns when a metadata field has no onMetadataCommit", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderHook(() => useLineItems<Memo>({ fields: memoFields, defaultLines: seed }));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("onMetadataCommit"));
      warn.mockRestore();
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
      const { result } = setup({ rowSelection: undefined });
      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toEqual([]);
    });

    it("bulk-updates every selected row", () => {
      const { result } = setup();
      act(() => {
        result.current.selectAll();
      });
      act(() => {
        result.current.bulkUpdate({ quantity: 42 });
      });

      expect(result.current.allLines.every((l) => l.quantity === 42)).toBe(true);
    });

    it("bulk-removes every selected row and clears the selection", () => {
      const { result } = setup();
      act(() => {
        result.current.selectAll();
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

    it("seeds from defaultSelectedIds and reports changes", () => {
      const onChange = vi.fn();
      const { result } = setup({ rowSelection: { defaultSelectedIds: ["2"], onChange } });
      expect(result.current.selectedIds).toEqual(["2"]);

      act(() => {
        result.current.toggleSelect("1");
      });
      expect(result.current.selectedIds).toEqual(["1", "2"]);
      expect(onChange).toHaveBeenLastCalledWith(["2", "1"]);
    });

    it("follows controlled selectedIds and only asks onChange to move them", () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ selectedIds }: { selectedIds: string[] }) =>
          useLineItems<Line>({
            fields,
            defaultLines: seed,
            rowSelection: { selectedIds, onChange },
          }),
        { initialProps: { selectedIds: ["1"] } },
      );

      act(() => {
        result.current.toggleSelect("2");
      });
      // The owner hasn't committed yet, so the value stays put.
      expect(result.current.selectedIds).toEqual(["1"]);
      expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);

      rerender({ selectedIds: ["1", "2"] });
      expect(result.current.selectedIds).toEqual(["1", "2"]);
    });
  });

  describe("controlled mode", () => {
    it("requires onLinesChange alongside lines at the type level", () => {
      // @ts-expect-error — `lines` without `onLinesChange` would silently drop every edit.
      const options: UseLineItemsOptions<Line> = { fields, lines: seed };
      expect(options.fields).toBe(fields);
    });

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

    it("re-baselines when the set of lines changes", () => {
      const { result, rerender } = renderHook(
        ({ lines }: { lines: Line[] }) =>
          useLineItems<Line>({ fields, lines, onLinesChange: () => {} }),
        { initialProps: { lines: seed } },
      );

      rerender({ lines: [...seed, { id: "3", sku: "CHERRY-03", quantity: 1, total: 5 }] });

      expect(result.current.allLines.map((l) => l.id)).toEqual(["1", "2", "3"]);
      expect(result.current.isDirty).toBe(false);
    });

    it("keeps local edits through the parent's echo", () => {
      const { result } = renderRoundTrip();

      act(() => {
        result.current.updateField("1", "quantity", 99);
      });

      expect(result.current.allLines[0]?.quantity).toBe(99);
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "update", lineId: "1", patch: { quantity: 99 } },
      ]);
    });

    it("adopts new values for the same lines without moving the baseline", () => {
      const { result, rerender } = renderHook(
        ({ lines }: { lines: Line[] }) =>
          useLineItems<Line>({ fields, lines, onLinesChange: () => {} }),
        { initialProps: { lines: seed } },
      );

      // The parent recalculates totals, say after a currency change.
      rerender({ lines: seed.map((l) => ({ ...l, total: l.total * 2 })) });
      expect(result.current.allLines.map((l) => l.total)).toEqual([20, 50]);
      // `total` is read-only, so nothing is dirty…
      expect(result.current.isDirty).toBe(false);

      // …while a parent-side change to an editable field diffs against the baseline.
      rerender({ lines: seed.map((l) => (l.id === "1" ? { ...l, quantity: 7 } : l)) });
      expect(result.current.getChangeSet().lineChanges).toEqual([
        { action: "update", lineId: "1", patch: { quantity: 7 } },
      ]);
    });

    it("keeps a new line's key when the parent echoes copies of the lines", () => {
      const { result } = renderHook(() => {
        const [lines, setLines] = React.useState<Line[]>(seed);
        // Copies every line, as a parent mapping over its rows would.
        return useLineItems<Line>({
          fields,
          lines,
          onLinesChange: (next) => setLines(next.map((l) => ({ ...l }))),
        });
      });

      let key = "";
      act(() => {
        key = result.current.addLine({ sku: "NEW", quantity: 1, total: 0 });
      });
      act(() => {
        result.current.updateField(key, "quantity", 4);
      });

      expect(result.current.getChangeSet().lineChanges).toEqual([
        expect.objectContaining({
          action: "add",
          tempId: key,
          data: expect.objectContaining({ quantity: 4 }),
        }),
      ]);
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
