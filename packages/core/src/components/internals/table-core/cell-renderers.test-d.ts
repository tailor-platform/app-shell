import type { ReactNode } from "react";
import { expectTypeOf, test } from "vitest";
import { createValueRenderer, type ValueRendererContext } from "./cell-renderers";
import { displayCellAdapters } from "./display-cell-adapters";
import type { ColumnCellType, TypedColumnDisplay } from "./column-types";

type Row = { id: string; currency: string };
const context: ValueRendererContext = { timeZone: "Asia/Tokyo" };

test("the exhaustive display catalog shares one preparation contract", () => {
  expectTypeOf<keyof typeof displayCellAdapters>().toEqualTypeOf<ColumnCellType>();
  expectTypeOf(displayCellAdapters.number.defaultAlign).toEqualTypeOf<"right">();
  expectTypeOf(displayCellAdapters.text.defaultAlign).toEqualTypeOf<"left">();
  expectTypeOf(displayCellAdapters.date.createRenderer<Row>).parameters.toEqualTypeOf<
    [TypedColumnDisplay<Row, "date">, ValueRendererContext]
  >();
  expectTypeOf(displayCellAdapters.money.createRenderer<Row>).parameters.toEqualTypeOf<
    [TypedColumnDisplay<Row, "money">, ValueRendererContext]
  >();
  expectTypeOf(displayCellAdapters.text.createRenderer<Row>).parameters.toEqualTypeOf<
    [TypedColumnDisplay<Row, "text">, ValueRendererContext]
  >();

  createValueRenderer({ type: "date" }, context);
  createValueRenderer({ type: "number" }, context);
  // @ts-expect-error Every display kind requires its owner-resolved context.
  createValueRenderer({ type: "number" });
  // @ts-expect-error Date preparation uses the same required context.
  createValueRenderer({ type: "date" });
  // @ts-expect-error The display environment must include its timezone.
  createValueRenderer({ type: "date" }, {});
  // @ts-expect-error Renderer dependencies are passed as a context object.
  createValueRenderer({ type: "number" }, "UTC");
  // @ts-expect-error Adapters also require the shared preparation context.
  displayCellAdapters.text.createRenderer({ type: "text" });
});

test("renderer creation preserves row-dependent currency and link contracts", () => {
  const money = displayCellAdapters.money.createRenderer<Row>(
    { type: "money", typeOptions: { currency: (row) => row.currency } },
    context,
  );
  const link = displayCellAdapters.link.createRenderer<Row>(
    { type: "link", typeOptions: { href: (row) => `/rows/${row.id}` } },
    context,
  );
  const dispatched = createValueRenderer<Row>(
    { type: "money", typeOptions: { currency: (row) => row.currency } },
    context,
  );
  expectTypeOf(money).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();
  expectTypeOf(link).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();
  expectTypeOf(dispatched).toEqualTypeOf<(value: unknown, row: Row) => ReactNode>();

  displayCellAdapters.money.createRenderer<Row>(
    {
      type: "money",
      typeOptions: {
        // @ts-expect-error A currency callback cannot require a different row shape.
        currency: (row: { other: string }) => row.other,
      },
    },
    context,
  );
  displayCellAdapters.link.createRenderer<Row>(
    {
      type: "link",
      typeOptions: {
        // @ts-expect-error A link callback cannot require a different row shape.
        href: (row: { other: string }) => row.other,
      },
    },
    context,
  );
});
