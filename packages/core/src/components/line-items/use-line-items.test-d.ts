import { expectTypeOf, test } from "vitest";
import { createLineItemHelper } from "./column-helper";
import { useLineItems } from "./use-line-items";
import { LineItems } from "./line-items";
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
