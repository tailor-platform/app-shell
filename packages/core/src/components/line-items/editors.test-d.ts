import { expectTypeOf, test } from "vitest";
import type { LineItemsColumn, LineItemsCustomEditorContext, LineItemsEditor } from "./types";

type Row = {
  name: string | null;
  count: number | null;
  enabled: boolean;
  day: string | null;
  priority: 1 | 2 | null;
  pack: { units: number } | null;
  required: number;
  timestamp: Date | null;
};

test("property editors retain output and callback types, including explicit clears", () => {
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "name",
      edit: {
        editorType: "text",
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    },
    {
      accessorKey: "count",
      edit: {
        editorType: "number",
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    },
    { accessorKey: "enabled", edit: { editorType: "boolean" } },
    { accessorKey: "day", edit: { editorType: "date", min: "2026-12-01" } },
    {
      accessorKey: "priority",
      edit: {
        editorType: "combobox",
        options: [
          { value: 1, label: "Low" },
          { value: 2, label: "High" },
        ],
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<1 | 2 | null>();
        },
      },
    },
    {
      accessorKey: "pack",
      edit: {
        editorType: "custom",
        renderEditor: (context) => {
          expectTypeOf(context).toEqualTypeOf<LineItemsCustomEditorContext<Row, Row["pack"]>>();
          context.onCommit({ units: 1 });
          context.onCommit(null);
          return null;
        },
      },
    },
  ];
  void columns;
  // @ts-expect-error Numeric editors cannot adopt into a string property.
  const wrongOutput: LineItemsColumn<Row> = { accessorKey: "name", edit: { editorType: "number" } };
  // @ts-expect-error An explicit clear emits null, which a required number cannot represent.
  const required: LineItemsColumn<Row> = {
    accessorKey: "required",
    edit: { editorType: "number" },
  };
  // @ts-expect-error Date-only editors do not convert Date objects into implicit calendar days.
  const timestamp: LineItemsColumn<Row> = {
    accessorKey: "timestamp",
    edit: { editorType: "date" },
  };
  // @ts-expect-error Computed values do not have a document write owner.
  const computed: LineItemsColumn<Row> = {
    id: "computed",
    accessor: (row) => row.count,
    edit: { editorType: "number" as const },
  };
  // @ts-expect-error Source-less columns cannot adopt editor output.
  const sourceLess: LineItemsColumn<Row> = { id: "empty", edit: { editorType: "text" } };
  // @ts-expect-error A numeric choice must fit the property's literal union.
  const choice: LineItemsColumn<Row> = {
    accessorKey: "priority",
    edit: { editorType: "combobox", options: [{ value: 3, label: "Invalid" }] },
  };
  // @ts-expect-error Remote choices require a label resolver for values outside the current results.
  const remote: LineItemsEditor<Row, string | null> = {
    editorType: "combobox",
    fetcher: async () => [],
  };
  const callback: LineItemsEditor<Row, number | null> = {
    editorType: "number",
    // @ts-expect-error A callback cannot narrow away an explicit clear.
    onValueCommitted: (_row, value: number) => {
      void value;
    },
  };
  void wrongOutput;
  void required;
  void timestamp;
  void computed;
  void sourceLess;
  void choice;
  void remote;
  void callback;
});
