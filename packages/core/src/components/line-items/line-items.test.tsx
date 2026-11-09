import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./document";
import type { UseLineItemsReturn } from "./types";

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

// Happy DOM lacks DragEvent; the browser tests cover native dragging.
function dispatchDrag(type: string, target: Element, init: MouseEventInit = {}) {
  const event = Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }), {
    dataTransfer: { effectAllowed: "", dropEffect: "", setData: vi.fn() },
  });
  fireEvent(target, event);
  return event;
}

function Harness({
  data = rows,
  cols = columns,
  timeZone = "America/New_York",
  locale = "en",
  emptyMessage,
  orderer,
}: {
  data?: Row[];
  cols?: LineItemsColumn<Row>[];
  timeZone?: string;
  locale?: string;
  emptyMessage?: string;
  orderer?: boolean;
}) {
  const value = useLineItems({ columns: cols, defaultLines: data, orderer });
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

describe("LineItems table", () => {
  it("renders property, computed and custom cells through a semantic, non-editable table", () => {
    const { container } = render(<Harness orderer={false} />);
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
    render(<Harness orderer={false} cols={[{ id: "name", label: "No source", type: "text" }]} />);
    expect(screen.getByRole("cell").textContent).toBe("—");
  });

  it("keeps custom rendering authoritative, including null output", () => {
    const accessor = vi.fn(() => "2026-10-09");
    render(
      <Harness
        orderer={false}
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
    const { rerender } = render(<Harness orderer={false} />);
    const firstRow = screen.getAllByRole("row")[1];
    rerender(
      <Harness
        orderer={false}
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

  it.each([
    { count: 2, message: "No order lines", orderer: true },
    { count: 0, message: undefined, orderer: true },
    { count: 2, message: "No order lines", orderer: false },
    { count: 0, message: undefined, orderer: false },
  ])("spans all columns when empty ($count, orderer: $orderer)", ({ count, message, orderer }) => {
    render(
      <Harness data={[]} cols={columns.slice(0, count)} emptyMessage={message} orderer={orderer} />,
    );
    expect(screen.getByRole("cell").getAttribute("colspan")).toBe(
      String(Math.max(1, count + (orderer ? 1 : 0))),
    );
    expect(screen.getByText(message ?? "No lines yet.")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("moves persisted and unsaved rows by default with keyboard focus and boundary guards", async () => {
    const user = userEvent.setup();
    const submit = vi.fn((event: FormEvent) => event.preventDefault());
    const data = [
      rows[0],
      { ...rows[0], id: "B", name: "Second" },
      { ...rows[0], id: undefined, name: "Unsaved" },
      { ...rows[0], id: "D", name: "Fourth" },
      { ...rows[0], id: "E", name: "Fifth" },
    ];
    render(
      <form onSubmit={submit}>
        <Harness data={data} />
      </form>,
    );
    const table = screen.getByRole("table", { name: "Order lines" });
    const originalRows = within(table).getAllByRole("row").slice(1);
    const names = () =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);
    const handle = screen.getByRole("button", { name: "Reorder line 3" });
    expect(within(originalRows[2]).getAllByRole("cell")[0].contains(handle)).toBe(true);
    expect(handle.getAttribute("draggable")).toBe("true");
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("status").textContent).toBe("");

    await user.click(handle);
    await user.keyboard("{ArrowUp}");
    expect(names()).toEqual(["Widget", "Unsaved", "Second", "Fourth", "Fifth"]);
    expect(document.activeElement).toBe(handle);
    await user.keyboard("{ArrowUp}");
    expect(names()).toEqual(["Unsaved", "Widget", "Second", "Fourth", "Fifth"]);
    expect(screen.getByRole("status").textContent).toBe("Moved line 2 to position 1.");
    await user.keyboard("{ArrowUp}");
    expect(names()).toEqual(["Unsaved", "Widget", "Second", "Fourth", "Fifth"]);
    expect(document.activeElement).toBe(handle);

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(names()).toEqual(["Widget", "Second", "Unsaved", "Fourth", "Fifth"]);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(names()).toEqual(["Widget", "Second", "Fourth", "Fifth", "Unsaved"]);
    expect(screen.getByRole("status").textContent).toBe("Moved line 4 to position 5.");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(names()).toEqual(["Widget", "Second", "Fourth", "Fifth", "Unsaved"]);
    expect(document.activeElement).toBe(handle);
    expect(within(table).getAllByRole("row").slice(1)).toEqual([
      originalRows[0],
      originalRows[1],
      originalRows[3],
      originalRows[4],
      originalRows[2],
    ]);
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    {
      from: 0,
      target: 4,
      after: true,
      expected: ["Second", "Unsaved", "Fourth", "Fifth", "Widget"],
    },
    {
      from: 4,
      target: 0,
      after: false,
      expected: ["Fifth", "Widget", "Second", "Unsaved", "Fourth"],
    },
    {
      from: 2,
      target: 3,
      after: true,
      expected: ["Widget", "Second", "Fourth", "Unsaved", "Fifth"],
    },
    {
      from: 4,
      target: 1,
      after: false,
      expected: ["Widget", "Fifth", "Second", "Unsaved", "Fourth"],
    },
    {
      from: 2,
      target: 2,
      after: true,
      expected: ["Widget", "Second", "Unsaved", "Fourth", "Fifth"],
    },
    {
      from: 2,
      target: 2,
      after: false,
      expected: ["Widget", "Second", "Unsaved", "Fourth", "Fifth"],
    },
    {
      from: 2,
      target: 1,
      after: true,
      expected: ["Widget", "Second", "Unsaved", "Fourth", "Fifth"],
    },
    {
      from: 2,
      target: 3,
      after: false,
      expected: ["Widget", "Second", "Unsaved", "Fourth", "Fifth"],
    },
  ])("drops row $from at row $target (after: $after)", ({ from, target, after, expected }) => {
    const data = [
      rows[0],
      { ...rows[0], id: "B", name: "Second" },
      { ...rows[0], id: undefined, name: "Unsaved" },
      { ...rows[0], id: "D", name: "Fourth" },
      { ...rows[0], id: "E", name: "Fifth" },
    ];
    render(<Harness data={data} />);
    const bodyRows = screen.getAllByRole("row").slice(1);
    const handle = within(bodyRows[from]).getByRole("button");
    expect(within(bodyRows[from]).getAllByRole("cell")[0].contains(handle)).toBe(true);
    vi.spyOn(bodyRows[target], "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 100, 400, 40),
    );
    const drop = { clientY: after ? 130 : 110 };
    handle.focus();
    const start = dispatchDrag("dragstart", handle);
    expect(bodyRows[from].getAttribute("data-dragging")).toBe("");
    expect(start.dataTransfer.effectAllowed).toBe("move");
    const hover = dispatchDrag("dragover", bodyRows[target], drop);
    expect(bodyRows[target].getAttribute("data-drop-position")).toBe(after ? "after" : "before");
    expect(hover.dataTransfer.dropEffect).toBe("move");
    expect(screen.getByRole("status").textContent).toBe("");
    dispatchDrag("drop", bodyRows[target], drop);
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent),
    ).toEqual(expected);
    expect(document.activeElement).toBe(handle);
    expect(
      bodyRows.every(
        (row) => !row.hasAttribute("data-drop-position") && !row.hasAttribute("data-dragging"),
      ),
    ).toBe(true);
  });

  it("ignores foreign drops and clears indicators when dragging is cancelled or leaves the table", () => {
    const data = [rows[0], { ...rows[0], id: "B", name: "Second" }];
    render(
      <>
        <Harness data={data} />
        <Harness data={data} />
      </>,
    );
    const tables = screen.getAllByRole("table", { name: "Order lines" });
    const source = within(tables[0]).getAllByRole("row")[1];
    const target = within(tables[0]).getAllByRole("row")[2];
    const foreign = within(tables[1]).getAllByRole("row")[2];
    const handle = within(source).getByRole("button");
    dispatchDrag("dragstart", handle);
    dispatchDrag("dragover", foreign, { clientY: 1 });
    dispatchDrag("drop", foreign, { clientY: 1 });
    expect(foreign.hasAttribute("data-drop-position")).toBe(false);
    dispatchDrag("dragover", target, { clientY: 1 });
    expect(target.hasAttribute("data-drop-position")).toBe(true);
    dispatchDrag("dragleave", target.parentElement!, {
      relatedTarget: within(target).getAllByRole("cell")[0],
    });
    expect(target.hasAttribute("data-drop-position")).toBe(true);
    dispatchDrag("dragleave", target.parentElement!, { relatedTarget: null });
    expect(target.hasAttribute("data-drop-position")).toBe(false);
    dispatchDrag("dragover", target, { clientY: 1 });
    dispatchDrag("dragend", handle);
    expect(source.hasAttribute("data-dragging")).toBe(false);
    expect(target.hasAttribute("data-drop-position")).toBe(false);
    dispatchDrag("drop", target, { clientY: 1 });
    for (const table of tables) {
      expect(
        within(table)
          .getAllByRole("row")
          .slice(1)
          .map((row) => within(row).getAllByRole("cell")[1].textContent),
      ).toEqual(["Widget", "Second"]);
    }
  });

  it("hides ordering controls when disabled and preserves rows across policy changes", async () => {
    const user = userEvent.setup();
    const data = [rows[0], { ...rows[0], id: "B", name: "Second" }];
    const { rerender } = render(<Harness data={data} orderer={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Order" })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<Harness data={data} orderer={true} />);
    dispatchDrag("dragstart", screen.getByRole("button", { name: "Reorder line 1" }));
    dispatchDrag("dragover", screen.getAllByRole("row")[2], { clientY: 1 });
    rerender(<Harness data={data} orderer={false} />);
    dispatchDrag("drop", screen.getAllByRole("row")[2], { clientY: 1 });
    rerender(<Harness data={data} orderer={true} />);
    dispatchDrag("drop", screen.getAllByRole("row")[2], { clientY: 1 });
    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell")[1].textContent).toBe(
      "Widget",
    );
    await user.click(screen.getByRole("button", { name: "Reorder line 1" }));
    await user.keyboard("{ArrowDown}");
    const movedRows = screen.getAllByRole("row").slice(1);
    rerender(<Harness data={data} orderer={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Order" })).toBeNull();
    expect(screen.getAllByRole("row").slice(1)).toEqual(movedRows);
    expect(within(movedRows[0]).getAllByRole("cell")[0].textContent).toBe("Second");
  });

  it("disables reordering for a single row and localizes ordering labels", async () => {
    const user = userEvent.setup();
    render(<Harness locale="ja" />);
    expect(screen.getByRole("columnheader", { name: "並び順" })).toBeDefined();
    const handle = screen.getByRole("button", { name: "1行目の並び替え" });
    expect(handle.getAttribute("aria-disabled")).toBe("true");
    expect(handle.getAttribute("draggable")).toBe("false");
    await user.click(handle);
    await user.keyboard("{ArrowUp}{ArrowDown}");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("reflects row commands without remounting existing rows or adding editor UI", () => {
    let value!: UseLineItemsReturn<Row>;
    function DocumentTable() {
      value = useLineItems({ columns, defaultLines: rows });
      return (
        <MemoryRouter>
          <LineItems.Root value={value}>
            <LineItems.Table aria-label="Order lines" />
          </LineItems.Root>
        </MemoryRouter>
      );
    }
    render(<DocumentTable />);
    const firstRow = screen.getAllByRole("row")[1];
    act(() => value.updateField("A", "quantity", 3));
    expect(screen.getByText("$37.50")).toBeDefined();
    expect(screen.getAllByRole("row")[1]).toBe(firstRow);
    let key = "";
    act(() => {
      key = value.addLine({ ...rows[0], name: "New line" });
    });
    const creationRow = screen.getAllByRole("row")[2];
    act(() => value.updateField(key, "quantity", 4));
    expect(screen.getAllByRole("row")[2]).toBe(creationRow);
    act(() => value.reorderLine("A", key));
    expect(screen.getAllByRole("row")[1]).toBe(creationRow);
    expect(screen.getAllByRole("row")[2]).toBe(firstRow);
    expect(value.isDirty).toBe(true);
    act(() => {
      value.removeLine("A");
      value.revert();
    });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("$25.00")).toBeDefined();
    expect(value.isDirty).toBe(false);
    expect(screen.queryByRole("textbox")).toBeNull();
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
