import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { aggregations, type Aggregation } from "./aggregations";

const numericKinds = ["sum", "avg", "min", "max"] as const;
type NumericValue = number | null | undefined;
// Exercise runtime validation at an untyped-data boundary.
const selectNumber = (value: unknown) => value as NumericValue;

describe.each(numericKinds)("aggregations.%s", (kind) => {
  it("aggregates finite selected numbers, including zero and negatives, while skipping nullish values", () => {
    const expected = { sum: 6, avg: 2, min: -2, max: 8 };
    expect(aggregations[kind](selectNumber)({ rows: [null, -2, 0, undefined, 8] })).toBe(
      expected[kind],
    );
  });

  it.each([{ rows: [] }, { rows: [null, undefined] }])(
    "handles no numeric values in $rows",
    ({ rows }) => {
      expect(aggregations[kind](selectNumber)({ rows })).toBe(kind === "sum" ? 0 : null);
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
    "rejects the whole aggregate for a selected $name instead of coercing or partially summing",
    ({ value }) => {
      expect(aggregations[kind](selectNumber)({ rows: [1, value, 3] })).toBeNull();
    },
  );

  it("transforms each final result once, including empty and invalid results", () => {
    const transformer = vi.fn((value: number | null) =>
      value === null ? "Unavailable" : `Result: ${value}`,
    );
    const aggregate = aggregations[kind](selectNumber, transformer);
    const expected = { sum: 3, avg: 1.5, min: 1, max: 2 };

    expect(aggregate({ rows: [1, 2] })).toBe(`Result: ${expected[kind]}`);
    expect(transformer).toHaveBeenCalledExactlyOnceWith(expected[kind]);

    expect(aggregate({ rows: [] })).toBe(kind === "sum" ? "Result: 0" : "Unavailable");
    expect(transformer).toHaveBeenCalledTimes(2);
    expect(transformer).toHaveBeenLastCalledWith(kind === "sum" ? 0 : null);

    expect(aggregate({ rows: [1, "2"] })).toBe("Unavailable");
    expect(transformer).toHaveBeenCalledTimes(3);
    expect(transformer).toHaveBeenLastCalledWith(null);
  });
});

describe("selector aggregations", () => {
  it("returns unformatted numeric results by default, including an undefined transformer", () => {
    expect(aggregations.sum(selectNumber)({ rows: [1.25, 2.5] })).toBe(3.75);
    expect(aggregations.avg(selectNumber)({ rows: [1.25, 2.5] })).toBe(1.875);
    expect(aggregations.sum(selectNumber, undefined)({ rows: [1, 2] })).toBe(3);
  });

  it("reuses detached callbacks over selected row fields without retained state", () => {
    type Row = { quantity: number | null };
    const sum = aggregations.sum((row: Row) => row.quantity);
    const formatAverage = aggregations.avg(
      (row: Row) => row.quantity,
      (value) => value?.toFixed(2) ?? "–",
    );

    expect(sum({ rows: [{ quantity: 1 }, { quantity: 2 }, { quantity: null }] })).toBe(3);
    expect(sum({ rows: [{ quantity: 4 }, { quantity: 5 }] })).toBe(9);
    expect(formatAverage({ rows: [{ quantity: 1 }, { quantity: 2 }] })).toBe("1.50");
    expect(formatAverage({ rows: [] })).toBe("–");
  });

  it("preserves arbitrary transformed output without knowing React or DataTable", () => {
    const sum = aggregations.sum(selectNumber, (value) => ({ total: value }));
    expectTypeOf(sum).toEqualTypeOf<Aggregation<unknown, { total: number | null }>>();
    expect(sum({ rows: [1, 2] })).toEqual({ total: 3 });
    expect(aggregations.sum(selectNumber, () => undefined)({ rows: [1, 2] })).toBeUndefined();
    expect(
      aggregations.count(
        (value: unknown) => value,
        () => false,
      )({ rows: [1, 2] }),
    ).toBe(false);
  });

  it("composes row validation with aggregation and result formatting", () => {
    type MoneyLine = { amount: number | null; currency: string };
    const selector = vi.fn((row: MoneyLine) => row.amount);
    const transformer = vi.fn((total: number | null) =>
      total === null ? "Invalid amount" : total.toLocaleString("en-US"),
    );
    const sumAmount = aggregations.sum(selector, transformer);
    const moneyFooter = (ctx: { rows: readonly MoneyLine[] }) => {
      const currencies = new Set(
        ctx.rows.filter((row) => row.amount != null).map((row) => row.currency),
      );
      if (currencies.size > 1) {
        return `Mixed currencies: ${[...currencies].join(", ")}`;
      }
      return sumAmount(ctx);
    };

    const rows: MoneyLine[] = [
      { amount: 1000, currency: "JPY" },
      { amount: 500, currency: "JPY" },
      { amount: null, currency: "USD" },
    ];
    expect(moneyFooter({ rows })).toBe("1,500");
    selector.mockClear();
    transformer.mockClear();

    expect(moneyFooter({ rows: [rows[0], { amount: 500, currency: "USD" }] })).toBe(
      "Mixed currencies: JPY, USD",
    );
    expect(selector).not.toHaveBeenCalled();
    expect(transformer).not.toHaveBeenCalled();

    expect(moneyFooter({ rows: [rows[2]] })).toBe("0");
    expect(moneyFooter({ rows: [] })).toBe("0");
    expect(moneyFooter({ rows: [{ amount: Number.NaN, currency: "JPY" }] })).toBe("Invalid amount");
  });

  it("passes each row alone to its selector and does not select empty input", () => {
    const row = { quantity: 2 };
    const selector = vi.fn((value: typeof row) => value.quantity);
    const sum = aggregations.sum(selector);

    expect(sum({ rows: [row] })).toBe(2);
    expect(selector).toHaveBeenCalledExactlyOnceWith(row);
    expect(sum({ rows: [] })).toBe(0);
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it("does not pass an array index as Number.parseInt's radix", () => {
    expect(aggregations.sum(Number.parseInt)({ rows: ["1", "2", "3"] })).toBe(6);
  });

  it("propagates selector exceptions without evaluating the transformer", () => {
    const transformer = vi.fn((value: number | null) => value);
    const sum = aggregations.sum(() => {
      throw new Error("Selector failed");
    }, transformer);

    expect(() => sum({ rows: [1] })).toThrow("Selector failed");
    expect(transformer).not.toHaveBeenCalled();
  });

  it("propagates transformer exceptions", () => {
    const sum = aggregations.sum(selectNumber, () => {
      throw new Error("Transformer failed");
    });

    expect(() => sum({ rows: [1] })).toThrow("Transformer failed");
  });

  it("returns null for a nonfinite calculated result", () => {
    const rows = [Number.MAX_VALUE, Number.MAX_VALUE];
    expect(aggregations.sum(selectNumber)({ rows })).toBeNull();
    expect(aggregations.avg(selectNumber)({ rows })).toBeNull();
    expect(aggregations.min(selectNumber)({ rows })).toBe(Number.MAX_VALUE);
    expect(aggregations.max(selectNumber)({ rows })).toBe(Number.MAX_VALUE);
  });

  it("finds min and max without spreading a large collection into function arguments", () => {
    const rows = Array.from({ length: 200_000 }, (_, index) => index - 100_000);
    expect(aggregations.min(selectNumber)({ rows })).toBe(-100_000);
    expect(aggregations.max(selectNumber)({ rows })).toBe(99_999);
  });

  it("does not mutate frozen row arrays or row objects", () => {
    const first = Object.freeze({ quantity: 3 });
    const rows = Object.freeze([first, Object.freeze({ quantity: 1 })]);
    for (const kind of numericKinds) {
      aggregations[kind]((row: (typeof rows)[number]) => row.quantity)({ rows });
    }
    expect(aggregations.count((row: (typeof rows)[number]) => row.quantity)({ rows })).toBe(2);
    expect(rows).toEqual([{ quantity: 3 }, { quantity: 1 }]);
    expect(rows[0]).toBe(first);

    const numeric = Object.freeze([3, null, 1]);
    expect(aggregations.sum(selectNumber)({ rows: numeric })).toBe(4);
    expect(numeric).toEqual([3, null, 1]);
  });
});

describe("aggregations.count", () => {
  it("counts non-nullish selected values of any type without a truthiness check", () => {
    const rows = [0, false, "", "text", {}, [], 2n, Number.NaN, Infinity, null, undefined];
    expect(aggregations.count((value: unknown) => value)({ rows })).toBe(9);
  });

  it.each([{ rows: [] }, { rows: [null, undefined] }])(
    "returns zero when there are no non-nullish values in $rows",
    ({ rows }) => {
      expect(aggregations.count((value: unknown) => value)({ rows })).toBe(0);
    },
  );

  it.each([
    { rows: [], expected: 0 },
    { rows: [false, 0, null], expected: 2 },
  ])("transforms the result $expected once", ({ rows, expected }) => {
    const transformer = vi.fn((value: number) => `${value} entries`);
    const count = aggregations.count((value: unknown) => value, transformer);

    expect(count({ rows })).toBe(`${expected} entries`);
    expect(transformer).toHaveBeenCalledExactlyOnceWith(expected);
  });
});
