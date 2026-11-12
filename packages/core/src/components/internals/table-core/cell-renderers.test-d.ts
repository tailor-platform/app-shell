import type { ReactNode } from "react";
import { expectTypeOf, test } from "vitest";
import { createDateRenderer, createValueRenderer, displayCellAdapters } from "./cell-renderers";
import type { ColumnCellType } from "./column-types";

type Row = { id: string; currency: string };

test("the display catalog is exhaustive and keeps timezone specific to dates", () => {
  expectTypeOf<keyof typeof displayCellAdapters>().toEqualTypeOf<ColumnCellType>();
  expectTypeOf(displayCellAdapters.date.createRenderer).toEqualTypeOf<typeof createDateRenderer>();
  expectTypeOf(displayCellAdapters.number.defaultAlign).toEqualTypeOf<"right">();
  expectTypeOf(displayCellAdapters.text.defaultAlign).toEqualTypeOf<"left">();

  displayCellAdapters.date.createRenderer({}, "Asia/Tokyo");
  // @ts-expect-error Date preparation requires its timezone dependency.
  displayCellAdapters.date.createRenderer({});
  // @ts-expect-error Date descriptors do not enter timezone-independent preparation.
  createValueRenderer({ type: "date" });
  // @ts-expect-error General display preparation does not accept a timezone.
  createValueRenderer({ type: "number" }, "UTC");
});

test("renderer creation preserves row-dependent currency and link contracts", () => {
  const money = displayCellAdapters.money.createRenderer<Row>({
    type: "money",
    typeOptions: { currency: (row) => row.currency },
  });
  const link = displayCellAdapters.link.createRenderer<Row>({
    type: "link",
    typeOptions: { href: (row) => `/rows/${row.id}` },
  });
  const dispatched = createValueRenderer<Row>({
    type: "money",
    typeOptions: { currency: (row) => row.currency },
  });
  expectTypeOf(money).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();
  expectTypeOf(link).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();
  expectTypeOf(dispatched).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();

  displayCellAdapters.money.createRenderer<Row>({
    type: "money",
    typeOptions: {
      // @ts-expect-error A currency callback cannot require a different row shape.
      currency: (row: { other: string }) => row.other,
    },
  });
  displayCellAdapters.link.createRenderer<Row>({
    type: "link",
    typeOptions: {
      // @ts-expect-error A link callback cannot require a different row shape.
      href: (row: { other: string }) => row.other,
    },
  });
});
