import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LineItems } from "./LineItems";
import { createLineItemHelper } from "./field";
import { useLineItems } from "./use-line-items";
import type { LineItemsField, LineItemsRowData } from "./types";

afterEach(() => {
  cleanup();
});

type Row = LineItemsRowData & { sku: string; qty: number; total: number };

const f = createLineItemHelper<Row>();

const fields: LineItemsField<Row>[] = [
  f.field({ key: "sku", label: "SKU", render: (l) => l.sku, width: 120, pinned: "left" }),
  f.field({
    key: "qty",
    label: "Qty",
    render: (l) => l.qty,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
    width: 100,
  }),
  f.field({
    key: "total",
    label: "Total",
    render: (l) => l.total,
    width: 140,
  }),
];

const data: Row[] = [
  { lineRef: "a", sku: "X", qty: 2, total: 20 },
  { lineRef: "b", sku: "Y", qty: 5, total: 50 },
];

function Harness({
  withTotals = false,
  withRowActions = false,
}: {
  withTotals?: boolean;
  withRowActions?: boolean;
}) {
  const lineItems = useLineItems<Row>({ fields, data });
  return (
    <LineItems.Root value={lineItems}>
      <LineItems.Table
        maxBodyHeight={300}
        rowActions={
          withRowActions
            ? (line) => <button data-testid={`act-${line.lineRef}`}>×</button>
            : undefined
        }
      />
      {withTotals ? (
        <LineItems.TotalsRow<Row>>
          {(lines) => ({
            qty: lines.reduce((s, l) => s + l.qty, 0),
            total: lines.reduce((s, l) => s + l.total, 0),
          })}
        </LineItems.TotalsRow>
      ) : null}
    </LineItems.Root>
  );
}

describe("LineItems.Table", () => {
  it("applies sticky-left positioning to a field with pinned: 'left'", () => {
    render(<Harness />);
    // Find the SKU header cell and confirm it has position: sticky on the left.
    const skuHeader = screen.getByText("SKU").closest("th");
    expect(skuHeader).toBeTruthy();
    expect(skuHeader!.style.position).toBe("sticky");
    expect(skuHeader!.style.left).toBe("0px");
    // The next non-pinned column ("Qty") should NOT be sticky.
    const qtyHeader = screen.getByText("Qty").closest("th");
    expect(qtyHeader!.style.position).toBe("");
  });

  it("renders the TotalsRow with values aligned to the column keys", () => {
    render(<Harness withTotals />);
    // Sum of qty = 7, sum of total = 70.
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("70")).toBeTruthy();
  });

  it("registers a trailing pinned-right column when rowActions prop is set", () => {
    const { container } = render(<Harness withRowActions />);
    // 3 field columns (SKU + Qty + Total) + 1 actions + 1 trailing spacer = 5 ths.
    const ths = container.querySelectorAll("thead th");
    expect(ths.length).toBe(5);
    // Second-to-last is the actions column (last is the unsized spacer).
    const actions = ths[ths.length - 2] as HTMLElement;
    expect(actions.style.position).toBe("sticky");
    expect(actions.style.right).toBe("0px");
    // Trailing spacer should NOT be pinned (so it can absorb leftover space).
    const spacer = ths[ths.length - 1] as HTMLElement;
    expect(spacer.getAttribute("data-slot")).toBe("line-items-spacer-th");
  });
});
