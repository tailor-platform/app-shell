/** Retained in declarations because public aggregation types use this symbol. */
export const AGGREGATION = Symbol("Aggregation");

export type AggregationKind = "sum" | "avg" | "min" | "max" | "count";

export interface AggregationDefinition<
  TResult = unknown,
  TKind extends AggregationKind = AggregationKind,
> {
  readonly [AGGREGATION]: {
    readonly kind: TKind;
    // Phantom result preserves output typing when consumers omit the callable signature.
    readonly result?: TResult;
  };
}

/** A reusable value aggregation, optionally followed by a result transformation. */
export type Aggregation<
  TResult = number | null,
  TKind extends AggregationKind = AggregationKind,
> = ((values: readonly unknown[]) => TResult) & AggregationDefinition<TResult, TKind>;

function aggregateNumbers(
  values: readonly unknown[],
  kind: Exclude<AggregationKind, "count">,
): number | null {
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

function createAggregationFactory<TValue, TKind extends AggregationKind>(
  kind: TKind,
  calculate: (values: readonly unknown[]) => TValue,
) {
  function create(transformer?: undefined): Aggregation<TValue, TKind>;
  function create<TResult>(transformer: (value: TValue) => TResult): Aggregation<TResult, TKind>;
  function create(transformer?: (value: TValue) => unknown): Aggregation<unknown, TKind> {
    return Object.assign(
      (values: readonly unknown[]) => {
        const value = calculate(values);
        return transformer ? transformer(value) : value;
      },
      { [AGGREGATION]: { kind } },
    );
  }
  return create;
}

/**
 * Create reusable aggregations over raw values, independent of rows and UI.
 * Nullish values are skipped; numeric aggregations reject any other non-number
 * or non-finite input with null. A transformer receives the final result once,
 * including empty or invalid results.
 */
export const aggregations = {
  /** Sum finite numbers. Empty input returns zero; invalid input returns null. */
  sum: createAggregationFactory("sum", (values) => aggregateNumbers(values, "sum")),
  /** Average non-nullish finite numbers; empty or invalid input returns null. */
  avg: createAggregationFactory("avg", (values) => aggregateNumbers(values, "avg")),
  /** Minimum finite number; empty or invalid input returns null. */
  min: createAggregationFactory("min", (values) => aggregateNumbers(values, "min")),
  /** Maximum finite number; empty or invalid input returns null. */
  max: createAggregationFactory("max", (values) => aggregateNumbers(values, "max")),
  /** Count non-nullish values of any type, including zero, false, and empty strings. */
  count: createAggregationFactory("count", (values) =>
    values.reduce<number>((count, value) => (value == null ? count : count + 1), 0),
  ),
};

/** @internal Distinguishes tagged aggregations from ordinary callbacks. */
export function isAggregation(value: unknown): value is Aggregation<unknown> {
  return typeof value === "function" && AGGREGATION in value;
}
