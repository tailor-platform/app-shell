import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import type {
  Column,
  DataTableData,
  FooterRenderContext,
  UseDataTableOptions,
  UseDataTableReturn,
} from "@/index";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Line = { id: string; name: string; quantity: number | null; note: string };
const rows: Line[] = [
  { id: "1", name: "Item A", quantity: 2, note: "First" },
  { id: "2", name: "Item B", quantity: 3, note: "Second" },
];
const columns: Column<Line>[] = [
  { id: "name", label: "Item", render: (row) => row.name, footer: () => "Total" },
  {
    id: "quantity",
    label: "Quantity",
    type: "number",
    footer: ({ rows: currentRows }) =>
      currentRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
  },
  { id: "note", label: "Note", render: (row) => row.note },
];
const wrapper = createAppShellWrapper("en");

function Harness({
  tableColumns = columns,
  data = { rows },
  options,
  capture,
  footerBar = false,
}: {
  tableColumns?: Column<Line>[];
  data?: DataTableData<Line>;
  options?: Partial<Omit<UseDataTableOptions<Line>, "columns" | "data">>;
  capture?: (table: UseDataTableReturn<Line>) => void;
  footerBar?: boolean;
}) {
  const table = useDataTable<Line>({ columns: tableColumns, data, ...options });
  capture?.(table);
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
      {footerBar && <DataTable.Footer>Pagination area</DataTable.Footer>}
    </DataTable.Root>
  );
}

const footerOf = (container: HTMLElement) =>
  container.querySelector<HTMLTableSectionElement>('tfoot[data-slot="data-table-column-footer"]');
const footerCells = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLTableCellElement>('[data-slot="data-table-column-footer-cell"]'),
  );
const headerCells = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLTableCellElement>('[data-slot="data-table-header"] th'),
  );
const keysOf = (cells: HTMLTableCellElement[]) => cells.map((cell) => cell.dataset.colKey);

describe("DataTable column footer", () => {
  it.each([false, true])(
    "does not render a footer when no visible column defines one (loading: %s)",
    (loading) => {
      const { container } = render(
        <Harness
          tableColumns={[{ id: "name", label: "Item", render: (row) => row.name }]}
          options={{ loading }}
        />,
        { wrapper },
      );

      expect(container.querySelector("tfoot")).toBeNull();
    },
  );

  it("renders typed and render-only footers after the body, leaving missing and null content blank", () => {
    const typedColumns: Column<Line>[] = [
      columns[0],
      {
        id: "quantity",
        label: "Quantity",
        type: "number",
        footer: (ctx) => {
          expectTypeOf(ctx).toEqualTypeOf<FooterRenderContext<Line>>();
          const { rows: currentRows } = ctx;
          expectTypeOf(currentRows).toEqualTypeOf<readonly Line[]>();
          return <strong>{currentRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0)}</strong>;
        },
      },
      columns[2],
      { id: "id", label: "ID", render: (row) => row.id, footer: () => null },
    ];
    const { container } = render(<Harness tableColumns={typedColumns} />, { wrapper });
    const footer = footerOf(container)!;
    const cells = footerCells(container);

    expect(footer.previousElementSibling?.tagName).toBe("TBODY");
    expect(footer.querySelectorAll("tr")).toHaveLength(1);
    expect(cells.map((cell) => cell.textContent)).toEqual(["Total", "5", "", ""]);
    expect(cells[1].querySelector("strong")?.textContent).toBe("5");
    expect(cells[1].className).toContain("astw:text-right");
    expect(keysOf(cells)).toEqual(keysOf(headerCells(container)));
    expect(footer.className).toContain("astw:sticky");
    expect(footer.className).toContain("astw:bottom-0");
    expect(footer.className).toContain("astw:z-10");
    expect(footer).toMatchSnapshot();
  });

  it("renders aligned footer skeletons without evaluating callbacks during initial loading", () => {
    const label = vi.fn(() => "Total");
    const sum = vi.fn(({ rows: currentRows }: FooterRenderContext<Line>) =>
      currentRows.reduce((total, row) => total + (row.quantity ?? 0), 0),
    );
    const { container } = render(
      <Harness
        tableColumns={[
          { ...columns[0], footer: label },
          { ...columns[1], footer: sum },
          columns[2],
        ]}
        data={{ rows: [] }}
        options={{ loading: true }}
      />,
      { wrapper },
    );
    const cells = footerCells(container);

    expect(footerOf(container)).not.toBeNull();
    expect(keysOf(cells)).toEqual(keysOf(headerCells(container)));
    expect(cells[0].querySelector("div")?.className).toContain("astw:animate-pulse");
    expect(cells[1].querySelector("div")?.className).toContain("astw:animate-pulse");
    expect(cells[1].querySelector("div")?.className).toContain("astw:ml-auto");
    expect(cells[2].childNodes).toHaveLength(0);
    expect(footerOf(container)?.textContent).toBe("");
    expect(label).not.toHaveBeenCalled();
    expect(sum).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "hides footers without evaluating callbacks on error (loading: %s)",
    (loading) => {
      const footer = vi.fn(() => "Total");
      const { container } = render(
        <Harness
          tableColumns={[{ id: "name", label: "Item", render: (row) => row.name, footer }]}
          options={{ loading, error: new Error("Request failed") }}
        />,
        { wrapper },
      );

      expect(footerOf(container)).toBeNull();
      expect(footer).not.toHaveBeenCalled();
    },
  );

  it("evaluates footers with an empty array when there are no data rows", () => {
    const footer = vi.fn(({ rows: currentRows }: FooterRenderContext<Line>) => currentRows.length);
    const { container } = render(
      <Harness
        tableColumns={[{ id: "name", label: "Item", render: (row) => row.name, footer }]}
        data={{ rows: [] }}
      />,
      { wrapper },
    );

    expect(footer).toHaveBeenLastCalledWith({ rows: [] });
    expect(footerCells(container)[0].textContent).toBe("0");
    expect(screen.getByText("No data")).toBeDefined();
  });

  it("keeps the footer mounted during page loading and then displays the new page total", () => {
    const sum = vi.fn(({ rows: currentRows }: FooterRenderContext<Line>) =>
      currentRows.reduce((total, row) => total + (row.quantity ?? 0), 0),
    );
    const tableColumns = [columns[0], { ...columns[1], footer: sum }, columns[2]];
    const pageRows = [{ ...rows[0], quantity: 7 }];
    const { container, rerender } = render(
      <Harness tableColumns={tableColumns} data={{ rows, total: 100 }} />,
      { wrapper },
    );
    const footer = footerOf(container);
    expect(footerCells(container)[1].textContent).toBe("5");
    sum.mockClear();

    rerender(
      <Harness
        tableColumns={tableColumns}
        data={{ rows, total: 100 }}
        options={{ loading: true }}
      />,
    );
    expect(footerOf(container)).toBe(footer);
    expect(footerCells(container)[1].textContent).toBe("");
    expect(footerCells(container)[1].querySelector("div")?.className).toContain(
      "astw:animate-pulse",
    );
    expect(sum).not.toHaveBeenCalled();

    rerender(<Harness tableColumns={tableColumns} data={{ rows: pageRows, total: 100 }} />);
    expect(footerOf(container)).toBe(footer);
    expect(footerCells(container)[1].textContent).toBe("7");
    expect(footerCells(container)[1].querySelector("div")).toBeNull();
    expect(sum).toHaveBeenLastCalledWith({ rows: pageRows });
  });

  it("can display a consumer-provided aggregate without calculating from rows", () => {
    const { container } = render(
      <Harness
        tableColumns={[{ id: "quantity", label: "Quantity", type: "number", footer: () => 900 }]}
      />,
      { wrapper },
    );

    expect(footerCells(container)[0].textContent).toBe("900");
  });

  it("updates the aggregate after the consumer adopts an inline edit", async () => {
    function EditableHarness() {
      const [currentRows, setRows] = useState(rows);
      const table = useDataTable<Line>({
        data: { rows: currentRows },
        columns: [
          columns[0],
          {
            id: "quantity",
            label: "Quantity",
            type: "number",
            footer: ({ rows: footerRows }) =>
              footerRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
            edit: {
              onValueCommitted: (row, value) =>
                setRows((current) =>
                  current.map((line) => (line.id === row.id ? { ...line, quantity: value } : line)),
                ),
            },
          },
        ],
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }
    const user = userEvent.setup();
    const { container } = render(<EditableHarness />, { wrapper });
    const input = screen.getAllByRole("textbox", { name: "Quantity" })[0];

    await user.click(input);
    await user.clear(input);
    await user.type(input, "8");
    await user.keyboard("{Enter}");

    expect(footerCells(container)[1].textContent).toBe("11");
    expect(within(footerOf(container)!).queryByRole("textbox")).toBeNull();
  });

  it("does not evaluate hidden columns and removes the row when its last footer is hidden", () => {
    const footer = vi.fn(() => "Total");
    let table!: UseDataTableReturn<Line>;
    const { container } = render(
      <Harness
        tableColumns={[
          { id: "name", label: "Item", render: (row) => row.name, footer },
          columns[2],
        ]}
        capture={(value) => {
          table = value;
        }}
      />,
      { wrapper },
    );
    expect(footerOf(container)).not.toBeNull();
    footer.mockClear();

    act(() => table.toggleColumn("name"));

    expect(footerOf(container)).toBeNull();
    expect(footer).not.toHaveBeenCalled();
  });

  it("follows runtime column ordering, visibility and pin changes", () => {
    let table!: UseDataTableReturn<Line>;
    const { container } = render(
      <Harness
        capture={(value) => {
          table = value;
        }}
      />,
      { wrapper },
    );

    act(() => table.moveColumn("quantity", 0));
    expect(keysOf(footerCells(container))).toEqual(["quantity", "name", "note"]);
    expect(keysOf(footerCells(container))).toEqual(keysOf(headerCells(container)));

    act(() => table.setPin("note", "left"));
    expect(keysOf(footerCells(container))).toEqual(["note", "quantity", "name"]);
    expect(footerCells(container)[0].style.position).toBe("sticky");
    expect(footerCells(container)[0].style.left).toBe(headerCells(container)[0].style.left);

    act(() => table.toggleColumn("quantity"));
    expect(keysOf(footerCells(container))).toEqual(["note", "name"]);
    expect(keysOf(footerCells(container))).toEqual(keysOf(headerCells(container)));
  });

  it("aligns utility columns and pinned offsets without adding row interactions to the footer", () => {
    const onClickRow = vi.fn();
    let table!: UseDataTableReturn<Line>;
    const { container } = render(
      <Harness
        capture={(value) => {
          table = value;
        }}
        tableColumns={[
          { ...columns[0], pin: "left", width: 120 },
          { ...columns[1], pin: "right", width: 100 },
          columns[2],
        ]}
        options={{
          rowSelection: {},
          rowExpansion: { render: (row) => <div>Details for {row.name}</div> },
          rowActions: [{ id: "inspect", label: "Inspect", onClick: vi.fn() }],
          onClickRow,
        }}
      />,
      { wrapper },
    );
    const footer = footerOf(container)!;
    const heads = headerCells(container);
    const cells = footerCells(container);

    expect(keysOf(cells)).toEqual(keysOf(heads));
    expect(cells).toHaveLength(6);
    for (let index = 0; index < cells.length; index++) {
      expect(cells[index].style.left).toBe(heads[index].style.left);
      expect(cells[index].style.right).toBe(heads[index].style.right);
      expect(cells[index].style.position).toBe(heads[index].style.position);
    }
    expect(cells.filter((cell) => cell.dataset.colKey?.startsWith("__datatable_"))).toHaveLength(3);
    expect(within(footer).queryByRole("checkbox")).toBeNull();
    expect(within(footer).queryByRole("button")).toBeNull();
    expect(within(footer).queryByRole("textbox")).toBeNull();

    fireEvent.click(cells[2]);
    expect(onClickRow).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(rows.length);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(table.selectedIds).toEqual(rows.map((row) => row.id));
  });

  it("remeasures pinned offsets as footer widths and utility columns change", () => {
    const observers: TestResizeObserver[] = [];
    class TestResizeObserver implements ResizeObserver {
      readonly targets = new Set<Element>();
      constructor(readonly callback: ResizeObserverCallback) {
        observers.push(this);
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    let nameWidth = 100;
    const measure = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return new DOMRect(0, 0, this.dataset.colKey === "name" ? nameWidth : 100, 40);
      });
    const stableColumns: Column<Line>[] = [
      {
        ...columns[0],
        pin: "left",
        footer: ({ rows: currentRows }) => currentRows[0]?.name,
      },
      { ...columns[1], pin: "left" },
    ];
    const { container, rerender } = render(<Harness tableColumns={stableColumns} />, { wrapper });
    const nameHeader = headerCells(container)[0];
    const port = container.querySelector('[data-slot="table-container"]')!;
    const notifyResize = (target: Element) => {
      act(() => {
        const entry: ResizeObserverEntry = {
          target,
          contentRect: new DOMRect(),
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        };
        observers
          .filter((observer) => observer.targets.has(target))
          .forEach((observer) => observer.callback([entry], observer));
      });
    };

    expect(footerCells(container)[1].style.left).toBe("100px");
    expect(observers.some((observer) => observer.targets.has(nameHeader))).toBe(true);
    measure.mockClear();
    notifyResize(port);
    expect(measure).not.toHaveBeenCalled();

    rerender(
      <Harness
        tableColumns={stableColumns}
        data={{ rows: [{ ...rows[0], name: "A much longer total label" }] }}
      />,
    );
    nameWidth = 200;
    notifyResize(nameHeader);

    expect(footerCells(container)[0].textContent).toBe("A much longer total label");
    expect(footerCells(container)[1].style.left).toBe("200px");
    expect(headerCells(container)[1].style.left).toBe("200px");

    const utilities: Partial<UseDataTableOptions<Line>>[] = [
      { rowSelection: {} },
      { rowExpansion: { render: () => "Details" } },
      { rowActions: [{ id: "inspect", label: "Inspect", onClick: vi.fn() }] },
    ];
    for (const options of utilities) {
      rerender(<Harness tableColumns={stableColumns} options={options} />);
      const utility = headerCells(container).find((cell) =>
        cell.dataset.colKey?.startsWith("__datatable_"),
      )!;
      expect(observers.some((observer) => observer.targets.has(utility))).toBe(true);
      const expectedOffset = options.rowActions ? "0px" : "100px";
      expect(
        footerCells(container).find((cell) => cell.dataset.colKey === "name")?.style.left,
      ).toBe(expectedOffset);

      rerender(<Harness tableColumns={stableColumns} />);
      expect(observers.some((observer) => observer.targets.has(utility))).toBe(false);
      expect(footerCells(container)[0].style.left).toBe("0px");
    }
  });

  it("keeps the existing DataTable.Footer separate from the table's aggregate row", () => {
    const { container } = render(<Harness footerBar />, { wrapper });
    const aggregate = footerOf(container)!;
    const footerBar = container.querySelector('[data-slot="data-table-footer"]')!;

    expect(aggregate.tagName).toBe("TFOOT");
    expect(footerBar.tagName).toBe("DIV");
    expect(footerBar.textContent).toBe("Pagination area");
    expect(aggregate.closest("table")?.contains(footerBar)).toBe(false);
  });
});
