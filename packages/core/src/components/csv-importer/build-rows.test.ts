import { describe, expect, it, vi } from "vitest";
import { buildRows } from "./build-rows";
import type { CsvImportEvent, CsvSchema } from "./types";
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [
        { csvHeader: "Name", columnKey: "name" },
        { csvHeader: "Email", columnKey: "email" },
      ],
      corrections: [],
      issues: [],
      summary: {
        totalRows: 2,
        validRows: 2,
        correctedRows: 0,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [
        { csvHeader: "Name", columnKey: "name" },
        { csvHeader: "Unused", columnKey: null },
      ],
      corrections: [],
      issues: [],
      summary: {
        totalRows: 1,
        validRows: 1,
        correctedRows: 0,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [{ csvHeader: "Name", columnKey: "name" }],
      corrections: [
        {
          row: 0,
          columnKey: "name",
          oldValue: "Alice",
          newValue: "Alice Updated",
        },
      ],
      issues: [],
      summary: {
        totalRows: 1,
        validRows: 1,
        correctedRows: 1,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [{ csvHeader: "Price", columnKey: "price" }],
      corrections: [],
      issues: [],
      summary: {
        totalRows: 1,
        validRows: 1,
        correctedRows: 0,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [{ csvHeader: "Price", columnKey: "price" }],
      corrections: [],
      issues: [],
      summary: {
        totalRows: 1,
        validRows: 0,
        correctedRows: 0,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
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

    const event: CsvImportEvent = {
      file: createFile("test.csv"),
      mappings: [{ csvHeader: "Price", columnKey: "price" }],
      corrections: [{ row: 0, columnKey: "price", oldValue: "bad", newValue: "99" }],
      issues: [],
      summary: {
        totalRows: 1,
        validRows: 1,
        correctedRows: 1,
        skippedRows: 0,
        warningRows: 0,
      },
    };

    const rows = await buildRows(event, schema);
    expect(rows).toEqual([{ price: 99 }]);
  });
});
