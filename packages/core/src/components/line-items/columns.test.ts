import { describe, expect, it } from "vitest";
import { compileLineItemsColumns } from "./columns";
import type { LineItemsColumn } from "./types";

type Row = { name: string | null; day: string | null };

describe("LineItems editor ownership and configuration", () => {
  it("allows duplicate displays but only one edit owner per property", () => {
    const edit: LineItemsColumn<Row> = { accessorKey: "name", edit: { editorType: "text" } };
    expect([...compileLineItemsColumns([edit, { accessorKey: "name", id: "display" }])]).toEqual([
      "name",
    ]);
    expect(() => compileLineItemsColumns([edit, { ...edit, id: "second-editor" }])).toThrow(
      "multiple edit owners",
    );
  });
  it.each([
    null,
    false,
    { editorType: "unknown" },
    { editorType: "custom" },
    { editorType: "combobox" },
  ])("rejects an unsupported or incomplete editor %j", (edit) => {
    const column: LineItemsColumn<Row> = { accessorKey: "name" };
    Object.assign(column, { edit });
    expect(() => compileLineItemsColumns([column])).toThrow();
  });
  it("checks date bounds before the document adopts rows", () => {
    const column: LineItemsColumn<Row> = {
      accessorKey: "day",
      edit: { editorType: "date", min: "2026-12-31", max: "2026-12-01" },
    };
    expect(() => compileLineItemsColumns([column])).toThrow("Date minimum must not exceed maximum");
  });
});
