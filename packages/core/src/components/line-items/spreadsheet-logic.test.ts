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
    expect(moveSelectionCoord("ArrowDown", { lineKey: "a", columnId: "qty" }, refs, cols)).toEqual({
      lineKey: "b",
      columnId: "qty",
    });
    expect(moveSelectionCoord("ArrowRight", { lineKey: "a", columnId: "sku" }, refs, cols)).toEqual(
      {
        lineKey: "a",
        columnId: "qty",
      },
    );
  });

  it("clamps at the grid edges rather than wrapping", () => {
    expect(moveSelectionCoord("ArrowUp", { lineKey: "a", columnId: "sku" }, refs, cols)).toEqual({
      lineKey: "a",
      columnId: "sku",
    });
    expect(moveSelectionCoord("ArrowDown", { lineKey: "c", columnId: "sku" }, refs, cols)).toEqual({
      lineKey: "c",
      columnId: "sku",
    });
    expect(
      moveSelectionCoord("ArrowRight", { lineKey: "a", columnId: "price" }, refs, cols),
    ).toEqual({ lineKey: "a", columnId: "price" });
  });

  it("returns null for a coordinate outside the grid", () => {
    expect(
      moveSelectionCoord("ArrowDown", { lineKey: "zz", columnId: "qty" }, refs, cols),
    ).toBeNull();
    expect(
      moveSelectionCoord("ArrowDown", { lineKey: "a", columnId: "zz" }, refs, cols),
    ).toBeNull();
  });
});

describe("rectangularCells", () => {
  it("fills the rectangle regardless of anchor direction", () => {
    const forward = rectangularCells(
      refs,
      cols,
      { lineKey: "a", columnId: "sku" },
      {
        lineKey: "b",
        columnId: "qty",
      },
    );
    const reversed = rectangularCells(
      refs,
      cols,
      { lineKey: "b", columnId: "qty" },
      {
        lineKey: "a",
        columnId: "sku",
      },
    );

    expect(forward).toHaveLength(4);
    expect(forward).toEqual(reversed);
    expect(forward).toEqual([
      { lineKey: "a", columnId: "sku" },
      { lineKey: "a", columnId: "qty" },
      { lineKey: "b", columnId: "sku" },
      { lineKey: "b", columnId: "qty" },
    ]);
  });

  it("returns a single cell when both anchors match", () => {
    const cells = rectangularCells(
      refs,
      cols,
      { lineKey: "b", columnId: "qty" },
      {
        lineKey: "b",
        columnId: "qty",
      },
    );
    expect(cells).toEqual([{ lineKey: "b", columnId: "qty" }]);
  });

  it("returns nothing for an unknown coordinate", () => {
    expect(
      rectangularCells(
        refs,
        cols,
        { lineKey: "zz", columnId: "qty" },
        { lineKey: "b", columnId: "qty" },
      ),
    ).toEqual([]);
  });
});

const display = (lineKey: string, columnId: string) => `${lineKey}/${columnId}`;

describe("coordsToRowsMatrix", () => {
  it("reads out the bounding box in document and schema order", () => {
    const matrix = coordsToRowsMatrix(
      refs,
      cols,
      [
        { lineKey: "b", columnId: "price" },
        { lineKey: "a", columnId: "qty" },
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
    expect(coordsToRowsMatrix([], cols, [{ lineKey: "a", columnId: "qty" }], display)).toEqual([]);
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

  it("keeps line breaks and tabs inside a quoted cell, as Excel and Sheets copy them", () => {
    const copied = 'A1\t"two\nlines"\nA2\t"say ""hi""\tthere"\n';
    expect(parseClipboardTsv(copied)).toEqual([
      ["A1", "two\nlines"],
      ["A2", 'say "hi"\tthere'],
    ]);
  });

  it("reads a quote that doesn't open a cell as text", () => {
    expect(parseClipboardTsv('5" pipe\tx')).toEqual([['5" pipe', "x"]]);
  });

  it("quotes cells that need it on copy, and reads them back unchanged", () => {
    const matrix = [
      ["plain", "two\nlines"],
      ['a "quote"', "tab\there"],
    ];
    const tsv = serializeMatrixTsv(matrix);
    expect(tsv).toBe('plain\t"two\nlines"\n"a ""quote"""\t"tab\there"');
    expect(parseClipboardTsv(tsv)).toEqual(matrix);
  });
});

describe("sameCoord", () => {
  it("compares by value and treats null as unequal", () => {
    expect(sameCoord({ lineKey: "a", columnId: "qty" }, { lineKey: "a", columnId: "qty" })).toBe(
      true,
    );
    expect(sameCoord({ lineKey: "a", columnId: "qty" }, { lineKey: "b", columnId: "qty" })).toBe(
      false,
    );
    expect(sameCoord(null, null)).toBe(false);
  });
});
