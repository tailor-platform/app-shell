import { describe, expect, it } from "vitest";
import { compileLineItemsColumns } from "./columns";
import type { LineItemsColumn } from "./types";

type Row = { name: string | null };

describe("LineItems editor ownership", () => {
  it("allows duplicate displays but only one edit owner per property", () => {
    const edit: LineItemsColumn<Row> = { accessorKey: "name", edit: { editor: { type: "text" } } };
    expect([...compileLineItemsColumns([edit, { accessorKey: "name", id: "display" }])]).toEqual([
      "name",
    ]);
    expect(() => compileLineItemsColumns([edit, { ...edit, id: "second-editor" }])).toThrow(
      "multiple edit owners",
    );
  });
  it.each([null, false])("rejects an invalid edit configuration %j", (edit) => {
    const column: LineItemsColumn<Row> = { accessorKey: "name" };
    Object.assign(column, { edit });
    expect(() => compileLineItemsColumns([column])).toThrow();
  });
});
