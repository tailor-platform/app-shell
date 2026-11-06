import { expectTypeOf, test } from "vitest";
import type { Column, ColumnBase, TextCellEditOptions } from "@/components/data-table/types";
import type { ValueDisplayDescriptor } from "./column-types";

type Row = { id: string; amount: number; status: string };

test("DataTable columns remain compatible with the neutral display descriptor", () => {
  expectTypeOf<Column<Row>>().toExtend<ValueDisplayDescriptor<Row>>();
  expectTypeOf<ColumnBase<Row>["width"]>().toEqualTypeOf<number | undefined>();
  expectTypeOf<ColumnBase<Row>["align"]>().toEqualTypeOf<"left" | "right" | undefined>();
  expectTypeOf<NonNullable<TextCellEditOptions<Row>["onValueCommitted"]>>().toEqualTypeOf<
    (row: Row, value: string | null) => void
  >();
});

test("display descriptors retain the existing type/options contracts", () => {
  const link: ValueDisplayDescriptor<Row> = {
    type: "link",
    typeOptions: {
      href: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return `/rows/${row.id}`;
      },
    },
  };
  const money: ValueDisplayDescriptor<Row> = {
    type: "money",
    typeOptions: { currency: (row) => row.status },
  };
  // @ts-expect-error Links still require an href.
  const missingHref: ValueDisplayDescriptor<Row> = { type: "link" };
  // @ts-expect-error Text columns do not accept typeOptions.
  const textOptions: ValueDisplayDescriptor<Row> = { type: "text", typeOptions: {} };
  const numberOptions: ValueDisplayDescriptor<Row> = {
    type: "number",
    // @ts-expect-error Number columns do not accept currency options.
    typeOptions: { currency: "USD" },
  };
  void link;
  void money;
  void missingHref;
  void textOptions;
  void numberOptions;
});
