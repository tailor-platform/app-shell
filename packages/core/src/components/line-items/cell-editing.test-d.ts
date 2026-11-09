import { expectTypeOf, test } from "vitest";
import type { LineItemsColumn, LineItemsEditor } from "./types";

type Row = {
  id?: string;
  name: string | null;
  quantity: number | null;
  required: string;
  structured: { code: string };
};

test("cell editors retain property-specific nullable output and row callback types", () => {
  const text: LineItemsColumn<Row> = {
    accessorKey: "name",
    edit: {
      editorType: "text",
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
        expectTypeOf(value).toEqualTypeOf<string | null>();
      },
      canEdit: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.name !== null;
      },
    },
  };
  const numeric: LineItemsColumn<Row> = {
    accessorKey: "quantity",
    edit: {
      editorType: "number",
      onValueCommitted: async (_row, value) => {
        expectTypeOf(value).toEqualTypeOf<number | null>();
      },
    },
  };
  const date: LineItemsColumn<Row> = {
    accessorKey: "name",
    type: "date",
    edit: { editorType: "date", withTime: true },
  };
  const choice: LineItemsColumn<Row> = {
    accessorKey: "name",
    edit: { editorType: "combobox", options: [{ value: "open", label: "Open" }] },
  };
  expectTypeOf<LineItemsEditor<Row, string>>().toEqualTypeOf<never>();
  expectTypeOf<LineItemsEditor<Row, { code: string }>>().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<LineItemsColumn<Row>, { accessorKey?: never }>["edit"]
  >().toEqualTypeOf<undefined>();
  expectTypeOf<
    Extract<LineItemsEditor<Row, string | null>, { editorType: "number" }>
  >().toEqualTypeOf<never>();
  const numericChoice: LineItemsEditor<Row, string | null> = {
    editorType: "combobox",
    // @ts-expect-error Fixed choices retain string values, not a second numeric-choice API.
    options: [{ value: 1, label: "One" }],
  };
  // @ts-expect-error No custom editor is introduced.
  const custom: LineItemsEditor<Row, string | null> = { editorType: "custom" };
  const asyncChoice: LineItemsEditor<Row, string | null> = {
    editorType: "combobox",
    // @ts-expect-error No asynchronous choice fetcher is introduced.
    fetcher: async () => [],
  };
  void text;
  void numeric;
  void date;
  void choice;
  void numericChoice;
  void custom;
  void asyncChoice;
});
