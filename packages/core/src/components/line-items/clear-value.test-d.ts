import { expectTypeOf, test } from "vitest";
import type { LineItemsColumn, LineItemsEditor } from "./types";

type Row = {
  id?: string;
  name: string;
  quantity: number;
  optional?: number;
  nullable: number | null;
  mixed: string | number | null;
  status: "draft" | "confirmed";
};

test("Clear policy is explicit when null does not fit the property", () => {
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "name",
      edit: {
        editorType: "text",
        clearValue: false,
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
          expectTypeOf(value).toEqualTypeOf<string>();
        },
      },
    },
    { accessorKey: "name", edit: { editorType: "text", clearValue: () => "" } },
    { accessorKey: "quantity", edit: { editorType: "number", clearValue: () => 0 } },
    {
      accessorKey: "optional",
      edit: {
        editorType: "number",
        clearValue: () => undefined,
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | undefined>();
        },
      },
    },
    {
      accessorKey: "nullable",
      edit: {
        editorType: "number",
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    },
    {
      accessorKey: "status",
      edit: {
        editorType: "combobox",
        editorOptions: { options: [{ value: "draft", label: "Draft" }] },
        clearValue: () => "confirmed",
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<"draft" | "confirmed">();
        },
      },
    },
    {
      accessorKey: "mixed",
      edit: {
        editorType: "number",
        clearValue: () => "not set",
        onValueCommitted: (_row, value) => {
          // Clear can return any synchronous property value, not just a number.
          expectTypeOf(value).toEqualTypeOf<Row["mixed"]>();
        },
      },
    },
  ];
  void columns;

  // @ts-expect-error Required numbers cannot inherit the null Clear default.
  const required: LineItemsEditor<Row, number> = { editorType: "number" };
  // @ts-expect-error Optional numbers also cannot inherit the null Clear default.
  const optional: LineItemsEditor<Row, number | undefined> = { editorType: "number" };
  // @ts-expect-error A number property cannot accept a string Clear result.
  const wrong: LineItemsEditor<Row, number> = { editorType: "number", clearValue: () => "" };
  const wrongEmpty: LineItemsEditor<Row, number> = {
    editorType: "number",
    // @ts-expect-error undefined is not part of this required property.
    clearValue: () => undefined,
  };
  // @ts-expect-error Clear resolution is synchronous, unlike the confirmation check.
  const async: LineItemsEditor<Row, number> = { editorType: "number", clearValue: async () => 0 };
  const asyncUnknown: LineItemsEditor<Row, unknown> = {
    editorType: "number",
    // @ts-expect-error An unconstrained property does not permit asynchronous Clear resolution either.
    clearValue: async () => 0,
  };
  const outOfEnum: LineItemsEditor<Row, Row["status"]> = {
    editorType: "combobox",
    editorOptions: { options: [{ value: "draft", label: "Draft" }] },
    // @ts-expect-error Clear must fit the enum just like the normal choices.
    clearValue: () => "invalid",
  };
  void required;
  void optional;
  void wrong;
  void wrongEmpty;
  void async;
  void asyncUnknown;
  void outOfEnum;
});

test("callbacks cover the property domain after Clear and keep the intentional void contract", () => {
  type Editor = Extract<LineItemsEditor<Row, unknown>, { editorType: "text" }>;
  expectTypeOf<Parameters<NonNullable<Editor["onValueCommitted"]>>[1]>().toEqualTypeOf<unknown>();
  const editor: LineItemsEditor<Row, number | null> = {
    editorType: "number",
    // @ts-expect-error Successful response values still need to be discarded by the caller.
    onValueCommitted: () => Promise.resolve(new Response()),
  };
  void editor;
});
