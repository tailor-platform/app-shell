import { expectTypeOf, test } from "vitest";
import {
  LineItems,
  useLineItems,
  type LineItemsColumn,
  type UseLineItemsOptions,
  type UseLineItemsReturn,
  type LineItemsRootProps,
  type LineItemsTableProps,
} from "@/index";
import { createLineItemsDocumentStore } from "./document-store";

type Row = { id?: string; name: string; quantity: number; detail: { nested: string } };

test("row commands retain row types without exposing unfinished save APIs", () => {
  function Contract() {
    const value = useLineItems<Row>({
      columns: [{ accessorKey: "quantity", type: "number" }],
      defaultLines: [],
    });
    expectTypeOf(value).toEqualTypeOf<UseLineItemsReturn<Row>>();
    expectTypeOf(value.lines).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(value.getLineKey).toEqualTypeOf<(row: Row) => string>();
    expectTypeOf<LineItemsRootProps<Row>["value"]>().toEqualTypeOf<UseLineItemsReturn<Row>>();
    expectTypeOf(value.isDirty).toEqualTypeOf<boolean>();
    expectTypeOf(value.orderer).toEqualTypeOf<boolean>();
    expectTypeOf<UseLineItemsOptions<Row>["orderer"]>().toEqualTypeOf<boolean | undefined>();
    value.reorderLine("A", "B");
    value.reorderLine("A", null);
    const ordering: UseLineItemsOptions<Row> = { columns: [], orderer: true };
    ordering.orderer = false;
    // @ts-expect-error The orderer option accepts booleans, not named policies.
    ordering.orderer = "manual";
    // @ts-expect-error A movement anchor must be a current key or null.
    value.reorderLine("A", 1);
    value.updateField("A", "quantity", 2);
    expectTypeOf(
      value.addLine({ name: "New", quantity: 1, detail: { nested: "value" } }),
    ).toEqualTypeOf<string>();
    value.removeLine("A");
    value.revert();
    // @ts-expect-error A numeric property cannot receive text.
    value.updateField("A", "quantity", "2");
    // @ts-expect-error A field must exist on the row.
    value.updateField("A", "missing", 2);
    // @ts-expect-error A new line must supply the complete editing model.
    value.addLine({ name: "Incomplete" });
    // @ts-expect-error This slice does not implement cell confirmation or persistence.
    value.commitEdits();
    // @ts-expect-error Controlled rows are not supported.
    const controlled: UseLineItemsOptions<Row> = { columns: [], lines: [] };
    void controlled;
  }
  void Contract;
  expectTypeOf<Parameters<typeof LineItems.Table>[0]>().toEqualTypeOf<LineItemsTableProps>();
  expectTypeOf<keyof LineItemsTableProps>().toEqualTypeOf<
    "className" | "emptyMessage" | "aria-label"
  >();
});

test("the store adapter preserves property-specific command typing", () => {
  const store = createLineItemsDocumentStore<Row>({ columns: [{ accessorKey: "quantity" }] });
  store.updateField("A", "quantity", 2);
  // @ts-expect-error Notification wrappers must not widen the field's value type.
  store.updateField("A", "quantity", "2");
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
