import { expectTypeOf, test } from "vitest";
import { parseDate } from "@internationalized/date";
import type { CalendarProps } from "@/components/calendar";
import type {
  CellEditorOptions,
  CellEditorOutput,
} from "@/components/internals/table-core/editing/props";
import type { choiceEditor } from "@/components/internals/table-core/editing/choice";
import type { dateEditor } from "@/components/internals/table-core/editing/date";
import type { numberEditor, textEditor } from "@/components/internals/table-core/editing/typing";
import type { lineItemsEditors } from "./editor-factory";
import type { LineItemsColumn, LineItemsEditor } from "./types";

type EditorCatalog = typeof lineItemsEditors;
type EditorAdapter<K extends keyof EditorCatalog> = ReturnType<EditorCatalog[K]["bind"]>;

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
    edit: {
      editorType: "date",
      editorOptions: {
        withTime: true,
        minValue: parseDate("2026-10-05"),
        maxValue: parseDate("2026-10-25"),
        isDateUnavailable: (day) => {
          expectTypeOf(day).toEqualTypeOf<
            Parameters<NonNullable<CalendarProps["isDateUnavailable"]>>[0]
          >();
          return day.day === 10;
        },
      },
    },
  };
  const choice: LineItemsColumn<Row> = {
    accessorKey: "name",
    edit: {
      editorType: "combobox",
      editorOptions: { options: [{ value: "open", label: "Open" }] },
    },
  };
  // @ts-expect-error Non-nullable properties require an explicit Clear policy.
  const missingTextClear: LineItemsEditor<Row, string> = { editorType: "text" };
  // @ts-expect-error Non-nullable properties require an explicit Clear policy.
  const missingNumberClear: LineItemsEditor<Row, number> = { editorType: "number" };
  void missingTextClear;
  void missingNumberClear;
  expectTypeOf<LineItemsEditor<Row, { code: string }>>().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<LineItemsColumn<Row>, { accessorKey?: never }>["edit"]
  >().toEqualTypeOf<undefined>();
  expectTypeOf<
    Extract<LineItemsEditor<Row, string | null>, { editorType: "number" }>
  >().toEqualTypeOf<never>();
  const numericChoice: LineItemsEditor<Row, string | null> = {
    editorType: "combobox",
    editorOptions: {
      // @ts-expect-error Fixed choices retain string values, not a second numeric-choice API.
      options: [{ value: 1, label: "One" }],
    },
  };
  // @ts-expect-error No custom editor is introduced.
  const custom: LineItemsEditor<Row, string | null> = { editorType: "custom" };
  const asyncChoice: LineItemsEditor<Row, string | null> = {
    editorType: "combobox",
    editorOptions: {
      // @ts-expect-error No asynchronous choice fetcher is introduced.
      fetcher: async () => [],
    },
  };
  const unhandled: LineItemsEditor<Row, string | null> = {
    editorType: "text",
    // @ts-expect-error Error presentation cannot disable checks or eager-adopt the value.
    error: false,
  };
  expectTypeOf<
    ReturnType<NonNullable<LineItemsEditor<Row, string | null>["onValueCommitted"]>>
  >().toEqualTypeOf<void | Promise<void>>();
  void unhandled;
  void text;
  void numeric;
  void date;
  void choice;
  void numericChoice;
  void custom;
  void asyncChoice;
});

test("fixed choices and confirmation values follow nullable string enum properties", () => {
  type EnumRow = {
    id?: string;
    status: "draft" | "confirmed" | null;
    requiredStatus: "draft" | "confirmed";
    quantity: number | null;
  };
  const column: LineItemsColumn<EnumRow> = {
    accessorKey: "status",
    edit: {
      editorType: "combobox",
      // A partial choice list does not narrow the callback's property-based value type.
      editorOptions: { options: [{ value: "draft", label: "Draft" }] },
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Readonly<EnumRow>>();
        expectTypeOf(value).toEqualTypeOf<EnumRow["status"]>();
      },
    },
  };
  const invalidChoice: LineItemsEditor<EnumRow, EnumRow["status"]> = {
    editorType: "combobox",
    editorOptions: {
      // @ts-expect-error Choices must fit the target property's string enum.
      options: [{ value: "invalid", label: "Invalid" }],
    },
  };
  const numericChoice: LineItemsEditor<EnumRow, EnumRow["status"]> = {
    editorType: "combobox",
    editorOptions: {
      // @ts-expect-error Numeric choices are not part of the fixed-string choice API.
      options: [{ value: 1, label: "One" }],
    },
  };
  expectTypeOf<
    Extract<LineItemsEditor<EnumRow, EnumRow["status"]>, { editorType: "text" }>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Extract<LineItemsEditor<EnumRow, EnumRow["quantity"]>, { editorType: "combobox" }>
  >().toEqualTypeOf<never>();
  const requiredEnum: LineItemsEditor<EnumRow, EnumRow["requiredStatus"]> = {
    editorType: "combobox",
    editorOptions: { options: [{ value: "draft", label: "Draft" }] },
    clearValue: false,
  };
  void requiredEnum;
  void column;
  void invalidChoice;
  void numericChoice;
});

test("public editor settings and confirmation values follow the concrete editors", () => {
  type DefinitionKeys = { [K in keyof EditorCatalog]: keyof EditorCatalog[K] };
  expectTypeOf<DefinitionKeys>().toEqualTypeOf<Record<keyof EditorCatalog, "validate" | "bind">>();
  type UIAdapters = Parameters<EditorCatalog["combobox"]["bind"]>[0];
  type AdapterKeys = { [K in keyof UIAdapters]: keyof UIAdapters[K] };
  expectTypeOf<AdapterKeys>().toEqualTypeOf<Record<keyof UIAdapters, "editor" | "prepare">>();
  expectTypeOf<LineItemsEditor<Row, unknown>["editorType"]>().toEqualTypeOf<keyof EditorCatalog>();
  type PublicEditor<K extends LineItemsEditor<Row, unknown>["editorType"]> = Extract<
    LineItemsEditor<Row, CellEditorOutput<EditorAdapter<K>["editor"]>>,
    { editorType: K }
  >;
  type ConfirmedValue<K extends LineItemsEditor<Row, unknown>["editorType"]> = Parameters<
    NonNullable<PublicEditor<K>["onValueCommitted"]>
  >[1];

  expectTypeOf<ConfirmedValue<"text">>().toEqualTypeOf<CellEditorOutput<typeof textEditor>>();
  expectTypeOf<ConfirmedValue<"number">>().toEqualTypeOf<CellEditorOutput<typeof numberEditor>>();
  expectTypeOf<ConfirmedValue<"date">>().toEqualTypeOf<CellEditorOutput<typeof dateEditor>>();
  expectTypeOf<ConfirmedValue<"combobox">>().toEqualTypeOf<CellEditorOutput<typeof choiceEditor>>();
  expectTypeOf<PublicEditor<"text">["editorOptions"]>().toEqualTypeOf<undefined>();
  expectTypeOf<PublicEditor<"number">["editorOptions"]>().toEqualTypeOf<undefined>();
  expectTypeOf<PublicEditor<"date">["editorOptions"]>().toEqualTypeOf<
    Omit<CellEditorOptions<typeof dateEditor>, "timeZone"> | undefined
  >();
  expectTypeOf<PublicEditor<"combobox">["editorOptions"]>().toEqualTypeOf<
    Pick<CellEditorOptions<typeof choiceEditor>, "options">
  >();
  type PreparedEditors = {
    [K in keyof EditorCatalog]: ReturnType<EditorAdapter<K>["prepare"]>;
  };
  expectTypeOf<keyof PreparedEditors["text"]>().toEqualTypeOf<
    "align" | "reserveIconSpace" | "renderCell" | "renderDisplay"
  >();
  expectTypeOf<PreparedEditors["text"]["align"]>().toEqualTypeOf<"left" | "center" | "right">();
  expectTypeOf<PreparedEditors>().toEqualTypeOf<
    Record<keyof EditorCatalog, PreparedEditors["text"]>
  >();

  const choice: PublicEditor<"combobox"> = {
    editorType: "combobox",
    editorOptions: {
      options: [],
      // @ts-expect-error Internal menu rendering is not a public editor setting.
      renderOption: () => null,
    },
  };
  void choice;
});

test("editorType discriminates nested editorOptions and rejects the flattened settings", () => {
  type Editor = LineItemsEditor<Row, unknown>;
  const defaults: Editor[] = [
    { editorType: "text" },
    { editorType: "number" },
    { editorType: "date" },
    { editorType: "date", editorOptions: {} },
    { editorType: "combobox", editorOptions: { options: [] } },
  ];
  const invalid: Editor[] = [
    // @ts-expect-error Fixed choices are required for combobox editors.
    { editorType: "combobox" },
    // @ts-expect-error Text editors have no configurable options.
    { editorType: "text", editorOptions: {} },
    // @ts-expect-error Number editors have no configurable options.
    { editorType: "number", editorOptions: { withTime: true } },
    // @ts-expect-error Fixed choices belong to combobox, not date.
    { editorType: "date", editorOptions: { options: [] } },
    // @ts-expect-error withTime belongs to date, not combobox.
    { editorType: "combobox", editorOptions: { options: [], withTime: true } },
    // @ts-expect-error Timezone comes from AppShell, not editorOptions.
    { editorType: "date", editorOptions: { timeZone: "UTC" } },
    // @ts-expect-error Date bounds use Calendar DateValue objects, not strings.
    { editorType: "date", editorOptions: { minValue: "2026-10-05" } },
    // @ts-expect-error The editor owns Calendar value and callbacks.
    { editorType: "date", editorOptions: { value: null } },
    // @ts-expect-error Date settings are nested under editorOptions.
    { editorType: "date", withTime: true },
    // @ts-expect-error Fixed choices are nested under editorOptions.
    { editorType: "combobox", options: [] },
  ];
  for (const edit of defaults) {
    if (edit.editorType === "date") {
      expectTypeOf(edit.editorOptions?.withTime).toEqualTypeOf<boolean | undefined>();
    } else if (edit.editorType === "combobox") {
      expectTypeOf(edit.editorOptions.options).toEqualTypeOf<
        CellEditorOptions<typeof choiceEditor>["options"]
      >();
    } else {
      expectTypeOf(edit.editorOptions).toEqualTypeOf<undefined>();
    }
  }
  void invalid;
});
