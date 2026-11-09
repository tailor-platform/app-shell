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
import { createLineItemsDocumentStore } from "./document/store";

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
    // @ts-expect-error This slice does not implement document-wide confirmation or persistence.
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

test("identity properties must be optional while other row fields stay required", () => {
  type Custom = { code?: number; name: string };
  type RequiredCustom = { code: number; name: string };
  type RequiredDefault = { id: string; name: string };
  type Alternative = RequiredDefault & { code?: number };

  function Contract() {
    const value = useLineItems<Custom>({
      idKey: "code",
      columns: [
        {
          accessorKey: "code",
          render: (row) => {
            expectTypeOf(row.code).toEqualTypeOf<number | undefined>();
            // @ts-expect-error A creation has no persisted ID until it is saved.
            row.code.toFixed();
            return row.code?.toFixed() ?? "New";
          },
        },
      ],
    });
    expectTypeOf(value.lines).toEqualTypeOf<readonly Custom[]>();
    expectTypeOf(value.addLine({ name: "New" })).toEqualTypeOf<string>();
    // @ts-expect-error Non-identity properties remain required.
    value.addLine({});
    // @ts-expect-error Removing a required identity would violate the declared row type.
    useLineItems<RequiredCustom>({ columns: [], idKey: "code" });
    // @ts-expect-error A required default ID cannot be removed from a creation.
    useLineItems<RequiredDefault>({ columns: [] });
    // @ts-expect-error Explicitly selecting a required default ID is also unsafe.
    useLineItems<RequiredDefault>({ columns: [], idKey: "id" });
    // @ts-expect-error Explicit undefined must not bypass the required-default-ID guard.
    useLineItems<RequiredDefault>({ columns: [], idKey: undefined });

    const alternative = useLineItems<Alternative>({ columns: [], idKey: "code" });
    alternative.addLine({ id: "Required non-identity value", name: "New" });
    // @ts-expect-error The required id is not the selected identity and must remain present.
    alternative.addLine({ name: "Missing required field" });

    const withoutId = useLineItems<{ name: string }>({ columns: [] });
    withoutId.addLine({ name: "No identity property" });
  }
  void Contract;
});

test("the document store enforces the same optional identity contract", () => {
  type Custom = { code?: number; name: string };
  type RequiredDefault = { id: string; name: string };
  const store = createLineItemsDocumentStore<Custom>({ columns: [], idKey: "code" });
  expectTypeOf(store.addLine({ name: "New" })).toEqualTypeOf<string>();
  // @ts-expect-error Direct store callers cannot select a required identity property.
  createLineItemsDocumentStore<{ code: number; name: string }>({ columns: [], idKey: "code" });
  // @ts-expect-error Direct store callers cannot use a required default identity either.
  createLineItemsDocumentStore<RequiredDefault>({ columns: [] });
});

test("identity optionality must hold across row variants and indexed records", () => {
  type Variant =
    | { kind: "persisted"; id: string; code: number; name: string; reference?: number }
    | { kind: "draft"; id?: string; code?: number; name: string; reference?: number };
  // @ts-expect-error The default identity is required by one row variant.
  createLineItemsDocumentStore<Variant>({ columns: [] });
  // @ts-expect-error Explicit selection must also be optional in every variant.
  createLineItemsDocumentStore<Variant>({ columns: [], idKey: "id" });
  // @ts-expect-error A custom identity cannot be required by even one variant.
  createLineItemsDocumentStore<Variant>({ columns: [], idKey: "code" });
  createLineItemsDocumentStore<Variant>({ columns: [], idKey: "reference" });

  type Indexed = Record<string, unknown> & { code: number; name: string };
  // @ts-expect-error An index signature must not hide a required named identity.
  createLineItemsDocumentStore<Indexed>({ columns: [], idKey: "code" });
  type IndexedVariant = Indexed | { code?: number; name: string };
  // @ts-expect-error Indexed members cannot hide required identities in a row union either.
  createLineItemsDocumentStore<IndexedVariant>({ columns: [], idKey: "code" });
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
  // @ts-expect-error Clearing a text editor emits null, which this required field cannot adopt.
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
