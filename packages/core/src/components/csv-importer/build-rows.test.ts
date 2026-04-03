import { describe, expect, it, vi } from "vitest";
import { buildRows } from "./build-rows";
import type { CsvColumnMapping, CsvCorrection, CsvSchema } from "./types";
import { csv } from "./validators";

// Mock parseCsvFile to avoid real file I/O
vi.mock("./csv-parser", () => ({
  parseCsvFile: vi.fn(),
}));

import { parseCsvFile } from "./csv-parser";

const mockParseCsvFile = vi.mocked(parseCsvFile);

function createFile(name: string): File {
  return new File([""], name, { type: "text/csv" });
}

describe("buildRows", () => {
  it("maps columns according to mappings", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Name", "Email"],
      rows: [
        ["Alice", "alice@example.com"],
        ["Bob", "bob@example.com"],
      ],
    });

    const schema: CsvSchema = {
      columns: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
      ],
    };

    const mappings: CsvColumnMapping[] = [
      { csvHeader: "Name", columnKey: "name" },
      { csvHeader: "Email", columnKey: "email" },
    ];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, []);
    expect(rows).toEqual([
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ]);
  });

  it("skips columns with null columnKey", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Name", "Unused"],
      rows: [["Alice", "skip"]],
    });

    const schema: CsvSchema = {
      columns: [{ key: "name", label: "Name" }],
    };

    const mappings: CsvColumnMapping[] = [
      { csvHeader: "Name", columnKey: "name" },
      { csvHeader: "Unused", columnKey: null },
    ];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, []);
    expect(rows).toEqual([{ name: "Alice" }]);
  });

  it("applies corrections over raw values", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Name"],
      rows: [["Alice"]],
    });

    const schema: CsvSchema = {
      columns: [{ key: "name", label: "Name" }],
    };

    const mappings: CsvColumnMapping[] = [{ csvHeader: "Name", columnKey: "name" }];

    const corrections: CsvCorrection[] = [
      {
        row: 0,
        columnKey: "name",
        oldValue: "Alice",
        newValue: "Alice Updated",
      },
    ];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, corrections);
    expect(rows).toEqual([{ name: "Alice Updated" }]);
  });

  it("applies schema coercion on valid values", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Price"],
      rows: [["42.5"]],
    });

    const schema: CsvSchema = {
      columns: [{ key: "price", label: "Price", schema: csv.number() }],
    };

    const mappings: CsvColumnMapping[] = [{ csvHeader: "Price", columnKey: "price" }];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, []);
    expect(rows).toEqual([{ price: 42.5 }]);
  });

  it("keeps raw value when schema validation fails", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Price"],
      rows: [["not-a-number"]],
    });

    const schema: CsvSchema = {
      columns: [{ key: "price", label: "Price", schema: csv.number() }],
    };

    const mappings: CsvColumnMapping[] = [{ csvHeader: "Price", columnKey: "price" }];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, []);
    expect(rows).toEqual([{ price: "not-a-number" }]);
  });

  it("applies schema coercion to corrected values", async () => {
    mockParseCsvFile.mockResolvedValue({
      headers: ["Price"],
      rows: [["bad"]],
    });

    const schema: CsvSchema = {
      columns: [{ key: "price", label: "Price", schema: csv.number() }],
    };

    const mappings: CsvColumnMapping[] = [{ csvHeader: "Price", columnKey: "price" }];

    const corrections: CsvCorrection[] = [
      { row: 0, columnKey: "price", oldValue: "bad", newValue: "99" },
    ];

    const rows = await buildRows(createFile("test.csv"), schema, mappings, corrections);
    expect(rows).toEqual([{ price: 99 }]);
  });
});
