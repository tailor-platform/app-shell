import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Row = {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  status: string;
  date: string;
};
const rows: Row[] = [
  {
    id: "A",
    name: "Widget",
    quantity: 2,
    price: 12.5,
    status: "open",
    date: "2026-10-09T00:00:00Z",
  },
];
const columns: LineItemsColumn<Row>[] = [
  { accessorKey: "name", id: "product", label: "Product", type: "text" },
  { accessorKey: "quantity", label: "Quantity", type: "number", typeOptions: { locale: "en-US" } },
  {
    accessorKey: "price",
    label: "Price",
    type: "money",
    typeOptions: { locale: "en-US", currency: "USD" },
  },
  {
    accessorKey: "status",
    label: "Status",
    type: "badge",
    typeOptions: { badgeLabelMap: { open: "Open" } },
  },
  { accessorKey: "date", label: "Date", type: "date", typeOptions: { locale: "en-US" } },
  {
    id: "total",
    label: "Total",
    accessor: (row) => row.quantity * row.price,
    type: "money",
    typeOptions: { locale: "en-US" },
  },
  {
    id: "link",
    label: "Link",
    accessor: (row) => row.name,
    type: "link",
    typeOptions: { href: (row) => `/products/${row.id}` },
  },
  {
    id: "custom",
    label: "Custom",
    render: (row) => <strong>{row.name} details</strong>,
    align: "center",
  },
];

function Harness({
  data = rows,
  cols = columns,
  timeZone = "America/New_York",
  locale = "en",
  emptyMessage,
}: {
  data?: Row[];
  cols?: LineItemsColumn<Row>[];
  timeZone?: string;
  locale?: string;
  emptyMessage?: string;
}) {
  const value = useLineItems({ columns: cols, defaultLines: data });
  return (
    <MemoryRouter>
      <AppShellConfigContext.Provider
        value={{ configurations: buildConfigurations({ modules: [], locale, timeZone }) }}
      >
        <LineItems.Root value={value} className="custom-frame">
          <LineItems.Table
            aria-label="Order lines"
            className="custom-table"
            emptyMessage={emptyMessage}
          />
        </LineItems.Root>
      </AppShellConfigContext.Provider>
    </MemoryRouter>
  );
}

describe("readonly LineItems display", () => {
  it("renders property, computed and custom cells through a semantic, non-editable table", () => {
    const { container } = render(<Harness />);
    const table = screen.getByRole("table", { name: "Order lines" });
    const cells = within(table).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "Widget",
      "2",
      "$12.50",
      "Open",
      "Oct 8, 2026",
      "$25.00",
      "Widget",
      "Widget details",
    ]);
    expect(screen.getByRole("link", { name: "Widget" }).getAttribute("href")).toBe("/products/A");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .every((header) => header.getAttribute("scope") === "col"),
    ).toBe(true);
    expect(cells[1].className).toContain("astw:text-right");
    expect(cells[7].className).toContain("astw:text-center");
    expect(table.className).toContain("custom-table");
    expect(container.querySelector('[data-slot="line-items"]')?.className).toContain(
      "custom-frame",
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not infer a value from a source-less column's ID", () => {
    render(<Harness cols={[{ id: "name", label: "No source", type: "text" }]} />);
    expect(screen.getByRole("cell").textContent).toBe("—");
  });

  it("keeps custom rendering authoritative, including null output", () => {
    const accessor = vi.fn(() => "2026-10-09");
    render(
      <Harness
        cols={[
          {
            id: "custom",
            type: "date",
            typeOptions: { locale: "not a locale" },
            accessor,
            render: () => null,
          },
        ]}
      />,
    );
    expect(screen.getByRole("cell").textContent).toBe("");
    expect(accessor).not.toHaveBeenCalled();
  });

  it("retains initial rows while accepting new columns and timezone configuration", () => {
    const { rerender } = render(<Harness />);
    const firstRow = screen.getAllByRole("row")[1];
    rerender(
      <Harness
        data={[{ ...rows[0], name: "Replacement" }]}
        cols={columns.slice(0, 5)}
        timeZone="Asia/Tokyo"
      />,
    );
    expect(screen.getByText("Widget")).toBeDefined();
    expect(screen.queryByText("Replacement")).toBeNull();
    expect(screen.getByText("Oct 9, 2026")).toBeDefined();
    expect(screen.getAllByRole("row")[1]).toBe(firstRow);
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("shares date formatters across rows and repeated rendering", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locale, options) {
      return new DateTimeFormat(locale, options);
    });
    const data = [rows[0], { ...rows[0], id: "B", date: "2026-10-09" }];
    const cols = [columns[4]];
    const { rerender } = render(<Harness data={data} cols={cols} />);
    rerender(<Harness data={data} cols={cols} />);
    expect(
      spy.mock.calls
        .filter(([locale, options]) => locale === "en-US" && options?.month === "short")
        .map(([, options]) => options?.timeZone),
    ).toEqual(["America/New_York", "UTC"]);
  });

  it("renders an empty message spanning every column, including with no columns", () => {
    const { rerender } = render(
      <Harness data={[]} cols={columns.slice(0, 2)} emptyMessage="No order lines" />,
    );
    expect(screen.getByRole("cell").getAttribute("colspan")).toBe("2");
    expect(screen.getByText("No order lines")).toBeDefined();
    rerender(<Harness data={[]} cols={[]} />);
    expect(screen.getByRole("cell").getAttribute("colspan")).toBe("1");
    expect(screen.getByText("No lines yet.")).toBeDefined();
  });

  it("localizes the default table name and empty state", () => {
    function Japanese() {
      const value = useLineItems<Row>({ columns, defaultLines: [] });
      return (
        <LineItems.Root value={value}>
          <LineItems.Table />
        </LineItems.Root>
      );
    }
    render(
      <AppShellConfigContext.Provider
        value={{ configurations: buildConfigurations({ modules: [], locale: "ja" }) }}
      >
        <Japanese />
      </AppShellConfigContext.Provider>,
    );
    expect(screen.getByRole("table", { name: "明細" })).toBeDefined();
    expect(screen.getByText("明細がありません。")).toBeDefined();
  });

  it("requires Root context", () => {
    expect(() => render(<LineItems.Table />)).toThrow(
      "LineItems.Table must be rendered inside LineItems.Root",
    );
  });
});
