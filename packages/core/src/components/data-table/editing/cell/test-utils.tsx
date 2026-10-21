import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { useState } from "react";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { DataTable } from "../../data-table";
import { useDataTable } from "../../use-data-table";
import { createColumnHelper } from "../../field-helpers";
import type { CellEditState, Column, UseDataTableOptions } from "../../types";

export type Line = {
  id: string;
  sku: string;
  status?: string;
  expected?: string | null;
  ordered: number;
  received: number | null;
  price: number;
  currency: string;
  note: string | null;
  supplier: string;
};

export const LINES: Line[] = [
  {
    id: "1",
    sku: "TS-M",
    ordered: 24,
    received: 12,
    price: 9.5,
    currency: "USD",
    note: "Box 1",
    supplier: "Acme",
  },
  {
    id: "2",
    sku: "TS-L",
    ordered: 24,
    received: null,
    price: 1200,
    currency: "JPY",
    note: null,
    supplier: "Globex",
  },
  {
    id: "3",
    sku: "TS-XL",
    ordered: 12,
    received: 10,
    price: 4,
    currency: "USD",
    note: "",
    supplier: "Acme",
  },
];

export const noop = () => {};

export type Update = (id: string, patch: Partial<Line>) => void;

export function Harness({
  columns,
  rows: initialRows = LINES,
  options,
}: {
  columns: (update: Update) => Column<Line>[];
  rows?: Line[];
  options?: Partial<UseDataTableOptions<Line>>;
}) {
  const [rows, setRows] = useState(initialRows);
  const update: Update = (id, patch) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const table = useDataTable<Line>({ columns: columns(update), data: { rows }, ...options });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

export function renderTable(ui: React.ReactElement, locale = "en") {
  const user = userEvent.setup();
  render(<MemoryRouter>{ui}</MemoryRouter>, { wrapper: createAppShellWrapper(locale) });
  return user;
}

export const { column } = createColumnHelper<Line>();

export const skuColumn = column({ id: "sku", label: "SKU", type: "text" });

export function receivedColumn(
  onValueCommitted: (id: string, value: number | null) => void,
  update: Update,
  edit: { canEdit?: (row: Line, state: CellEditState) => boolean } = {},
): Column<Line> {
  return column({
    id: "received",
    label: "Received",
    type: "number",
    edit: {
      onValueCommitted: (row, value) => {
        onValueCommitted(row.id, value);
        update(row.id, { received: value });
      },
      ...edit,
    },
  });
}

// user-event collapses the real editor's select-all, so replace explicitly.
export async function retype(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
  text: string,
) {
  await user.click(input);
  await user.clear(input);
  if (text) await user.keyboard(text);
}
