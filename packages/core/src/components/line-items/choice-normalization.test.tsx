import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id?: string; value: string | number | null | undefined; editable: boolean };
const cases = [
  { raw: 1, expected: "One" },
  { raw: "1", expected: "One" },
  { raw: 0, expected: "Zero" },
  { raw: "0", expected: "Zero" },
  { raw: null, expected: "—" },
  { raw: undefined, expected: "—" },
  { raw: "", expected: "—" },
  { raw: "unlisted", expected: "unlisted" },
];

it.each(["text", "link", "badge"] as const)(
  "normalizes choice-label lookup for %s without changing adopted values",
  (type) => {
    const source = {
      accessorKey: "value" as const,
      label: "Value",
      edit: {
        editorType: "combobox" as const,
        canEdit: (row: Row) => row.editable,
        editorOptions: {
          options: [
            { value: "1", label: "One" },
            { value: "0", label: "Zero" },
            { value: "null", label: "Not null" },
            { value: "undefined", label: "Not undefined" },
            { value: "", label: "Not empty" },
          ],
        },
      },
    };
    const column: LineItemsColumn<Row> =
      type === "link"
        ? { ...source, type, typeOptions: { href: (row) => `/lines/${row.id}` } }
        : { ...source, type };
    let value!: UseLineItemsReturn<Row>;
    function Owner() {
      value = useLineItems<Row>({
        columns: [column],
        orderer: false,
        defaultLines: cases.flatMap(({ raw }, index) => [
          { id: `${index}-editable`, value: raw, editable: true },
          { id: `${index}-readonly`, value: raw, editable: false },
        ]),
      });
      return (
        <MemoryRouter>
          <LineItems.Root value={value}>
            <LineItems.Table />
          </LineItems.Root>
        </MemoryRouter>
      );
    }
    render(<Owner />);
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(
      cases.flatMap(({ expected }) => [expected, expected]),
    );
    expect(
      screen
        .getAllByRole<HTMLInputElement>("combobox")
        .slice(0, 4)
        .map((input) => input.value),
    ).toEqual(["One", "One", "Zero", "Zero"]);
    expect(value.lines.map((row) => row.value)).toEqual(cases.flatMap(({ raw }) => [raw, raw]));
    expect(value.isDirty).toBe(false);
  },
);
