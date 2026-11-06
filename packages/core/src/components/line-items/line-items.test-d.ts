import { expectTypeOf, test } from "vitest";
import type { LineItemsColumn, UseLineItemsOptions, UseLineItemsReturn } from "./types";
import type { LineItemsRootProps, LineItemsTableProps } from "./line-items";
import { useLineItems } from "./use-line-items";

type Row = { id?: string; name: string; quantity: number; detail: { nested: string } };

test("readonly display retains row types and does not expose unfinished document APIs", () => {
  function Contract() {
    const value = useLineItems<Row>({
      columns: [{ accessorKey: "quantity", type: "number" }],
      defaultLines: [],
    });
    expectTypeOf(value).toEqualTypeOf<UseLineItemsReturn<Row>>();
    expectTypeOf(value.lines).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(value.getLineKey).toEqualTypeOf<(row: Row) => string>();
    expectTypeOf<LineItemsRootProps<Row>["value"]>().toEqualTypeOf<UseLineItemsReturn<Row>>();
    // @ts-expect-error This slice does not implement cell editing or persistence.
    value.commitEdits();
    // @ts-expect-error Controlled rows are not supported.
    const controlled: UseLineItemsOptions<Row> = { columns: [], lines: [] };
    void controlled;
  }
  void Contract;
  expectTypeOf<keyof LineItemsTableProps>().toEqualTypeOf<
    "className" | "emptyMessage" | "aria-label"
  >();
});

test("property, computed and value-less columns keep source and display contracts", () => {
  const property: LineItemsColumn<Row> = { accessorKey: "quantity", type: "number" };
  const computed: LineItemsColumn<Row> = {
    id: "double",
    type: "number",
    accessor: (row) => row.quantity * 2,
  };
  const custom: LineItemsColumn<Row> = { id: "custom", render: (row) => row.detail.nested };
  // @ts-expect-error Property sources must exist on the row.
  const missing: LineItemsColumn<Row> = { accessorKey: "missing" };
  // @ts-expect-error A string property cannot use a number renderer.
  const wrongProperty: LineItemsColumn<Row> = { accessorKey: "name", type: "number" };
  // @ts-expect-error Structured values require custom rendering.
  const structured: LineItemsColumn<Row> = { accessorKey: "detail", type: "text" };
  // @ts-expect-error Computed sources need a stable column ID.
  const noId: LineItemsColumn<Row> = { accessor: (row) => row.quantity };
  // @ts-expect-error A typed numeric accessor cannot return text.
  const wrongComputed: LineItemsColumn<Row> = {
    id: "wrong",
    type: "number",
    accessor: (row) => row.name,
  };
  // @ts-expect-error A column cannot declare both sources.
  const twoSources: LineItemsColumn<Row> = {
    accessorKey: "quantity",
    accessor: (row: Row) => row.quantity,
  };
  // @ts-expect-error A link still requires href options.
  const link: LineItemsColumn<Row> = { accessorKey: "name", type: "link" };
  // @ts-expect-error No cell editor is implemented in the readonly slice.
  const editing: LineItemsColumn<Row> = { accessorKey: "name", edit: { editorType: "text" } };
  void property;
  void computed;
  void custom;
  void missing;
  void wrongProperty;
  void structured;
  void noId;
  void wrongComputed;
  void twoSources;
  void link;
  void editing;
});
