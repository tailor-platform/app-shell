import { describe, expect, it } from "vitest";

import {
  buildChangeSet,
  cloneBaseline,
  isChangeSetEmpty,
  type LineItemsBaseline,
  type LineItemsColumnDef,
} from "./internals";

type DemoRow = Record<string, unknown> & {
  lineRef: string;
  sku: string;
  qty: number;
  price: string;
};

describe("buildChangeSet", () => {
  const cols: LineItemsColumnDef<DemoRow>[] = [
    { id: "sku", accessorKey: "sku" },
    {
      id: "qty",
      accessorKey: "qty",
      normalize: (v: unknown): unknown => Number(v === "" ? NaN : v),
      equals: (a: unknown, b: unknown) => Number(a) === Number(b),
    },
    {
      id: "price",
      accessorKey: "price",
      normalize: (v: unknown) => (typeof v === "string" ? v.trim() : v),
    },
  ];

  it("reports no-op for pristine baseline-aligned rows", () => {
    const rows: DemoRow[] = [
      { lineRef: "a", sku: "X", qty: 1, price: "10" },
      { lineRef: "b", sku: "Y", qty: 2, price: "20" },
    ];
    const byRef = Object.fromEntries(rows.map((r) => [r.lineRef, r])) as Record<string, DemoRow>;
    const baseline: LineItemsBaseline<DemoRow> = cloneBaseline(
      rows.map((r) => r.lineRef),
      byRef,
    );
    const cs = buildChangeSet(
      cols as never,
      baseline,
      rows.map((r) => r.lineRef),
      byRef,
      new Set<string>(),
      new Set<string>(),
      "sort",
    );
    expect(isChangeSetEmpty(cs)).toBe(true);
  });

  it("detects qty edit as update patch only for changed scalar", () => {
    const baselineRows: DemoRow[] = [{ lineRef: "a", sku: "X", qty: 1, price: "10" }];
    const baseline = cloneBaseline(
      baselineRows.map((r) => r.lineRef),
      Object.fromEntries(baselineRows.map((r) => [r.lineRef, r])) as Record<string, DemoRow>,
    );
    const current: DemoRow = { ...baselineRows[0]!, qty: 2 };

    const byRef = { a: current } as Record<string, DemoRow>;
    const cs = buildChangeSet(cols as never, baseline, ["a"], byRef, new Set(), new Set(), "sort");

    expect(cs.lineChanges).toEqual([
      {
        action: "update",
        lineId: "a",
        patch: { qty: 2 },
      },
    ]);
  });

  it("treats string qty 10 and number 10 as equal when normalized", () => {
    const baselineRows: DemoRow[] = [{ lineRef: "a", sku: "X", qty: 10, price: "1" }];
    const baseline = cloneBaseline(
      baselineRows.map((r) => r.lineRef),
      Object.fromEntries(baselineRows.map((r) => [r.lineRef, r])) as Record<string, DemoRow>,
    );

    /** Round-trip phantom: normalized forms match */
    const current: DemoRow = { ...baselineRows[0]!, qty: Number("10.00") } as DemoRow;

    const cs = buildChangeSet(
      cols as never,
      baseline,
      ["a"],
      { a: current } as Record<string, DemoRow>,
      new Set(),
      new Set(),
      "sort",
    );

    expect(isChangeSetEmpty(cs)).toBe(true);
  });

  it("emits insert for client-only refs", () => {
    const baseline = cloneBaseline<DemoRow>([], {});
    const newRow: DemoRow = { lineRef: "n1", sku: "Z", qty: 5, price: "9" };

    const order = ["n1"];

    const byRef = { n1: newRow } as Record<string, DemoRow>;

    const cs = buildChangeSet(
      cols as never,
      baseline,
      order,
      byRef,
      new Set(),
      new Set<string>(["n1"]),
      "sort",
    );

    expect(cs.lineChanges.some((x) => x.action === "add" && x.tempId === "n1")).toBe(true);
    expect(cs.isEmpty).toBe(false);
  });
});
