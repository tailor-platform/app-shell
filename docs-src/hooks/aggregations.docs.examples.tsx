import { aggregations, Text, type Aggregation } from "@tailor-platform/app-shell";

export function BasicUsage() {
  type Line = { quantity: number | null };
  const sum = aggregations.sum((row: Line) => row.quantity);
  const summary: Aggregation<Line, string> = aggregations.sum(
    (row: Line) => row.quantity,
    (value) => (value === null ? "Unavailable" : `${value} units`),
  );

  return (
    <div className="flex flex-col gap-2">
      <Text.p>
        First collection:{" "}
        <output>{sum({ rows: [{ quantity: 1 }, { quantity: 2 }, { quantity: null }] })}</output>
      </Text.p>
      <Text.p>
        Second collection, with no previous aggregate state:{" "}
        <output>{sum({ rows: [{ quantity: 4 }, { quantity: 5 }] })}</output>
      </Text.p>
      <Text.p>
        Formatted total: <output>{summary({ rows: [{ quantity: 1 }, { quantity: 2 }] })}</output>
      </Text.p>
    </div>
  );
}

export function OptionalTransformer() {
  type Line = { quantity: number | null };
  const averageText = aggregations.avg(
    (row: Line) => row.quantity,
    (value) => value?.toFixed(2) ?? "–",
  );
  const detailed = aggregations.sum(
    (row: Line) => row.quantity,
    (total) => ({ total, valid: total !== null }),
  );

  return (
    <div className="flex flex-col gap-2">
      <Text.p>
        Average:{" "}
        <output>
          {averageText({ rows: [{ quantity: 1 }, { quantity: null }, { quantity: 2 }] })}
        </output>
      </Text.p>
      <Text.p>
        Structured result:{" "}
        <output>{JSON.stringify(detailed({ rows: [{ quantity: 1 }, { quantity: 2 }] }))}</output>
      </Text.p>
    </div>
  );
}

export function BusinessValidation() {
  type MoneyLine = { amount: number | null; currency: string };
  const sumAmount = aggregations.sum(
    (row: MoneyLine) => row.amount,
    (total) => (total === null ? "Invalid amount" : total.toLocaleString("en-US")),
  );
  const moneyFooter = (ctx: { rows: readonly MoneyLine[] }) => {
    const currencies = new Set(
      ctx.rows.filter((row) => row.amount != null).map((row) => row.currency),
    );
    if (currencies.size > 1) {
      return `Mixed currencies: ${[...currencies].join(", ")}`;
    }
    return sumAmount(ctx);
  };

  return (
    <div className="flex flex-col gap-2">
      <Text.p>
        Same currency:{" "}
        <output>
          {moneyFooter({
            rows: [
              { amount: 1000, currency: "JPY" },
              { amount: 500, currency: "JPY" },
            ],
          })}
        </output>
      </Text.p>
      <Text.p>
        Mixed currencies:{" "}
        <output>
          {moneyFooter({
            rows: [
              { amount: 1000, currency: "JPY" },
              { amount: 500, currency: "USD" },
            ],
          })}
        </output>
      </Text.p>
    </div>
  );
}
