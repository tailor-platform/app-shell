import { expectTypeOf, test } from "vitest";
import type { BadgeCellOptions } from "@/components/internals/table-core/column-types";
import type { LineItemsColumn, LineItemsEditor } from "./types";

type Row = { id?: string; status: "open" | "closed" | null };
const choices = {
  editorType: "combobox" as const,
  editorOptions: { options: [{ value: "open" as const, label: "Open" }] },
};

test("combobox badge labels have one definition while variants remain configurable", () => {
  const column: LineItemsColumn<Row> = {
    accessorKey: "status",
    type: "badge",
    typeOptions: {
      badgeVariantMap: { open: "success" },
      defaultBadgeVariant: "outline-neutral",
      maxVisible: 1,
    },
    edit: {
      ...choices,
      clearValue: () => "closed",
      canEdit: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.status !== "closed";
      },
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
        expectTypeOf(value).toEqualTypeOf<Row["status"]>();
      },
    },
  };
  const competing = {
    accessorKey: "status" as const,
    type: "badge" as const,
    typeOptions: { badgeLabelMap: { open: "Another label" } },
    edit: choices,
  };
  // @ts-expect-error Combobox badges define labels in choices, not badgeLabelMap.
  const invalid: LineItemsColumn<Row> = competing;
  void column;
  void invalid;
});

test("non-combobox badges retain their ordinary label map", () => {
  type TextRow = { status: string | null };
  const columns: LineItemsColumn<TextRow>[] = [
    {
      accessorKey: "status",
      type: "badge",
      typeOptions: { badgeLabelMap: { open: "Open" } },
    },
    {
      accessorKey: "status",
      type: "badge",
      typeOptions: { badgeLabelMap: { open: "Open" } },
      edit: {
        editorType: "text",
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Readonly<TextRow>>();
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    },
    {
      id: "computed",
      type: "badge",
      accessor: (row) => row.status,
      typeOptions: { badgeLabelMap: { open: "Open" } },
    },
  ];
  void columns;
  type MixedRow = { status: string | number | null };
  const otherEditors: LineItemsColumn<MixedRow>[] = [
    {
      accessorKey: "status",
      type: "badge",
      typeOptions: { badgeLabelMap: { "1": "One" } },
      edit: { editorType: "number" },
    },
    {
      accessorKey: "status",
      type: "badge",
      typeOptions: { badgeLabelMap: { "2026-12-01": "Closing day" } },
      edit: { editorType: "date" },
    },
  ];
  void otherEditors;
});

test("uncertain display, editor, or map options cannot bypass label ownership", () => {
  type TextRow = { status: string | null };
  const type = null as unknown as "badge" | "text";
  const edit = null as unknown as LineItemsEditor<TextRow, string | null>;
  const typeOptions = null as unknown as BadgeCellOptions;
  const displayUnion = {
    accessorKey: "status" as const,
    type,
    typeOptions: { badgeLabelMap: { open: "Open" } },
    edit: choices,
  };
  const editorUnion = {
    accessorKey: "status" as const,
    type: "badge" as const,
    typeOptions: { badgeLabelMap: { open: "Open" } },
    edit,
  };
  const optionsUnion = {
    accessorKey: "status" as const,
    type: "badge" as const,
    typeOptions,
    edit: choices,
  };
  // @ts-expect-error A possibly-badge combobox cannot supply competing labels.
  const invalidDisplay: LineItemsColumn<TextRow> = displayUnion;
  // @ts-expect-error A possibly-combobox badge cannot supply competing labels.
  const invalidEditor: LineItemsColumn<TextRow> = editorUnion;
  // @ts-expect-error Broad badge options may contain a competing label map.
  const invalidOptions: LineItemsColumn<TextRow> = optionsUnion;
  void invalidDisplay;
  void invalidEditor;
  void invalidOptions;
});
