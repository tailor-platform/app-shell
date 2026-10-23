import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  AGGREGATION,
  aggregations,
  isAggregation,
  type Aggregation,
  type AggregationDefinition,
} from "./aggregations";

const numericKinds = ["sum", "avg", "min", "max"] as const;
const numericFactories: Record<
  (typeof numericKinds)[number],
  {
    (): Aggregation<number | null>;
    <TResult>(transformer: (value: number | null) => TResult): Aggregation<TResult>;
  }
> = aggregations;

describe.each(numericKinds)("aggregations.%s", (kind) => {
  it("aggregates finite numbers, including zero and negatives, while skipping nullish values", () => {
    const expected = { sum: 6, avg: 2, min: -2, max: 8 };
    expect(numericFactories[kind]()([null, -2, 0, undefined, 8])).toBe(expected[kind]);
  });

  it.each([{ values: [] }, { values: [null, undefined] }])(
    "handles no numeric values in $values",
    ({ values }) => {
      expect(numericFactories[kind]()(values)).toBe(kind === "sum" ? 0 : null);
    },
  );

  it.each([
    { name: "numeric string", value: "2" },
    { name: "empty string", value: "" },
    { name: "boolean", value: false },
    { name: "NaN", value: Number.NaN },
    { name: "Infinity", value: Infinity },
    { name: "negative Infinity", value: -Infinity },
    { name: "object", value: {} },
    { name: "array", value: [2] },
    { name: "date", value: new Date("2026-01-01") },
    { name: "bigint", value: 2n },
  ])(
    "rejects the whole aggregate for a $name instead of coercing or partially summing",
    ({ value }) => {
      expect(numericFactories[kind]()([1, value, 3])).toBeNull();
    },
  );

  it("transforms each final result once, including empty and invalid results", () => {
    const transformer = vi.fn((value: number | null) =>
      value === null ? "Unavailable" : `Result: ${value}`,
    );
    const aggregate = numericFactories[kind](transformer);
    const expected = { sum: 3, avg: 1.5, min: 1, max: 2 };

    expect(aggregate([1, 2])).toBe(`Result: ${expected[kind]}`);
    expect(transformer).toHaveBeenCalledExactlyOnceWith(expected[kind]);

    expect(aggregate([])).toBe(kind === "sum" ? "Result: 0" : "Unavailable");
    expect(transformer).toHaveBeenCalledTimes(2);
    expect(transformer).toHaveBeenLastCalledWith(kind === "sum" ? 0 : null);

    expect(aggregate([1, "2"])).toBe("Unavailable");
    expect(transformer).toHaveBeenCalledTimes(3);
    expect(transformer).toHaveBeenLastCalledWith(null);
  });

  it("preserves the operation marker without materializing its phantom result", () => {
    const aggregate = numericFactories[kind]((value) => String(value));
    expect(aggregate[AGGREGATION]).toEqual({ kind });
    expect("result" in aggregate[AGGREGATION]).toBe(false);
    expect(isAggregation(aggregate)).toBe(true);
  });
});

describe("aggregation values and transformations", () => {
  it("returns unformatted numeric results by default", () => {
    expect(aggregations.sum()([1.25, 2.5])).toBe(3.75);
    expect(aggregations.avg()([1.25, 2.5])).toBe(1.875);
    expect(aggregations.sum(undefined)([1, 2])).toBe(3);
  });

  it("reuses detached aggregation functions without row types or retained state", () => {
    const sum = aggregations.sum();
    const formatAverage = aggregations.avg((value) => value?.toFixed(2) ?? "–");
    expect(sum([1, 2, null])).toBe(3);
    expect(sum([4, 5])).toBe(9);
    expect(formatAverage([1, 2])).toBe("1.50");
    expect(formatAverage([])).toBe("–");
  });

  it("accepts arbitrary transformer output without knowing React or another UI", () => {
    const sum = aggregations.sum((value) => ({ type: "p", props: { children: value } }));
    expect(sum([1, 2])).toEqual({ type: "p", props: { children: 3 } });
    expect(aggregations.sum(() => undefined)([1, 2])).toBeUndefined();
    expect(aggregations.count(() => false)([1, 2])).toBe(false);
  });

  it("infers raw and transformed result types without permitting a fake no-argument result type", () => {
    expectTypeOf(aggregations.sum()).toEqualTypeOf<Aggregation<number | null, "sum">>();
    expectTypeOf(aggregations.count()).toEqualTypeOf<Aggregation<number, "count">>();
    expectTypeOf(
      aggregations.avg((value) => {
        expectTypeOf(value).toEqualTypeOf<number | null>();
        return String(value);
      }),
    ).toEqualTypeOf<Aggregation<string, "avg">>();
    expectTypeOf(
      aggregations.count((value) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        return { count: value };
      }),
    ).toEqualTypeOf<Aggregation<{ count: number }, "count">>();

    // @ts-expect-error A requested output type needs a transformer that produces it.
    aggregations.sum<string>();
    // @ts-expect-error The transformer must actually return the requested output type.
    aggregations.sum<string>((value) => value);
  });

  it("preserves output typing in a noncallable definition view without losing callback inference", () => {
    const option: {
      content: AggregationDefinition<number | string | null> | ((ctx: { label: string }) => string);
    } = {
      content: (ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<{ label: string }>();
        return ctx.label;
      },
    };
    expect(typeof option.content).toBe("function");

    const numeric: AggregationDefinition<number> = aggregations.count();
    expect(numeric[AGGREGATION].kind).toBe("count");
    // @ts-expect-error A definition view retains the transformed result type.
    const invalid: AggregationDefinition<number> = aggregations.sum(() => ({ count: 1 }));
    void invalid;
  });

  it("returns null for a nonfinite calculated result", () => {
    const values = [Number.MAX_VALUE, Number.MAX_VALUE];
    expect(aggregations.sum()(values)).toBeNull();
    expect(aggregations.avg()(values)).toBeNull();
    expect(aggregations.min()(values)).toBe(Number.MAX_VALUE);
    expect(aggregations.max()(values)).toBe(Number.MAX_VALUE);
  });

  it("finds min and max without spreading a large collection into function arguments", () => {
    const values = Array.from({ length: 200_000 }, (_, index) => index - 100_000);
    expect(aggregations.min()(values)).toBe(-100_000);
    expect(aggregations.max()(values)).toBe(99_999);
  });

  it("does not mutate frozen input or its values", () => {
    const numeric = Object.freeze([3, null, 1]);
    for (const kind of [...numericKinds, "count"] as const) aggregations[kind]()(numeric);
    expect(numeric).toEqual([3, null, 1]);

    const value = Object.freeze({ name: "Example" });
    const objects = Object.freeze([value]);
    expect(aggregations.count()(objects)).toBe(1);
    expect(aggregations.sum()(objects)).toBeNull();
    expect(objects[0]).toBe(value);
  });

  it("does not identify ordinary callbacks or marker-only objects as callable aggregations", () => {
    expect(isAggregation(() => 1)).toBe(false);
    expect(isAggregation({ [AGGREGATION]: { kind: "sum" } })).toBe(false);
    expect(isAggregation(null)).toBe(false);
    expect(isAggregation("sum")).toBe(false);
  });
});

describe("aggregations.count", () => {
  it("counts non-nullish values of any type without a truthiness check", () => {
    expect(
      aggregations.count()([
        0,
        false,
        "",
        "text",
        {},
        [],
        2n,
        Number.NaN,
        Infinity,
        null,
        undefined,
      ]),
    ).toBe(9);
  });

  it.each([{ values: [] }, { values: [null, undefined] }])(
    "returns zero when there are no non-nullish values in $values",
    ({ values }) => {
      expect(aggregations.count()(values)).toBe(0);
    },
  );

  it.each([
    { values: [], expected: 0 },
    { values: [false, 0, null], expected: 2 },
  ])("transforms the result $expected once", ({ values, expected }) => {
    const transformer = vi.fn((value: number) => `${value} entries`);
    const count = aggregations.count(transformer);
    expect(count(values)).toBe(`${expected} entries`);
    expect(transformer).toHaveBeenCalledExactlyOnceWith(expected);
    expect(count[AGGREGATION].kind).toBe("count");
  });
});
