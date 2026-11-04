import { expectTypeOf, test } from "vitest";
import { createLineItemHelper } from "./column-helper";
import { useLineItems } from "./use-line-items";
import { LineItems, type LineItemsTableProps, type LineItemsRootProps } from "./line-items";
import type { LineItemsFooterProps } from "./footer";
import type { RowSelectionOptions } from "@/components/internals/table-core/selection-types";
import type { LineItemsSearchProps } from "./search";
import type { LineItemsChangeSet, UseLineItemsOptions, UseLineItemsReturn } from "./types";

type Row = { id?: string; quantity: number | null; name: string | null };
const { column } = createLineItemHelper<Row>();
const columns = [column({ accessorKey: "quantity", edit: { editorType: "number" } })];

test("public commands retain row types without exposing controller/session plumbing", () => {
  function Contract() {
    const value = useLineItems<Row>({ columns, defaultLines: [] });
    expectTypeOf(value).toEqualTypeOf<UseLineItemsReturn<Row>>();
    expectTypeOf(value.lines).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(value.allLines).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(value.searchQuery).toEqualTypeOf<string>();
    value.setSearchQuery("query");
    // @ts-expect-error Search accepts text, not collection-filter objects.
    value.setSearchQuery({ query: "value" });
    expectTypeOf(value.commitEdits()).toEqualTypeOf<Promise<LineItemsChangeSet<Row> | null>>();
    value.updateField("A", "quantity", null);
    value.updateLines([{ lineKey: "A", patch: { quantity: 2 } }]);
    value.addLine({ name: "New", quantity: 1 });
    // @ts-expect-error Property-specific commands cannot write text into numeric cells.
    value.updateField("A", "quantity", "2");
    // @ts-expect-error New lines must supply a complete editing model.
    value.addLine({ quantity: 1 });
    // @ts-expect-error Session stores are not public API.
    value.getSession();
    // @ts-expect-error The pure document engine is not public API.
    void value.document;
    return null;
  }
  void Contract;
});

test("Search reads its value from Root and exposes only presentation props", () => {
  const props: LineItemsSearchProps = {
    className: "search",
    placeholder: "Find lines",
    "aria-label": "Find document lines",
  };
  expectTypeOf(LineItems.Search).parameter(0).toEqualTypeOf<LineItemsSearchProps>();
  // @ts-expect-error Search consumes Root context rather than a second value prop.
  const duplicate: LineItemsSearchProps = { value: "query" };
  void props;
  void duplicate;
});

test("hook selection uses the shared DataTable contract and components only consume context", () => {
  expectTypeOf<
    NonNullable<UseLineItemsOptions<Row>["rowSelection"]>
  >().toEqualTypeOf<RowSelectionOptions>();
  const selection: RowSelectionOptions = {
    selectedIds: ["A", "temporary-line"],
    actions: [
      {
        id: "delete",
        label: "Delete",
        onClick: (ids, helpers) => {
          expectTypeOf(ids).toEqualTypeOf<string[]>();
          helpers.clearSelection();
        },
      },
    ],
    onChange: (keys) => {
      expectTypeOf(keys).toEqualTypeOf<string[]>();
    },
  };
  const uncontrolled: RowSelectionOptions = { defaultSelectedIds: ["A"] };
  expectTypeOf(LineItems.Table).parameter(0).toEqualTypeOf<LineItemsTableProps>();
  expectTypeOf(LineItems.Footer).parameter(0).toEqualTypeOf<LineItemsFooterProps>();
  const footer: LineItemsFooterProps = { children: "Add / Save", className: "footer" };
  expectTypeOf<keyof LineItemsFooterProps>().toEqualTypeOf<"children" | "className">();
  const invalid: RowSelectionOptions = {
    // @ts-expect-error Selection consumes public keys, not row objects.
    selectedIds: [{ id: "A" }],
    onChange: () => {},
  };
  const root: LineItemsRootProps<Row> = {
    value: {} as UseLineItemsReturn<Row>,
    children: null,
    // @ts-expect-error Selection is configured on the hook, not Root.
    rowSelection: selection,
  };
  const duplicate: LineItemsTableProps = {
    // @ts-expect-error Selection is configured on the hook, not Table.
    rowSelection: selection,
  };
  void selection;
  void uncontrolled;
  void root;
  void footer;
  void invalid;
  void duplicate;
});

test("initial options expose uncontrolled ownership and typed arbitrary row actions", () => {
  const options: UseLineItemsOptions<Row> = {
    columns,
    mode: "amend",
    ordering: "manual",
    rowActions: {
      width: 120,
      render: (row, context) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        expectTypeOf(context).toEqualTypeOf<{ lineKey: string; isNew: boolean; index: number }>();
        return row.name;
      },
    },
  };
  const controlled: UseLineItemsOptions<Row> = {
    columns,
    // @ts-expect-error Controlled rows are deliberately not advertised in this slice.
    lines: [],
  };
  void options;
  void controlled;
});

test("document validation returns scoped issues and supports asynchronous preparation", () => {
  const options: UseLineItemsOptions<Row> = {
    columns,
    validate: async (lines, { getLineKey }) => {
      expectTypeOf(lines).toEqualTypeOf<readonly Readonly<Row>[]>();
      // @ts-expect-error Validators cannot mutate adopted document rows.
      lines[0]!.quantity = 2;
      return [
        { scope: "document", message: "Document limit exceeded" },
        { scope: "cell", lineKey: getLineKey(lines[0]!), columnId: "quantity", message: "Invalid" },
      ];
    },
  };
  const invalid: UseLineItemsOptions<Row> = {
    columns,
    // @ts-expect-error Validators return issues, not booleans or nullable strings.
    validate: () => false,
  };
  const incomplete: UseLineItemsOptions<Row> = {
    columns,
    // @ts-expect-error A cell issue must identify both line and column.
    validate: () => [{ scope: "cell", message: "Invalid" }],
  };
  void options;
  void invalid;
  void incomplete;
});

test("cell callbacks follow editor output types, not display or optional-property input types", () => {
  type Model = {
    id: string;
    optional?: number | null;
    enabled: boolean;
    choice: 1 | 2 | null;
    detail: { units: number } | null;
  };
  const helper = createLineItemHelper<Model>();
  helper.column({
    accessorKey: "optional",
    type: "text",
    edit: {
      editorType: "number",
      onValueCommitted: async (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Readonly<Model>>();
        expectTypeOf(value).toEqualTypeOf<number | null>();
      },
    },
  });
  helper.column({
    accessorKey: "enabled",
    edit: {
      editorType: "boolean",
      onValueCommitted: (_row, value) => {
        expectTypeOf(value).toEqualTypeOf<boolean>();
      },
    },
  });
  helper.column({
    accessorKey: "choice",
    edit: {
      editorType: "combobox",
      options: [{ value: 1, label: "One" }],
      onValueCommitted: (_row, value) => {
        expectTypeOf(value).toEqualTypeOf<1 | 2 | null>();
      },
    },
  });
  helper.column({
    accessorKey: "detail",
    edit: {
      editorType: "custom",
      renderEditor: () => null,
      onValueCommitted: (_row, value) => {
        expectTypeOf(value).toEqualTypeOf<{ units: number } | null>();
      },
    },
  });
  helper.column({
    accessorKey: "optional",
    edit: {
      editorType: "number",
      // @ts-expect-error Callback values include a cleared null, and are not strings.
      onValueCommitted: (_row, _value: string) => {},
    },
  });
});
