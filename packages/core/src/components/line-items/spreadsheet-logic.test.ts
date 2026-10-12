import { describe, expect, it } from "vitest";

import {
  coordsToRowsMatrix,
  moveSelectionCoord,
  parseClipboardTsv,
  rectangularCells,
  sameCoord,
  serializeMatrixTsv,
} from "./spreadsheet-logic";

const refs = ["a", "b", "c"];
const cols = ["sku", "qty", "price"];

describe("moveSelectionCoord", () => {
  it("moves within bounds", () => {
    expect(moveSelectionCoord("ArrowDown", { lineRef: "a", columnId: "qty" }, refs, cols)).toEqual({
      lineRef: "b",
      columnId: "qty",
    });
    expect(moveSelectionCoord("ArrowRight", { lineRef: "a", columnId: "sku" }, refs, cols)).toEqual(
      {
        lineRef: "a",
        columnId: "qty",
      },
    );
  });

  it("clamps at the grid edges rather than wrapping", () => {
    expect(moveSelectionCoord("ArrowUp", { lineRef: "a", columnId: "sku" }, refs, cols)).toEqual({
      lineRef: "a",
      columnId: "sku",
    });
    expect(moveSelectionCoord("ArrowDown", { lineRef: "c", columnId: "sku" }, refs, cols)).toEqual({
      lineRef: "c",
      columnId: "sku",
    });
    expect(
      moveSelectionCoord("ArrowRight", { lineRef: "a", columnId: "price" }, refs, cols),
    ).toEqual({ lineRef: "a", columnId: "price" });
  });

  it("returns null for a coordinate outside the grid", () => {
    expect(
      moveSelectionCoord("ArrowDown", { lineRef: "zz", columnId: "qty" }, refs, cols),
    ).toBeNull();
    expect(
      moveSelectionCoord("ArrowDown", { lineRef: "a", columnId: "zz" }, refs, cols),
    ).toBeNull();
  });
});

describe("rectangularCells", () => {
  it("fills the rectangle regardless of anchor direction", () => {
    const forward = rectangularCells(
      refs,
      cols,
      { lineRef: "a", columnId: "sku" },
      {
        lineRef: "b",
        columnId: "qty",
      },
    );
    const reversed = rectangularCells(
      refs,
      cols,
      { lineRef: "b", columnId: "qty" },
      {
        lineRef: "a",
        columnId: "sku",
      },
    );

    expect(forward).toHaveLength(4);
    expect(forward).toEqual(reversed);
    expect(forward).toEqual([
      { lineRef: "a", columnId: "sku" },
      { lineRef: "a", columnId: "qty" },
      { lineRef: "b", columnId: "sku" },
      { lineRef: "b", columnId: "qty" },
    ]);
  });

  it("returns a single cell when both anchors match", () => {
    const cells = rectangularCells(
      refs,
      cols,
      { lineRef: "b", columnId: "qty" },
      {
        lineRef: "b",
        columnId: "qty",
      },
    );
    expect(cells).toEqual([{ lineRef: "b", columnId: "qty" }]);
  });

  it("returns nothing for an unknown coordinate", () => {
    expect(
      rectangularCells(
        refs,
        cols,
        { lineRef: "zz", columnId: "qty" },
        { lineRef: "b", columnId: "qty" },
      ),
    ).toEqual([]);
  });
});

const display = (lineRef: string, columnId: string) => `${lineRef}/${columnId}`;

describe("coordsToRowsMatrix", () => {
  it("reads out the bounding box in document and schema order", () => {
    const matrix = coordsToRowsMatrix(
      refs,
      cols,
      [
        { lineRef: "b", columnId: "price" },
        { lineRef: "a", columnId: "qty" },
      ],
      display,
    );

    expect(matrix).toEqual([
      ["a/qty", "a/price"],
      ["b/qty", "b/price"],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(coordsToRowsMatrix(refs, cols, [], display)).toEqual([]);
    expect(coordsToRowsMatrix([], cols, [{ lineRef: "a", columnId: "qty" }], display)).toEqual([]);
  });
});

describe("TSV round-trip", () => {
  it("serializes a matrix to tab and newline delimited text", () => {
    expect(
      serializeMatrixTsv([
        ["1", "2"],
        ["3", "4"],
      ]),
    ).toBe("1\t2\n3\t4");
  });

  it("parses back to the same matrix", () => {
    expect(parseClipboardTsv("1\t2\n3\t4")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("normalizes CRLF and CR line endings", () => {
    expect(parseClipboardTsv("1\t2\r\n3\t4")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(parseClipboardTsv("1\t2\r3\t4")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("drops the trailing blank line spreadsheets append on copy", () => {
    expect(parseClipboardTsv("1\t2\n3\t4\n")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("returns nothing for blank text", () => {
    expect(parseClipboardTsv("")).toEqual([]);
    expect(parseClipboardTsv("   \n  ")).toEqual([]);
  });

  it("preserves empty cells inside a row", () => {
    expect(parseClipboardTsv("1\t\t3")).toEqual([["1", "", "3"]]);
  });
});

describe("sameCoord", () => {
  it("compares by value and treats null as unequal", () => {
    expect(sameCoord({ lineRef: "a", columnId: "qty" }, { lineRef: "a", columnId: "qty" })).toBe(
      true,
    );
    expect(sameCoord({ lineRef: "a", columnId: "qty" }, { lineRef: "b", columnId: "qty" })).toBe(
      false,
    );
    expect(sameCoord(null, null)).toBe(false);
  });
});
