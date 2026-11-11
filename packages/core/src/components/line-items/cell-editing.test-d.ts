import { expectTypeOf, test } from "vitest";
import type {
  CellEditorOptions,
  CellEditorOutput,
} from "@/components/internals/table-core/editing/props";
import type { choiceEditor } from "@/components/internals/table-core/editing/choice";
import type { dateEditor } from "@/components/internals/table-core/editing/date";
import type { numberEditor, textEditor } from "@/components/internals/table-core/editing/typing";
import type { createLineItemsCellPreparers } from "./line-items-cell";
import type { LineItemsColumn, LineItemsEditor } from "./types";

type EditorCatalog = ReturnType<typeof createLineItemsCellPreparers>["editors"];

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
  expectTypeOf<LineItemsEditor<Row, number>>().toEqualTypeOf<never>();
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

test("public editor settings and confirmation values follow the concrete editors", () => {
  expectTypeOf<LineItemsEditor<Row, unknown>["editorType"]>().toEqualTypeOf<keyof EditorCatalog>();
  type PublicEditor<K extends LineItemsEditor<Row, unknown>["editorType"]> = Extract<
    LineItemsEditor<Row, unknown>,
    { editorType: K }
  >;
  type ConfirmedValue<K extends LineItemsEditor<Row, unknown>["editorType"]> = Parameters<
    NonNullable<PublicEditor<K>["onValueCommitted"]>
  >[1];

  expectTypeOf<ConfirmedValue<"text">>().toEqualTypeOf<CellEditorOutput<typeof textEditor>>();
  expectTypeOf<ConfirmedValue<"number">>().toEqualTypeOf<CellEditorOutput<typeof numberEditor>>();
  expectTypeOf<ConfirmedValue<"date">>().toEqualTypeOf<CellEditorOutput<typeof dateEditor>>();
  expectTypeOf<ConfirmedValue<"combobox">>().toEqualTypeOf<CellEditorOutput<typeof choiceEditor>>();
  expectTypeOf<PublicEditor<"date">["withTime"]>().toEqualTypeOf<
    CellEditorOptions<typeof dateEditor>["withTime"]
  >();
  expectTypeOf<Extract<keyof PublicEditor<"date">, "timeZone">>().toEqualTypeOf<never>();
  expectTypeOf<PublicEditor<"combobox">["options"]>().toEqualTypeOf<
    CellEditorOptions<typeof choiceEditor>["options"]
  >();
  type PreparedEditors = {
    [K in keyof EditorCatalog]: ReturnType<EditorCatalog[K]["prepare"]>;
  };
  expectTypeOf<keyof PreparedEditors["text"]>().toEqualTypeOf<
    "align" | "renderCell" | "renderDisplay"
  >();
  expectTypeOf<PreparedEditors["text"]["align"]>().toEqualTypeOf<"left" | "center" | "right">();
  expectTypeOf<PreparedEditors>().toEqualTypeOf<
    Record<keyof EditorCatalog, PreparedEditors["text"]>
  >();

  const choice: PublicEditor<"combobox"> = {
    editorType: "combobox",
    options: [],
    // @ts-expect-error Internal menu rendering is not a public editor setting.
    renderOption: () => null,
  };
  void choice;
});
