import { createElement, type ReactElement } from "react";
import { expectTypeOf, test } from "vitest";
import { column as defineColumn, createColumnHelper } from "./field-helpers";
import type { Column, FooterRenderContext } from "./types";
import { aggregations, type Aggregation } from "@/lib/aggregations";

type Row = {
  id: string;
  qty: number | null;
  optional?: number;
  name: string;
  mixed: number | string;
  unknown: unknown;
  unsafe: ReturnType<typeof JSON.parse>;
  empty: null;
};

const { column, inferColumns } = createColumnHelper<Row>();
const onValueCommitted = () => {};

function preserve<TRow extends Record<string, unknown>>(definition: Column<TRow>): Column<TRow> {
  return { ...definition };
}

test("numeric aggregations follow the source type, not the presentation type", () => {
  column({ id: "qty", type: "text", footer: aggregations.sum() });
  column({ id: "optional", type: "number", footer: aggregations.avg() });
  column({ id: "qty", footer: aggregations.min() });
  column({ id: "qty", type: "money", footer: aggregations.max() });

  for (const aggregate of [
    aggregations.sum,
    aggregations.avg,
    aggregations.min,
    aggregations.max,
  ]) {
    // @ts-expect-error A number presentation does not make a string field numeric.
    column({ id: "name", type: "number", footer: aggregate() });
    // @ts-expect-error Mixed numeric/string fields cannot be numerically aggregated.
    column({ id: "mixed", footer: aggregate() });
    // @ts-expect-error Unknown fields do not establish a numeric source.
    column({ id: "unknown", footer: aggregate() });
    // @ts-expect-error Any-valued fields do not establish a numeric source.
    column({ id: "unsafe", footer: aggregate() });
    // @ts-expect-error A null-only field does not establish a numeric source.
    column({ id: "empty", footer: aggregate() });
    // @ts-expect-error The field must exist when no accessor is supplied.
    column({ id: "missing", footer: aggregate() });
    // @ts-expect-error A footer without an ID or accessor has no numeric source.
    column({ label: "Total", footer: aggregate() });
  }
});

test("a possible numeric aggregation cannot hide behind a count union", () => {
  function withConditionalAggregation(enabled: boolean) {
    const footer = enabled ? aggregations.sum() : aggregations.count();
    column({ id: "qty", footer });
    // @ts-expect-error The selected aggregation can still require numeric input.
    column({ id: "name", footer });

    const combined: Aggregation<number | null, "sum" | "count"> = footer;
    column({ id: "qty", footer: combined });
    // @ts-expect-error A union of kinds on one callable can still require numeric input.
    column({ id: "name", footer: combined });
  }
  void withConditionalAggregation;
});

test("conditional footers and column alternatives validate every numeric aggregation source", () => {
  function withConditionalDefinition(enabled: boolean) {
    const sum = aggregations.sum();
    column({ id: "qty", footer: enabled ? sum : undefined });
    column({ id: "optional", footer: enabled ? sum : "Total" });
    column({ id: "qty", footer: enabled ? sum : () => "Total" });

    // @ts-expect-error An optional numeric aggregation still requires a numeric source.
    column({ id: "name", footer: enabled ? sum : undefined });
    // @ts-expect-error A string alternative cannot hide a numeric aggregation.
    column({ id: "name", footer: enabled ? sum : "Total" });
    // @ts-expect-error A plain callback alternative cannot hide a numeric aggregation.
    column({ id: "name", footer: enabled ? sum : () => "Total" });
    // @ts-expect-error Every possible source must support the numeric aggregation.
    column({ ...(enabled ? { id: "qty" as const } : { id: "name" as const }), footer: sum });
    // @ts-expect-error A valid alternative must not erase an invalid numeric source.
    column(enabled ? { id: "qty", footer: sum } : { id: "name", footer: sum });

    column({ ...(enabled ? { id: "qty" as const } : { id: "optional" as const }), footer: sum });
    column(enabled ? { id: "qty", footer: sum } : { id: "name", footer: aggregations.count() });
  }
  void withConditionalDefinition;
});

test("accessor output takes precedence and supports computed columns", () => {
  column({
    id: "name",
    type: "number",
    accessor: (row) => row.name.length,
    footer: aggregations.sum(),
  });
  column({
    id: "computed",
    type: "number",
    accessor: (row) => (row.qty == null ? undefined : row.qty * 2),
    footer: aggregations.avg(),
  });
  column({ label: "Computed", accessor: (row) => row.optional, footer: aggregations.min() });

  // @ts-expect-error A string accessor overrides the numeric row field.
  column({ id: "qty", type: "text", accessor: (row) => row.name, footer: aggregations.sum() });
  // @ts-expect-error An unknown accessor overrides the numeric row field.
  column({ id: "qty", accessor: (row) => row.unknown, footer: aggregations.max() });
  // @ts-expect-error An any-valued accessor does not establish a numeric source.
  column({ id: "qty", accessor: (row) => row.unsafe, footer: aggregations.avg() });
  // @ts-expect-error A null-only accessor does not establish a numeric source.
  column({ id: "qty", accessor: () => null, footer: aggregations.min() });

  function withOptionalAccessor(
    numeric: ((row: Row) => number) | undefined,
    text: ((row: Row) => string) | undefined,
  ) {
    column({ id: "qty", accessor: numeric, footer: aggregations.sum() });
    // @ts-expect-error Either accessor output or the fallback field can be nonnumeric.
    column({ id: "qty", accessor: text, footer: aggregations.sum() });
    // @ts-expect-error An absent numeric accessor would fall back to a string field.
    column({ id: "name", accessor: numeric, footer: aggregations.sum() });
  }
  void withOptionalAccessor;
});

test("direct and widened Column definitions retain the existing unchecked source contract", () => {
  const direct: Column<Row>[] = [
    { id: "qty", type: "text", footer: aggregations.sum() },
    { id: "name", type: "number", footer: aggregations.sum() },
  ];
  expectTypeOf(direct).toEqualTypeOf<Column<Row>[]>();

  const widened: Column<Row> = { id: "name", type: "number", footer: aggregations.sum() };
  column(widened);
  column<Column<Row>>({ id: "name", footer: aggregations.avg() });
  defineColumn<Row>({ id: "name", footer: aggregations.avg() });
});

test("union-valued editor presentation types remain compatible without a footer", () => {
  function editorColumn(type: "text" | "number" | "money") {
    const edit = {
      onValueCommitted: (row: Row, value: string | number | null) => {
        void row;
        void value;
      },
    };
    const direct: Column<Row>[] = [{ id: "mixed", type, edit }];
    column({ id: "mixed", type, edit });
    return direct;
  }
  expectTypeOf(editorColumn("text")).toEqualTypeOf<Column<Row>[]>();
});

test("count, static footers and ordinary callback inference remain available", () => {
  column({ id: "name", type: "text", footer: aggregations.count() });
  column({ id: "unknown", footer: aggregations.count() });
  column({ id: "qty", footer: "Total" });
  column({ id: "qty", footer: "" });
  column({
    id: "custom",
    footer: (ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<FooterRenderContext<Row>>();
      expectTypeOf(ctx.rows).toEqualTypeOf<readonly Row[]>();
      expectTypeOf(ctx.column).toEqualTypeOf<Readonly<Column<Row>>>();
      // @ts-expect-error Rows are exposed as a read-only array.
      ctx.rows.push({
        id: "1",
        qty: 1,
        name: "One",
        mixed: 1,
        unknown: null,
        unsafe: null,
        empty: null,
      });
      // @ts-expect-error Column configuration is read-only.
      ctx.column.id = "name";
      // @ts-expect-error The bound row type rejects unknown properties.
      void ctx.rows[0].missing;
      return ctx.rows[0]?.name;
    },
  });
});

test("transformers receive only the final result and can return renderable values", () => {
  column({
    id: "qty",
    footer: aggregations.sum((value) => {
      expectTypeOf(value).toEqualTypeOf<number | null>();
      return value === null ? "Unavailable" : `${value} units`;
    }),
  });
  column({
    id: "name",
    footer: aggregations.count((value) => {
      expectTypeOf(value).toEqualTypeOf<number>();
      return createElement("strong", null, value);
    }),
  });

  const jsx = aggregations.sum((value) => createElement("strong", null, value));
  expectTypeOf(jsx([1, 2])).toMatchTypeOf<ReactElement>();
  column({ id: "qty", footer: jsx });

  const object = aggregations.sum((value) => ({ total: value }));
  expectTypeOf(object([1, 2])).toEqualTypeOf<{ total: number | null }>();
  // @ts-expect-error DataTable cannot render arbitrary transformed objects.
  column({ id: "qty", footer: object });
  // @ts-expect-error Direct definitions also require renderable output.
  const invalid: Column<Row> = { id: "qty", footer: object };
  void invalid;
});

test("detached aggregations do not need a row generic", () => {
  const total = aggregations.sum();
  const formatted = aggregations.avg((value) => value?.toFixed(2) ?? "–");
  expectTypeOf(total).toEqualTypeOf<Aggregation<number | null, "sum">>();
  expectTypeOf(formatted([1, 2])).toEqualTypeOf<string>();
  column({ id: "qty", footer: total });
  column({ id: "qty", footer: formatted });
  const other = createColumnHelper<{ amount: number }>();
  other.column({ id: "amount", footer: total });
  // @ts-expect-error Transforming the output does not make a string input numeric.
  column({ id: "name", footer: formatted });
  // @ts-expect-error A result generic requires a transformer.
  aggregations.sum<string>();
  // @ts-expect-error Aggregations are independent of row-bound helpers.
  void createColumnHelper<Row>().aggregations;
});

test("numeric aggregation inference does not admit unsupported configuration keys", () => {
  // @ts-expect-error Unknown top-level column options are rejected.
  column({ id: "qty", type: "number", footer: aggregations.sum(), bogus: true });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.sum(),
    // @ts-expect-error Business bounds are consumer-owned, including with aggregations.
    edit: { onValueCommitted, min: 0 },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.sum(),
    // @ts-expect-error Validation is not an editor option.
    edit: { onValueCommitted, validate: () => undefined },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.avg(),
    // @ts-expect-error Required is not an editor option.
    edit: { onValueCommitted, required: true },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.min(),
    // @ts-expect-error Decimal formatting belongs to typeOptions.
    edit: { onValueCommitted, maxDecimals: 2 },
  });
  // @ts-expect-error Numeric editors do not accept dropdown options.
  column({
    id: "qty",
    type: "number",
    footer: aggregations.max(),
    edit: { onValueCommitted, options: [] },
  });
  // @ts-expect-error Currency is not a number-cell formatting option.
  column({
    id: "qty",
    type: "number",
    footer: aggregations.sum(),
    typeOptions: { maxDecimals: 2, currency: "USD" },
  });
  column({
    id: "qty",
    type: "text",
    footer: aggregations.sum(),
    // @ts-expect-error Text edit options also retain excess-property checking.
    edit: { onValueCommitted, validate: () => undefined },
  });
  // @ts-expect-error Count uses the legacy exact-options path.
  column({ id: "name", type: "text", footer: aggregations.count(), bogus: true });
});

test("metadata inference preserves source IDs through spread overrides", () => {
  const metadata = {
    name: "row",
    pluralForm: "rows",
    fields: [
      { name: "qty", type: "number", required: false },
      { name: "name", type: "string", required: true },
    ],
  } as const;
  const infer = inferColumns(metadata);
  expectTypeOf(infer("qty").id).toEqualTypeOf<"qty">();

  column({ ...infer("qty"), type: "number", footer: aggregations.sum() });
  column({ ...infer("name"), type: "text", footer: aggregations.count() });
  // @ts-expect-error The inferred string field remains a nonnumeric source.
  column({ ...infer("name"), type: "number", footer: aggregations.sum() });
});

test("column and editor inference remain usable in generic consumers", () => {
  expectTypeOf(preserve(column({ id: "qty", footer: aggregations.sum() }))).toEqualTypeOf<
    Column<Row>
  >();
  column({
    id: "qty",
    type: "number",
    edit: {
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        expectTypeOf(value).toEqualTypeOf<number | null>();
      },
    },
    footer: aggregations.sum(),
  });
});
