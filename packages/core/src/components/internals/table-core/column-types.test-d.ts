import { expectTypeOf, test } from "vitest";
import type { Column, ColumnBase, TextCellEditOptions } from "@/components/data-table/types";
import type { createDisplayFactories } from "./cell-renderers";
import type {
  ColumnCellType,
  ColumnDisplay,
  ColumnDisplayValues,
  MoneyCellOptions,
  TypedColumnDisplay,
  ValueDisplayDescriptor,
} from "./column-types";

type Row = { id: string; amount: number; status: string };

test("DataTable columns remain compatible with the neutral display descriptor", () => {
  expectTypeOf<Column<Row>>().toExtend<ValueDisplayDescriptor<Row>>();
  expectTypeOf<ColumnBase<Row>["width"]>().toEqualTypeOf<number | undefined>();
  expectTypeOf<ColumnBase<Row>["align"]>().toEqualTypeOf<"left" | "right" | undefined>();
  expectTypeOf<NonNullable<TextCellEditOptions<Row>["onValueCommitted"]>>().toEqualTypeOf<
    (row: Row, value: string | null) => void
  >();
});

test("display kinds, options and values follow specialized factory signatures", () => {
  type Factories = ReturnType<typeof createDisplayFactories<Row>>;
  expectTypeOf<ColumnCellType>().toEqualTypeOf<keyof Factories>();
  expectTypeOf<Parameters<Factories["money"]>[0]["typeOptions"]>().toEqualTypeOf<
    MoneyCellOptions<Row> | undefined
  >();
  expectTypeOf<TypedColumnDisplay<Row, "money">>().toEqualTypeOf<
    { type: "money" } & Parameters<Factories["money"]>[0]
  >();
  expectTypeOf<ColumnDisplayValues>().toEqualTypeOf<{
    text: string | number | boolean | bigint | null | undefined;
    number: number | null | undefined;
    money: number | null | undefined;
    date: Date | string | number | null | undefined;
    badge: string | string[] | number | boolean | null | undefined;
    link: string | number | boolean | null | undefined;
  }>();
  expectTypeOf<ColumnDisplayValues["date"]>().toEqualTypeOf<
    Parameters<ReturnType<Factories["date"]>>[0]
  >();
  expectTypeOf<Extract<ColumnDisplay<Row, string>, { type: "number" }>>().toBeNever();
  expectTypeOf<Extract<ColumnDisplay<Row, number | null>, { type: "money" }>>().toEqualTypeOf<
    TypedColumnDisplay<Row, "money">
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
    typeOptions: {
      currency: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.status;
      },
    },
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
