import { expect, it } from "vitest";
import { ACTIONS_WIDTH, buildColumnKeys, computePinLayout } from "./column-layout";
import type { Column } from "./types";

it("DataTable's adapter stacks multiple right pins in visible order before Actions", () => {
  type Row = { id: string };
  const columns: Column<Row>[] = [
    { id: "sku", width: 100, pin: "left" },
    { id: "amount", width: 144, pin: "right" },
    { id: "price", width: 120.5, pin: "right" },
  ];
  const layout = computePinLayout(
    columns,
    {},
    {
      hasSelection: false,
      hasExpand: false,
      hasRowActions: true,
      widths: {},
      columnKeys: buildColumnKeys(columns),
    },
  );
  expect(layout.ordered.map((column) => column.id)).toEqual(["sku", "amount", "price"]);
  expect(layout.placements.get(columns[2]!)?.offset).toBe(ACTIONS_WIDTH);
  expect(layout.placements.get(columns[1]!)?.offset).toBe(ACTIONS_WIDTH + 120.5);
  expect(layout.actions?.offset).toBe(0);
});
