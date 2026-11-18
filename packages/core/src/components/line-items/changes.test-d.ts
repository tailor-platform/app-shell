import { expectTypeOf, test } from "vitest";
import { useLineItems, type LineItemsChangeset, type LineItemsColumn } from "@/index";

type Row = { id?: string; quantity: number; notes?: string | null; detail: { count: number } };

test("property equality retains the stored property's value type", () => {
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "quantity",
      equals: (baseline, current) => {
        expectTypeOf(baseline).toEqualTypeOf<number>();
        expectTypeOf(current).toEqualTypeOf<number>();
        return baseline === current;
      },
    },
    {
      accessorKey: "notes",
      equals: (baseline, current) => {
        expectTypeOf(baseline).toEqualTypeOf<string | null | undefined>();
        expectTypeOf(current).toEqualTypeOf<string | null | undefined>();
        return baseline === current;
      },
    },
    {
      accessorKey: "detail",
      equals: (baseline, current) => {
        expectTypeOf(baseline).toEqualTypeOf<{ count: number }>();
        return baseline.count === current.count;
      },
    },
  ];
  void columns;
  const wrongValue: LineItemsColumn<Row> = {
    accessorKey: "quantity",
    // @ts-expect-error Equality follows the selected property's type.
    equals: (a: string, b: string) => a === b,
  };
  // @ts-expect-error Equality must synchronously return a boolean.
  const asyncEquality: LineItemsColumn<Row> = { accessorKey: "quantity", equals: async () => true };
  // @ts-expect-error Computed columns do not own stored values.
  const computed: LineItemsColumn<Row> = {
    id: "computed",
    accessor: (row) => row.quantity,
    equals: () => true,
  };
  // @ts-expect-error Display-only columns cannot configure equality.
  const display: LineItemsColumn<Row> = { id: "display", render: () => null, equals: () => true };
  void [wrongValue, asyncEquality, computed, display];
});

test("public changesets preserve full rows and property-typed partial updates", () => {
  function Contract() {
    const value = useLineItems<Row>({ columns: [{ accessorKey: "quantity" }] });
    expectTypeOf(value.getChanges).toEqualTypeOf<() => LineItemsChangeset<Row>>();
    const changes = value.getChanges();
    expectTypeOf(changes.added).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(changes.removed).toEqualTypeOf<readonly Row[]>();
    expectTypeOf(changes.updated[0].lineKey).toEqualTypeOf<string>();
    expectTypeOf(changes.updated[0].changes).toEqualTypeOf<Partial<Row>>();
    expectTypeOf(changes.order).toEqualTypeOf<readonly string[] | null>();
    changes.updated[0].changes.notes = undefined;
    // @ts-expect-error Changed values retain their property's type.
    changes.updated[0].changes.quantity = "invalid";
    // @ts-expect-error Inspection does not accept a save or draft-confirmation option.
    value.getChanges({ commitDrafts: true });
  }
  void Contract;
});
