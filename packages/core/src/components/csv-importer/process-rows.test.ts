import { describe, expect, it } from "vitest";
import { processRows } from "./process-rows";
import type { CsvColumnMapping, CsvCorrection, CsvSchema } from "./types";
import { csv } from "./validators";

describe("processRows", () => {
  const headers = ["Name", "Price", "Status"];
  const schema: CsvSchema = {
    columns: [
      { key: "name", label: "Name", schema: csv.string({ min: 1 }) },
      { key: "price", label: "Price", schema: csv.number({ min: 0 }) },
      {
        key: "status",
        label: "Status",
        schema: csv.enum(["active", "inactive"]),
      },
    ],
  };
  const mappings: CsvColumnMapping[] = [
    { csvHeader: "Name", columnKey: "name" },
    { csvHeader: "Price", columnKey: "price" },
    { csvHeader: "Status", columnKey: "status" },
  ];

  it("returns parsed rows with coerced values when all valid", () => {
    const rawRows = [["Alice", "100", "active"]];
    const { issues, parsedRows } = processRows(rawRows, headers, mappings, schema, []);

    expect(issues).toEqual([]);
    expect(parsedRows).toEqual([
      { rowIndex: 0, data: { name: "Alice", price: 100, status: "active" } },
    ]);
  });

  it("collects issues for invalid cells", () => {
    const rawRows = [["", "abc", "unknown"]];
    const { issues, parsedRows } = processRows(rawRows, headers, mappings, schema, []);

    expect(issues).toHaveLength(3);
    expect(issues[0]).toEqual({
      rowIndex: 0,
      columnKey: "name",
      message: "Must be at least 1 character(s)",
      level: "error",
    });
    expect(issues[1]).toEqual({
      rowIndex: 0,
      columnKey: "price",
      message: "Must be a valid number",
      level: "error",
    });
    expect(issues[2]).toEqual({
      rowIndex: 0,
      columnKey: "status",
      message: "Must be one of: active, inactive",
      level: "error",
    });
    // Raw values are kept in parsedRows for invalid cells
    expect(parsedRows[0].data).toEqual({
      name: "",
      price: "abc",
      status: "unknown",
    });
  });

  it("applies corrections over raw values", () => {
    const rawRows = [["Alice", "bad", "active"]];
    const corrections: CsvCorrection[] = [
      { row: 0, columnKey: "price", oldValue: "bad", newValue: "50" },
    ];
    const { issues, parsedRows } = processRows(rawRows, headers, mappings, schema, corrections);

    expect(issues).toEqual([]);
    expect(parsedRows[0].data.price).toBe(50);
  });

  it("skips columns with null columnKey in mappings", () => {
    const rawRows = [["Alice", "100", "active"]];
    const partialMappings: CsvColumnMapping[] = [
      { csvHeader: "Name", columnKey: "name" },
      { csvHeader: "Price", columnKey: null },
      { csvHeader: "Status", columnKey: "status" },
    ];
    const { parsedRows } = processRows(rawRows, headers, partialMappings, schema, []);

    expect(parsedRows[0].data).toEqual({ name: "Alice", status: "active" });
    expect(parsedRows[0].data).not.toHaveProperty("price");
  });

  it("handles columns without schema (pass-through)", () => {
    const noSchemaSchema: CsvSchema = {
      columns: [
        { key: "name", label: "Name" },
        { key: "price", label: "Price" },
      ],
    };
    const rawRows = [["Alice", "100", "active"]];
    const m: CsvColumnMapping[] = [
      { csvHeader: "Name", columnKey: "name" },
      { csvHeader: "Price", columnKey: "price" },
    ];
    const { issues, parsedRows } = processRows(rawRows, headers, m, noSchemaSchema, []);

    expect(issues).toEqual([]);
    expect(parsedRows[0].data).toEqual({ name: "Alice", price: "100" });
  });

  it("handles multiple rows with mixed valid/invalid", () => {
    const rawRows = [
      ["Alice", "100", "active"],
      ["", "abc", "inactive"],
      ["Charlie", "200", "active"],
    ];
    const { issues, parsedRows } = processRows(rawRows, headers, mappings, schema, []);

    expect(parsedRows).toHaveLength(3);
    // Row 0: all valid
    expect(parsedRows[0].data).toEqual({
      name: "Alice",
      price: 100,
      status: "active",
    });
    // Row 1: name and price invalid
    expect(issues.filter((i) => i.rowIndex === 1)).toHaveLength(2);
    // Row 2: all valid
    expect(parsedRows[2].data).toEqual({
      name: "Charlie",
      price: 200,
      status: "active",
    });
  });

  it("returns empty arrays for empty input", () => {
    const { issues, parsedRows } = processRows([], headers, mappings, schema, []);
    expect(issues).toEqual([]);
    expect(parsedRows).toEqual([]);
  });

  it("assigns correct rowIndex to each parsed row", () => {
    const rawRows = [
      ["A", "1", "active"],
      ["B", "2", "inactive"],
    ];
    const { parsedRows } = processRows(rawRows, headers, mappings, schema, []);
    expect(parsedRows[0].rowIndex).toBe(0);
    expect(parsedRows[1].rowIndex).toBe(1);
  });
});
