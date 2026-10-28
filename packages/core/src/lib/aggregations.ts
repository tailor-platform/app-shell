/** A reusable aggregation over selected row values, optionally followed by a result transformation. */
export type Aggregation<TRow, TResult = number | null> = (context: {
  rows: readonly TRow[];
}) => TResult;

type NumericValue = number | null | undefined;
type NumericAggregationKind = "sum" | "avg" | "min" | "max";

function aggregateNumbers(values: readonly unknown[], kind: NumericAggregationKind): number | null {
  let count = 0;
  let result = 0;
  for (const value of values) {
    if (value == null) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;

    if (kind === "min") result = count === 0 ? value : Math.min(result, value);
    else if (kind === "max") result = count === 0 ? value : Math.max(result, value);
    else result += value;
    count += 1;
  }

  if (count === 0) return kind === "sum" ? 0 : null;
  if (kind === "avg") result /= count;
  return Number.isFinite(result) ? result : null;
}

function createAggregationFactory<TSource, TValue>(
  calculate: (values: readonly TSource[]) => TValue,
) {
  function create<TRow>(
    selector: (row: TRow) => TSource,
    transformer?: undefined,
  ): Aggregation<TRow, TValue>;
  function create<TRow, TResult>(
    selector: (row: TRow) => TSource,
    transformer: (value: TValue) => TResult,
  ): Aggregation<TRow, TResult>;
  function create<TRow>(
    selector: (row: TRow) => TSource,
    transformer?: (value: TValue) => unknown,
  ): Aggregation<TRow, unknown> {
    return ({ rows }) => {
      const value = calculate(rows.map((row) => selector(row)));
      return transformer ? transformer(value) : value;
    };
  }
  return create;
}

/**
 * Create reusable callbacks over `{ rows }`, independent of UI and column definitions.
 * Selectors choose each row's value; an optional transformer receives the final
 * result once, including empty or invalid results. Neither callback should mutate rows.
 */
export const aggregations = {
  /** Sum finite selected numbers. Empty input returns zero; invalid input returns null. */
  sum: createAggregationFactory<NumericValue, number | null>((values) =>
    aggregateNumbers(values, "sum"),
  ),
  /** Average non-nullish finite selected numbers; empty or invalid input returns null. */
  avg: createAggregationFactory<NumericValue, number | null>((values) =>
    aggregateNumbers(values, "avg"),
  ),
  /** Minimum finite selected number; empty or invalid input returns null. */
  min: createAggregationFactory<NumericValue, number | null>((values) =>
    aggregateNumbers(values, "min"),
  ),
  /** Maximum finite selected number; empty or invalid input returns null. */
  max: createAggregationFactory<NumericValue, number | null>((values) =>
    aggregateNumbers(values, "max"),
  ),
  /** Count non-nullish selected values, including zero, false, and empty strings. */
  count: createAggregationFactory<unknown, number>((values) =>
    values.reduce<number>((count, value) => (value == null ? count : count + 1), 0),
  ),
};
