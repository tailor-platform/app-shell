import { createElement, type ReactNode } from "react";
import { expectTypeOf, test } from "vitest";
import { aggregations } from "@/lib/aggregations";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import { createColumnHelper } from "@/components/data-table/field-helpers";
import type { Column } from "@/components/data-table/types";
import type {
  ColumnDisplayProps,
  FooterRenderContext,
  HeaderRenderContext,
} from "@/components/internals/table-core/column-types";
import { createLineItemHelper } from "@/components/line-items/column-helper";
import type { LineItemsColumn, LineItemsOption } from "@/components/line-items/types";

type Row = {
  id?: string;
  quantity: number | null;
  price: number;
  rate: 10 | 20 | null;
  name: string | null;
  strictName: string;
  status: "open" | "closed" | null;
  optional?: number;
  enabled: boolean;
  date: string | null;
  tags: string[];
  detail: { nested: number } | null;
  mixed: string | number | null;
};

const { column } = createLineItemHelper<Row>();

test("property sources correlate values, rules and readonly row contexts", () => {
  const quantity = column({
    accessorKey: "quantity",
    id: "qty",
    type: "number",
    edit: {
      editorType: "number",
      onValueCommitted: (row, value) => {
        expectTypeOf(value).toEqualTypeOf<number | null>();
        expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
      },
    },
    normalize: (value, row) => {
      expectTypeOf(value).toEqualTypeOf<number | null>();
      expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
      // @ts-expect-error Rule contexts cannot mutate consumer rows.
      row.price = 1;
      return value === null ? null : Math.round(value);
    },
    equals: (left, right, row) => {
      expectTypeOf(left).toEqualTypeOf<number | null>();
      expectTypeOf(right).toEqualTypeOf<number | null>();
      expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
      return Object.is(left, right);
    },
  });
  expectTypeOf(quantity.accessorKey).toEqualTypeOf<"quantity">();
  expectTypeOf(quantity.id).toEqualTypeOf<"qty">();
  expectTypeOf(quantity.type).toEqualTypeOf<"number">();

  column({
    accessorKey: "optional",
    normalize: (value) => {
      expectTypeOf(value).toEqualTypeOf<number | undefined>();
      return value;
    },
  });
  // @ts-expect-error A property name must actually exist on the row.
  column({ accessorKey: "missing" });
  // @ts-expect-error A normalizer cannot widen a numeric property to text.
  column({ accessorKey: "quantity", normalize: () => "wrong" });
  // @ts-expect-error A nullable input cannot use a callback that only accepts number.
  column({ accessorKey: "quantity", normalize: (value: number) => value });
  // @ts-expect-error Method syntax at the call site cannot weaken the declared nullable callback.
  column({
    accessorKey: "quantity",
    normalize(value: number) {
      return value;
    },
  });
  // @ts-expect-error Even an explicitly widened helper argument retains property/rule correlation.
  column<LineItemsColumn<Row>>({ accessorKey: "quantity", normalize: () => "wrong" });
  // @ts-expect-error Column-level validate is replaced by hook document validation.
  column({ accessorKey: "quantity", validate: () => false });
  // @ts-expect-error Equality values remain correlated with the property.
  column({ accessorKey: "name", equals: (left: number, right: number) => left === right });
});

test("value sources are exclusive and computed/source-less columns cannot write", () => {
  column({ accessorKey: "quantity" });
  column({ id: "total", accessor: (row) => row.price * (row.quantity ?? 0), type: "money" });
  column({ id: "actions", render: (row) => createElement("button", null, row.strictName) });
  column({ id: "footer-only", footer: "Total" });
  column({ id: "placeholder", type: "number" });
  // @ts-expect-error Computed sources need an explicit ID.
  column({ accessor: (row: Row) => row.price });
  // @ts-expect-error Source-less columns need an explicit ID.
  column({ label: "Actions", render: (row: Row) => row.strictName });
  // @ts-expect-error No accessor priority: the two source forms are exclusive.
  column({ id: "qty", accessorKey: "quantity", accessor: (row: Row) => row.price });
  // @ts-expect-error An accessor has no built-in LI write target.
  column({ id: "qty", accessor: (row: Row) => row.quantity, edit: { editorType: "number" } });
  // @ts-expect-error Source-less columns have no document property to normalize.
  column({ id: "actions", normalize: (value: unknown) => value });
  // @ts-expect-error Computed display values do not own document validation.
  column({ id: "derived", accessor: (row: Row) => row.price, validate: () => "Invalid" });
});

test("renderer input types and their options stay discriminated", () => {
  column({
    accessorKey: "quantity",
    type: "money",
    typeOptions: {
      currency: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return row.strictName;
      },
      maxDecimals: 4,
    },
  });
  column({
    accessorKey: "date",
    type: "date",
    typeOptions: { dateFormat: "long", locale: "ja-JP" },
  });
  column({ accessorKey: "tags", type: "badge", typeOptions: { maxVisible: 2 } });
  column({
    accessorKey: "name",
    type: "link",
    typeOptions: {
      href: (row) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        return `/rows/${row.id}`;
      },
    },
  });
  column({ accessorKey: "enabled", type: "text" });
  column({ accessorKey: "detail", render: (row) => row.detail?.nested });
  // @ts-expect-error A numeric renderer cannot read string values.
  column({ accessorKey: "name", type: "number" });
  // @ts-expect-error One compatible union member does not make the entire value numeric.
  column({ accessorKey: "mixed", type: "number" });
  // @ts-expect-error Objects require explicit rendering, not a text presentation.
  column({ accessorKey: "detail", type: "text" });
  // @ts-expect-error Link rendering requires href options.
  column({ accessorKey: "name", type: "link" });
  // @ts-expect-error Text rendering has no formatting options.
  column({ accessorKey: "name", type: "text", typeOptions: { maxDecimals: 2 } });
  // @ts-expect-error Currency is not a number renderer option.
  column({ accessorKey: "quantity", type: "number", typeOptions: { currency: "JPY" } });
  // @ts-expect-error Typed computed accessors must return values accepted by their renderer.
  column({ id: "bad", type: "number", accessor: (row: Row) => row.strictName });
});

test("editors are selected by output compatibility, not a display/editor whitelist", () => {
  column({ accessorKey: "quantity", type: "text", edit: { editorType: "number" } });
  column({ accessorKey: "name", edit: { editorType: "text" } });
  column({
    accessorKey: "date",
    edit: { editorType: "date", min: "2026-01-01", max: "2026-12-31" },
  });
  column({ accessorKey: "enabled", type: "text", edit: { editorType: "boolean" } });
  column({ accessorKey: "mixed", edit: { editorType: "number" } });
  // @ts-expect-error Clearing number input can emit null; the row type must permit it.
  column({ accessorKey: "price", edit: { editorType: "number" } });
  // @ts-expect-error Clearing text input can emit null; the row type must permit it.
  column({ accessorKey: "strictName", edit: { editorType: "text" } });
  // @ts-expect-error An unrestricted number editor can emit values outside a literal union.
  column({ accessorKey: "rate", edit: { editorType: "number" } });
  // @ts-expect-error Text output cannot overwrite an array-valued badge property.
  column({ accessorKey: "tags", type: "badge", edit: { editorType: "text" } });
  // @ts-expect-error Number output cannot be adopted by a text-only property.
  column({ accessorKey: "name", edit: { editorType: "number" } });
});

test("date-only editor inputs do not promise Date/epoch conversion", () => {
  type DateRow = {
    instant: Date | string | null;
    epoch: number | string | null;
    day: string | null;
  };
  const dates = createLineItemHelper<DateRow>().column;
  dates({ accessorKey: "instant", type: "date" });
  dates({ accessorKey: "epoch", type: "date" });
  dates({ accessorKey: "day", edit: { editorType: "date" } });
  // @ts-expect-error Date objects need an explicit date-only editing model.
  dates({ accessorKey: "instant", edit: { editorType: "date" } });
  // @ts-expect-error Epoch values are not silently converted by date-only inputs.
  dates({ accessorKey: "epoch", edit: { editorType: "date" } });
});

test("static and remote comboboxes retain number and literal values", () => {
  column({
    accessorKey: "rate",
    type: "money",
    edit: {
      editorType: "combobox",
      options: [
        { value: 10, label: "10%" },
        { value: 20, label: "20%" },
      ],
    },
  });
  const fetcher: AsyncFetcher<LineItemsOption<10 | 20>> = {
    debounceMs: 200,
    fn: async (query, { signal }) => {
      expectTypeOf(query).toEqualTypeOf<string | null>();
      expectTypeOf(signal).toEqualTypeOf<AbortSignal>();
      return [{ value: 10, label: "10%" }];
    },
  };
  column({
    accessorKey: "rate",
    edit: {
      editorType: "combobox",
      fetcher,
      getOptionLabel: (value, row) => {
        expectTypeOf(value).toEqualTypeOf<10 | 20>();
        expectTypeOf(row).toEqualTypeOf<Row>();
        return `${value}: ${row.strictName}`;
      },
    },
  });
  column({
    accessorKey: "status",
    edit: { editorType: "combobox", options: [{ value: "open", label: "Open" }] },
  });
  // @ts-expect-error Numeric choices are not stringified to fit the row type.
  column({
    accessorKey: "rate",
    edit: { editorType: "combobox", options: [{ value: "10", label: "10%" }] },
  });
  // @ts-expect-error Values outside the property's literal union are rejected.
  column({
    accessorKey: "rate",
    edit: { editorType: "combobox", options: [{ value: 30, label: "30%" }] },
  });
  column({
    accessorKey: "rate",
    // @ts-expect-error Both choice source forms cannot be specified together.
    edit: { editorType: "combobox", options: [], fetcher, getOptionLabel: () => "Rate" },
  });
  // @ts-expect-error Remote choices need an editor label for unloaded current values.
  column({ accessorKey: "rate", edit: { editorType: "combobox", fetcher } });
  // @ts-expect-error A remote source's wider values cannot be adopted by a literal property.
  column({
    accessorKey: "rate",
    edit: {
      editorType: "combobox",
      fetcher: async () => [{ value: 30, label: "30%" }],
      getOptionLabel: () => "Rate",
    },
  });
  column({
    accessorKey: "price",
    // @ts-expect-error The standard Clear action emits null even for fixed choices.
    edit: { editorType: "combobox", options: [{ value: 10, label: "10" }] },
  });
});

test("custom editors receive the exact property and cannot widen their writes", () => {
  column({
    accessorKey: "detail",
    edit: {
      editorType: "custom",
      renderEditor: (ctx) => {
        expectTypeOf(ctx.value).toEqualTypeOf<Row["detail"]>();
        expectTypeOf(ctx.row).toEqualTypeOf<Readonly<Row>>();
        expectTypeOf(ctx.ariaLabel).toEqualTypeOf<string>();
        ctx.onCommit({ nested: 1 });
        ctx.onCommit(null);
        // @ts-expect-error Custom editor output is bound to the property, not unknown.
        ctx.onCommit("wrong");
        return createElement("input", { "aria-label": ctx.ariaLabel });
      },
    },
  });
  column({
    accessorKey: "price",
    edit: {
      editorType: "custom",
      renderEditor: (ctx) => {
        ctx.onCommit(1);
        // @ts-expect-error Custom editors do not widen a nonnullable model.
        ctx.onCommit(null);
        return null;
      },
    },
  });
});

test("rules and editability are independent and mode declarations exclude view", () => {
  column({ accessorKey: "quantity", normalize: (value) => value });
  column({
    accessorKey: "name",
    commit: "metadata",
    edit: { editorType: "text", canEdit: (_row, { selected }) => selected },
  });
  column({ accessorKey: "name", edit: { editorType: "text", canEdit: () => false } });
  // @ts-expect-error Business modes belong to consumers, not editor configuration.
  column({ accessorKey: "name", edit: { editorType: "text", modes: ["amend"] } });
  column({
    accessorKey: "quantity",
    // @ts-expect-error Normalization belongs to the property owner, not the editor.
    edit: { editorType: "number", normalize: (value: number) => value },
  });
});

test("presentation callbacks preserve React, header, footer and aggregation contexts", () => {
  column({
    accessorKey: "quantity",
    label: "Quantity",
    width: "flex",
    align: "center",
    header: (ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<HeaderRenderContext>();
      if (ctx.sortable) ctx.activateSort();
      return ctx.label;
    },
    headerProps: (ctx) => ({ title: ctx.label }),
    render: (row) => createElement("strong", null, row.quantity),
    cellProps: (row) => ({ className: row.quantity === null ? "missing" : undefined }),
    footer: aggregations.sum((row) => {
      expectTypeOf(row).toEqualTypeOf<Row>();
      return row.quantity;
    }),
    footerProps: (ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<FooterRenderContext<Row>>();
      return { title: String(ctx.rows.length) };
    },
    truncate: {
      tooltip: ({ row, display }) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        expectTypeOf(display).toEqualTypeOf<ReactNode>();
        return display;
      },
    },
  });
  column({ accessorKey: "name", truncate: true });
  column({ accessorKey: "name", truncate: {} });
  column({ accessorKey: "name", truncate: { tooltip: false } });
  // @ts-expect-error Column names are meaningful text, not arbitrary JSX.
  column({ accessorKey: "name", label: createElement("strong", null, "Name") });
  // @ts-expect-error Structural cell props remain owned by the table.
  column({ accessorKey: "name", cellProps: () => ({ colSpan: 2 }) });
  column({
    accessorKey: "quantity",
    // @ts-expect-error An arbitrary transformed object is not a React footer.
    footer: aggregations.sum(
      (row: Row) => row.quantity,
      (total) => ({ total }),
    ),
  });
});

test("definition-preserving helpers still reject extra configuration keys", () => {
  // @ts-expect-error Generic identity helpers must not swallow unknown root keys.
  column({ accessorKey: "quantity", bogus: true });
  // @ts-expect-error Editor-specific keys are also checked.
  column({ accessorKey: "quantity", edit: { editorType: "number", bogus: true } });
  // @ts-expect-error Number editors do not accept combobox configuration.
  column({ accessorKey: "quantity", edit: { editorType: "number", options: [] } });
  // @ts-expect-error Type-option extras are not accepted by a generic helper.
  column({ accessorKey: "quantity", type: "money", typeOptions: { currency: "JPY", bogus: true } });
  // @ts-expect-error Collection filter settings do not belong to LI.
  column({ accessorKey: "quantity", filter: { type: "number" } });
  const foreign = { accessorKey: "quantity", filter: { type: "number" } } as const;
  // @ts-expect-error Known foreign settings are rejected even through a variable.
  column(foreign);
  // @ts-expect-error LI local sort differs from a collection sort definition.
  column({ accessorKey: "quantity", sort: { field: "quantity", type: "number" } });
});

test("direct arrays, spreads and reusable common display definitions retain their contracts", () => {
  const direct: LineItemsColumn<Row>[] = [
    {
      accessorKey: "quantity",
      normalize: (value) => {
        expectTypeOf(value).toEqualTypeOf<number | null>();
        return value;
      },
    },
    { id: "name", accessor: (row) => row.name, type: "text" },
  ];
  expectTypeOf(direct).toEqualTypeOf<LineItemsColumn<Row>[]>();
  // @ts-expect-error Direct array members also reject wrong normalization output.
  const invalid: LineItemsColumn<Row>[] = [{ accessorKey: "quantity", normalize: () => "wrong" }];
  void invalid;

  const shared = column({ id: "name", accessor: (row) => row.name, type: "text", label: "Name" });
  const dataTableDefinition: Column<Row> = shared;
  const display: ColumnDisplayProps<Row> = shared;
  expectTypeOf(shared.type).toEqualTypeOf<"text">();
  expectTypeOf(shared).not.toHaveProperty("edit");
  expectTypeOf(dataTableDefinition).toMatchTypeOf<Column<Row>>();
  expectTypeOf(display).toMatchTypeOf<ColumnDisplayProps<Row>>();
  const spread = column({ ...shared, footer: aggregations.count((row: Row) => row.name) });
  expectTypeOf(spread.type).toEqualTypeOf<"text">();
});

test("legacy DataTable metadata, callbacks and spread definitions are unchanged", () => {
  const dt = createColumnHelper<Row>();
  const infer = dt.inferColumns({
    name: "row",
    pluralForm: "rows",
    fields: [
      { name: "quantity", type: "number", required: false },
      { name: "strictName", type: "string", required: true },
    ],
  } as const);
  dt.column({
    ...infer("quantity"),
    type: "number",
    edit: {
      onValueCommitted: (row, value) => {
        expectTypeOf(row).toEqualTypeOf<Row>();
        expectTypeOf(value).toEqualTypeOf<number | null>();
      },
    },
    footer: aggregations.sum((row) => row.quantity),
  });
  dt.column({ id: "quantity", type: "number", truncate: true });
  // @ts-expect-error Existing DT's number options still reject currency.
  dt.column({ id: "quantity", type: "number", typeOptions: { currency: "JPY" } });
});
