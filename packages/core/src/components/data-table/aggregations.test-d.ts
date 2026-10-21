import { createElement, type ReactElement } from "react";
import { expectTypeOf, test } from "vitest";
import { createColumnHelper } from "./field-helpers";
import { useDataTable } from "./use-data-table";
import type { Column, FooterRenderContext } from "./types";
import { aggregations, type Aggregation } from "@/lib/aggregations";

type Row = {
  id: string;
  qty: number | null;
  optional?: number;
  name: string;
  mixed: number | string;
  unknown: unknown;
};

const { column, inferColumns } = createColumnHelper<Row>();
const onValueCommitted = () => {};
const rows: Row[] = [{ id: "1", qty: 2, name: "One", mixed: 2, unknown: null }];
const metadata = {
  name: "row",
  pluralForm: "rows",
  fields: [
    { name: "qty", type: "number", required: false },
    { name: "name", type: "string", required: true },
  ],
} as const;

test("numeric aggregation sources follow the selector rather than the column ID or presentation", () => {
  for (const aggregate of [
    aggregations.sum,
    aggregations.avg,
    aggregations.min,
    aggregations.max,
  ]) {
    column({ id: "name", type: "text", footer: aggregate((row) => row.qty) });
    column({ id: "optional", footer: aggregate((row) => row.optional) });
    column({ id: "computed", footer: aggregate((row) => (row.qty ?? 0) * 2) });
    // @ts-expect-error A number presentation does not make the selected string numeric.
    column({ id: "qty", type: "number", footer: aggregate((row) => row.name) });
    // @ts-expect-error Mixed numeric/string values cannot be numerically aggregated.
    column({ id: "mixed", footer: aggregate((row) => row.mixed) });
    // @ts-expect-error Unknown values do not establish a numeric source.
    column({ id: "unknown", footer: aggregate((row) => row.unknown) });
    // @ts-expect-error The selector must reference an existing row field.
    column({ id: "qty", footer: aggregate((row) => row.missing) });
  }
});

test("typed column arrays and metadata spreads preserve selector and render inference", () => {
  const infer = inferColumns(metadata);
  const columns: Column<Row>[] = [
    column({
      ...infer("name"),
      render: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.name;
      },
    }),
    column({
      ...infer("qty"),
      type: "number",
      footer: aggregations.sum((row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.qty;
      }),
    }),
    { id: "name", footer: aggregations.count((row) => row.name) },
  ];
  const checked = [
    { id: "qty", footer: aggregations.avg((row) => row.optional) },
  ] satisfies Column<Row>[];
  expectTypeOf(columns).toEqualTypeOf<Column<Row>[]>();
  expectTypeOf(checked[0].footer({ rows })).toEqualTypeOf<number | null>();
});

test("useDataTable can infer selector rows from its data without an explicit row generic", () => {
  function useInferredTable() {
    return useDataTable({
      data: { rows },
      columns: [
        {
          id: "qty",
          footer: aggregations.sum((row) => {
            expectTypeOf(row).toEqualTypeOf<Row>();
            return row.qty;
          }),
        },
      ],
    });
  }
  void useInferredTable;
});

test("column preserves broad, narrowed-ID and ordinary-footer generic wrappers", () => {
  function define<T extends Column<Row>>(options: T) {
    return column(options);
  }
  function defineNamed<T extends Column<Row> & { id: "name" }>(options: T) {
    return column(options);
  }
  function defineFooter<
    T extends Column<Row> & { footer: (ctx: { rows: readonly Row[] }) => string },
  >(options: T) {
    return column(options);
  }

  expectTypeOf(
    define({ id: "qty", footer: aggregations.sum((row: Row) => row.qty) }),
  ).toEqualTypeOf<Column<Row>>();
  expectTypeOf(defineNamed({ id: "name", type: "text" })).toEqualTypeOf<Column<Row>>();
  expectTypeOf(
    defineFooter({
      id: "name",
      footer: (ctx: FooterRenderContext<Row>) => ctx.rows[0]?.name ?? "",
    }),
  ).toEqualTypeOf<Column<Row>>();
});

test("ordinary footer callbacks and union-valued editor types remain compatible", () => {
  column({ id: "qty", footer: "Total" });
  column({ id: "qty", footer: "" });
  column({
    id: "custom",
    footer: (ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<FooterRenderContext<Row>>();
      expectTypeOf(ctx.rows).toEqualTypeOf<readonly Row[]>();
      // @ts-expect-error The bound row type rejects unknown properties.
      void ctx.rows[0].missing;
      return ctx.rows[0]?.name;
    },
  });

  function editorColumn(type: "text" | "number" | "money") {
    const edit = { onValueCommitted: (_row: Row, _value: string | number | null) => {} };
    const direct: Column<Row>[] = [{ id: "mixed", type, edit }];
    column({ id: "mixed", type, edit });
    return direct;
  }
  expectTypeOf(editorColumn("text")).toEqualTypeOf<Column<Row>[]>();
});

test("transformers infer numeric and count results and support renderable output", () => {
  column({
    id: "qty",
    footer: aggregations.sum(
      (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.qty;
      },
      (value) => {
        expectTypeOf(value).toEqualTypeOf<number | null>();
        return value === null ? "Unavailable" : `${value} units`;
      },
    ),
  });
  column({
    id: "name",
    footer: aggregations.count(
      (row) => row.unknown,
      (value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        return createElement("strong", null, value);
      },
    ),
  });

  const jsx = aggregations.sum(
    (row: Row) => row.qty,
    (value) => createElement("strong", null, value),
  );
  expectTypeOf(jsx({ rows })).toMatchTypeOf<ReactElement>();
  column({ id: "qty", footer: jsx });
});

test("generic object results are available outside DataTable but are not renderable footers", () => {
  const summary = aggregations.sum(
    (row: Row) => row.qty,
    (total) => ({ total }),
  );
  expectTypeOf(summary({ rows })).toEqualTypeOf<{ total: number | null }>();
  // @ts-expect-error DataTable cannot render arbitrary transformed objects.
  column({ id: "qty", footer: summary });
  // @ts-expect-error Direct column definitions also require renderable output.
  const invalid: Column<Row> = { id: "qty", footer: summary };
  column({
    id: "qty",
    // @ts-expect-error Inline transformer output must also be renderable.
    footer: aggregations.sum(
      (row) => row.qty,
      (total) => ({ total }),
    ),
  });
  void invalid;
});

test("detached callbacks support readonly contexts, shared row shapes and primitive rows", () => {
  const total = aggregations.sum((row: Row) => row.qty);
  expectTypeOf(total).toEqualTypeOf<Aggregation<Row, number | null>>();
  expectTypeOf(total({ rows })).toEqualTypeOf<number | null>();
  expectTypeOf(aggregations.count((row: Row) => row.name)({ rows })).toEqualTypeOf<number>();
  expectTypeOf(aggregations.sum((row: Row) => row.qty, undefined)({ rows })).toEqualTypeOf<
    number | null
  >();

  const shared = aggregations.sum((row: { readonly qty: number | null }) => row.qty);
  const frozen = Object.freeze([Object.freeze({ qty: 2 }), Object.freeze({ qty: null })]);
  expectTypeOf(shared({ rows: frozen })).toEqualTypeOf<number | null>();
  column({ id: "qty", footer: shared });
  const numeric = aggregations.sum<number>((value) => value);
  expectTypeOf(numeric({ rows: Object.freeze([1, 2]) })).toEqualTypeOf<number | null>();
});

test("selectors are required and a transformed result requires a matching transformer", () => {
  // @ts-expect-error An aggregation requires a selector.
  aggregations.sum();
  // @ts-expect-error Count also requires a selector.
  aggregations.count();
  // @ts-expect-error A requested transformed result requires a transformer.
  aggregations.sum<Row, string>((row) => row.qty);
  aggregations.sum(
    (row: Row) => row.qty,
    // @ts-expect-error The transformer receives a numeric result, not text.
    (value: string) => value,
  );
});

test("aggregation footers retain existing column, editor and formatting option checks", () => {
  // @ts-expect-error Unknown top-level column options are rejected.
  column({ id: "qty", footer: aggregations.sum((row) => row.qty), bogus: true });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.sum((row) => row.qty),
    // @ts-expect-error Business bounds remain consumer-owned.
    edit: { onValueCommitted, min: 0 },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.avg((row) => row.qty),
    // @ts-expect-error Validation is not an editor option.
    edit: { onValueCommitted, validate: () => undefined },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.avg((row) => row.qty),
    // @ts-expect-error Required is not an editor option.
    edit: { onValueCommitted, required: true },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.min((row) => row.qty),
    // @ts-expect-error Decimal formatting belongs to typeOptions.
    edit: { onValueCommitted, maxDecimals: 2 },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.max((row) => row.qty),
    // @ts-expect-error Numeric editors do not accept dropdown options.
    edit: { onValueCommitted, options: [] },
  });
  column({
    id: "qty",
    type: "number",
    footer: aggregations.max((row) => row.qty),
    // @ts-expect-error Currency is not a number-cell formatting option.
    typeOptions: { maxDecimals: 2, currency: "USD" },
  });
  column({
    id: "qty",
    type: "text",
    footer: aggregations.sum((row) => row.qty),
    // @ts-expect-error Text editor options retain excess-property checks.
    edit: { onValueCommitted, validate: () => undefined },
  });
  // @ts-expect-error Count also rejects unknown column options.
  column({ id: "name", footer: aggregations.count((row) => row.name), bogus: true });
});

test("aggregation footers preserve editor callback inference", () => {
  column({
    id: "qty",
    type: "number",
    edit: {
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        expectTypeOf(value).toEqualTypeOf<number | null>();
      },
    },
    footer: aggregations.sum((row) => row.qty),
  });
});
