import { describe, expect, it } from "vitest";
import { autoMatchHeaders } from "./csv-parser";

describe("autoMatchHeaders", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email Address", aliases: ["mail", "e-mail"] },
    { key: "age", label: "Age" },
  ];

  it("matches by exact key (case-insensitive)", () => {
    const result = autoMatchHeaders(["name", "age"], columns);
    expect(result).toEqual([
      { csvHeader: "name", columnKey: "name" },
      { csvHeader: "age", columnKey: "age" },
    ]);
  });

  it("matches by label (case-insensitive)", () => {
    const result = autoMatchHeaders(["Email Address"], columns);
    expect(result).toEqual([{ csvHeader: "Email Address", columnKey: "email" }]);
  });

  it("matches by alias (case-insensitive)", () => {
    const result = autoMatchHeaders(["E-Mail"], columns);
    expect(result).toEqual([{ csvHeader: "E-Mail", columnKey: "email" }]);
  });

  it("returns null for unmatched headers", () => {
    const result = autoMatchHeaders(["phone", "name"], columns);
    expect(result).toEqual([
      { csvHeader: "phone", columnKey: null },
      { csvHeader: "name", columnKey: "name" },
    ]);
  });

  it("prevents duplicate column matching", () => {
    // Two CSV headers that match the same column — only the first wins
    const result = autoMatchHeaders(["name", "Name"], columns);
    expect(result).toEqual([
      { csvHeader: "name", columnKey: "name" },
      { csvHeader: "Name", columnKey: null },
    ]);
  });

  it("handles empty CSV headers", () => {
    const result = autoMatchHeaders([], columns);
    expect(result).toEqual([]);
  });

  it("handles empty schema columns", () => {
    const result = autoMatchHeaders(["name", "email"], []);
    expect(result).toEqual([
      { csvHeader: "name", columnKey: null },
      { csvHeader: "email", columnKey: null },
    ]);
  });

  it("trims whitespace for matching", () => {
    const result = autoMatchHeaders(["  name  ", " Age "], columns);
    expect(result).toEqual([
      { csvHeader: "  name  ", columnKey: "name" },
      { csvHeader: " Age ", columnKey: "age" },
    ]);
  });
});
