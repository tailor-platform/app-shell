import { expectTypeOf, test } from "vitest";
import type { LineItemsColumn, LineItemsCustomEditorContext, LineItemsEditor } from "./types";
import { defineLineItemsEditor } from "./editor-adapter";

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
        editor: { type: "text" },
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    },
    {
      accessorKey: "count",
      edit: {
        editor: { type: "number" },
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    },
    { accessorKey: "enabled", edit: { editor: { type: "boolean" } } },
    { accessorKey: "day", edit: { editor: { type: "date", options: { min: "2026-12-01" } } } },
    {
      accessorKey: "priority",
      edit: {
        editor: {
          type: "combobox",
          options: {
            options: [
              { value: 1, label: "Low" },
              { value: 2, label: "High" },
            ],
          },
        },
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<1 | 2 | null>();
        },
      },
    },
    {
      accessorKey: "pack",
      edit: {
        editor: defineLineItemsEditor<Row, Row["pack"], Row["pack"]>({
          toDraft: (value) => value,
          parse: (draft) => ({ ok: true, value: draft }),
          render: (context) => {
            expectTypeOf(context).toEqualTypeOf<
              LineItemsCustomEditorContext<Row, Row["pack"], Row["pack"]>
            >();
            context.onChange({ units: 1 });
            context.onChange(null);
            void context.onCommit();
            return null;
          },
        }),
      },
    },
  ];
  void columns;
  // @ts-expect-error Numeric editors cannot adopt into a string property.
  const wrongOutput: LineItemsColumn<Row> = {
    accessorKey: "name",
    edit: { editor: { type: "number" } },
  };
  // @ts-expect-error An explicit clear emits null, which a required number cannot represent.
  const required: LineItemsColumn<Row> = {
    accessorKey: "required",
    edit: { editor: { type: "number" } },
  };
  // @ts-expect-error Date-only editors do not convert Date objects into implicit calendar days.
  const timestamp: LineItemsColumn<Row> = {
    accessorKey: "timestamp",
    edit: { editor: { type: "date" } },
  };
  // @ts-expect-error Computed values do not have a document write owner.
  const computed: LineItemsColumn<Row> = {
    id: "computed",
    accessor: (row) => row.count,
    edit: { editor: { type: "number" as const } },
  };
  // @ts-expect-error Source-less columns cannot adopt editor output.
  const sourceLess: LineItemsColumn<Row> = { id: "empty", edit: { editor: { type: "text" } } };
  // @ts-expect-error A numeric choice must fit the property's literal union.
  const choice: LineItemsColumn<Row> = {
    accessorKey: "priority",
    edit: { editor: { type: "combobox", options: { options: [{ value: 3, label: "Invalid" }] } } },
  };
  const remote: LineItemsEditor<Row, string | null> = {
    type: "combobox",
    // @ts-expect-error Remote choices require a label resolver for values outside the current results.
    options: { fetcher: async () => [] },
  };
  const callback: NonNullable<Extract<LineItemsColumn<Row>, { accessorKey: "count" }>["edit"]> = {
    editor: { type: "number" },
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
