import { describe, expect, it } from "vitest";

import {
  coordsToRowsMatrix,
  moveSelectionCoord,
  parseClipboardTsv,
  rectangularCells,
  sameCoord,
  serializeMatrixTsv,
  type GridCoord,
} from "./spreadsheet-logic";

describe("spreadsheet-logic", () => {
  const lines = ["r1", "r2", "r3"];
  const cols = ["a", "b", "c"];

  it("moveSelectionCoord moves inside bounds", () => {
    expect(moveSelectionCoord("ArrowRight", { lineRef: "r1", columnId: "a" }, lines, cols)).toEqual(
      { lineRef: "r1", columnId: "b" },
    );

    expect(moveSelectionCoord("ArrowRight", { lineRef: "r1", columnId: "c" }, lines, cols)).toEqual(
      { lineRef: "r1", columnId: "c" },
    );

    expect(moveSelectionCoord("ArrowDown", { lineRef: "r3", columnId: "b" }, lines, cols)).toEqual({
      lineRef: "r3",
      columnId: "b",
    });
  });

  it("rectangularCells returns row-major stripes", () => {
    const a: GridCoord = { lineRef: "r1", columnId: "a" };
    const b: GridCoord = { lineRef: "r3", columnId: "b" };
    const cells = rectangularCells(lines, cols, a, b);
    expect(cells).toContainEqual({ lineRef: "r2", columnId: "b" });
    expect(cells.length).toBe(6);
  });

  it("coordsToRowsMatrix preserves column order from schema", () => {
    const coords = rectangularCells(
      lines,
      cols,
      { lineRef: "r1", columnId: "c" },
      { lineRef: "r2", columnId: "a" },
    );
    const m = coordsToRowsMatrix(lines, cols, coords, (_lr, cid) => cid);
    expect(m).toEqual([
      ["a", "b", "c"],
      ["a", "b", "c"],
    ]);
  });

  it("serializeMatrixTsv and parseClipboardTsv round-trip and trim trailing newline", () => {
    const tsv = serializeMatrixTsv([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(tsv).toBe("a\tb\n1\t2");
    const back = parseClipboardTsv(`${tsv}\n\n`);
    expect(back).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("sameCoord compares coords", () => {
    expect(sameCoord({ lineRef: "r1", columnId: "a" }, { lineRef: "r1", columnId: "a" })).toBe(
      true,
    );
    expect(sameCoord({ lineRef: "r1", columnId: "a" }, null)).toBe(false);
  });
});
