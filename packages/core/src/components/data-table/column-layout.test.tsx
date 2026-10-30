import { afterEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { resetLocalTimeZone } from "@internationalized/date";
import { TestDataTable, wrapper, headByText, type TestRow } from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, UseDataTableReturn } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetLocalTimeZone();
  vi.restoreAllMocks();
});

describe("DataTable", () => {
  describe("column alignment", () => {
    const alignedColumns: Column<TestRow>[] = [
      { label: "Name", render: (row) => row.name },
      { label: "Amount", render: (row) => row.status, align: "right" },
    ];

    it("applies text-right to the header cell when align=right", () => {
      const { container } = render(<TestDataTable columns={alignedColumns} />, {
        wrapper,
      });
      const heads = container.querySelectorAll('[data-slot="data-table-header"] th');
      expect(heads[0]?.className).not.toContain("text-right");
      expect(heads[1]?.className).toContain("text-right");
    });

    it("applies text-right to body cells when align=right", () => {
      const { container } = render(<TestDataTable columns={alignedColumns} />, {
        wrapper,
      });
      const firstRow = container.querySelector('[data-slot="data-table-row"]');
      const cells = firstRow?.querySelectorAll('[data-slot="data-table-cell"]') ?? [];
      expect(cells[0]?.className).not.toContain("text-right");
      expect(cells[1]?.className).toContain("text-right");
    });

    it("right-aligns the skeleton bar so it doesn't shift on load", () => {
      const { container } = render(
        <TestDataTable columns={alignedColumns} data={undefined} loading />,
        { wrapper },
      );
      const firstSkeleton = container.querySelector('[data-datatable-state="loading"]');
      const skeletonCells = firstSkeleton?.querySelectorAll("td") ?? [];
      const rightCellBar = skeletonCells[1]?.querySelector("div");
      expect(rightCellBar?.className).toContain("ml-auto");
      const leftCellBar = skeletonCells[0]?.querySelector("div");
      expect(leftCellBar?.className).not.toContain("ml-auto");
    });

    it("defaults to left alignment when align is unset", () => {
      const { container } = render(<TestDataTable />, { wrapper });
      const heads = container.querySelectorAll('[data-slot="data-table-header"] th');
      heads.forEach((th) => {
        expect(th.className).not.toContain("text-right");
      });
    });

    it("auto-aligns number columns to the right", () => {
      type NumRow = { id: string; count: number };
      const numRows: NumRow[] = [{ id: "1", count: 42 }];
      const cols: Column<NumRow>[] = [{ label: "Count", type: "number", accessor: (r) => r.count }];
      function Harness() {
        const table = useDataTable<NumRow>({
          columns: cols,
          data: { rows: numRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      const head = container.querySelector('[data-slot="data-table-header"] th');
      const cell = container.querySelector('[data-slot="data-table-cell"]');
      expect(head?.className).toContain("text-right");
      expect(cell?.className).toContain("text-right");
    });

    it("auto-aligns money columns to the right", () => {
      type MoneyRow = { id: string; total: number };
      const moneyRows: MoneyRow[] = [{ id: "1", total: 100 }];
      const cols: Column<MoneyRow>[] = [
        {
          label: "Total",
          type: "money",
          accessor: (r) => r.total,
          typeOptions: { currency: "USD" },
        },
      ];
      function Harness() {
        const table = useDataTable<MoneyRow>({
          columns: cols,
          data: { rows: moneyRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      const head = container.querySelector('[data-slot="data-table-header"] th');
      const cell = container.querySelector('[data-slot="data-table-cell"]');
      expect(head?.className).toContain("text-right");
      expect(cell?.className).toContain("text-right");
    });

    it("does not auto-align non-numeric typed columns (text, date, badge, link)", () => {
      type Row = { id: string; v: string };
      const rows: Row[] = [{ id: "1", v: "x" }];
      const cols: Column<Row>[] = [
        { label: "Text", type: "text", accessor: (r) => r.v },
        { label: "Date", type: "date", accessor: (r) => r.v },
        { label: "Badge", type: "badge", accessor: (r) => r.v },
        {
          label: "Link",
          type: "link",
          accessor: (r) => r.v,
          typeOptions: { href: () => "/x" },
        },
      ];
      function Harness() {
        const table = useDataTable<Row>({ columns: cols, data: { rows } });
        return (
          <MemoryRouter>
            <DataTable.Root value={table}>
              <DataTable.Table />
            </DataTable.Root>
          </MemoryRouter>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      container.querySelectorAll('[data-slot="data-table-header"] th').forEach((th) => {
        expect(th.className).not.toContain("text-right");
      });
    });

    it("explicit align=left overrides the numeric-type auto-default", () => {
      type NumRow = { id: string; count: number };
      const numRows: NumRow[] = [{ id: "1", count: 42 }];
      const cols: Column<NumRow>[] = [
        {
          label: "Count",
          type: "number",
          accessor: (r) => r.count,
          align: "left",
        },
      ];
      function Harness() {
        const table = useDataTable<NumRow>({
          columns: cols,
          data: { rows: numRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      const head = container.querySelector('[data-slot="data-table-header"] th');
      expect(head?.className).not.toContain("text-right");
    });
  });

  describe("pinned columns", () => {
    type Row = { id: string; a: string; b: string; c: string };
    const rows: Row[] = [{ id: "1", a: "A1", b: "B1", c: "C1" }];
    const pinnedCols: Column<Row>[] = [
      { id: "a", label: "A", width: 100, pin: "left", render: (r) => r.a },
      { id: "b", label: "B", width: 100, render: (r) => r.b },
      { id: "c", label: "C", width: 100, pin: "right", render: (r) => r.c },
    ];

    function PinHarness(props: { onSelectionChange?: (ids: string[]) => void }) {
      const table = useDataTable<Row>({
        columns: pinnedCols,
        data: { rows },
        onSelectionChange: props.onSelectionChange,
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }

    it("applies sticky positioning + edge offsets to pinned columns", () => {
      const { container } = render(<PinHarness />, { wrapper });
      const a = headByText(container, "A");
      const c = headByText(container, "C");
      expect(a?.style.position).toBe("sticky");
      expect(a?.style.left).toBe("0px");
      expect(c?.style.position).toBe("sticky");
      expect(c?.style.right).toBe("0px");
      // Non-pinned column is not sticky.
      expect(headByText(container, "B")?.style.position).toBe("");
    });

    it("offsets a left-pinned column past the auto-pinned selection column", () => {
      const { container } = render(<PinHarness onSelectionChange={() => {}} />, { wrapper });
      // Selection column auto-pins to the left edge; column A stacks after it.
      const a = headByText(container, "A");
      expect(a?.style.left).toBe("52px");
    });

    it("marks the boundary pinned cell with a scroll-aware freeze shadow", () => {
      const { container } = render(<PinHarness />, { wrapper });
      // The shadow pseudo-element is revealed only when the container is scrolled
      // under that edge (data-pin-shadow-left / -right toggled by DataTable.Table).
      expect(headByText(container, "A")?.className).toContain("data-pin-shadow-left");
      expect(headByText(container, "C")?.className).toContain("data-pin-shadow-right");
    });

    it("honours a pin without a width (offsets come from measured widths)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const cols: Column<Row>[] = [
        { id: "a", label: "A", pin: "left", render: (r) => r.a },
        { id: "b", label: "B", width: 100, render: (r) => r.b },
      ];
      function Harness() {
        const table = useDataTable<Row>({ columns: cols, data: { rows } });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      // Width is no longer required to pin — the column is still frozen (offsets
      // are measured at runtime), and there is no dev warning.
      expect(headByText(container, "A")?.style.position).toBe("sticky");
      expect(headByText(container, "A")?.style.left).toBe("0px");
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("keeps stored pin state keyed to definition order for a column with no id/label", () => {
      // The middle column has neither `id` nor `label`, so its key falls back to
      // its definition index ("1"). Regression for the two-index-space bug:
      // resolving the render key from the *visible* array would re-key this
      // column to "0" once the column ahead of it is hidden, silently detaching
      // its stored pin (and visibility) state.
      type R = { id: string; a: string; b: string; c: string };
      const dataRows: R[] = [{ id: "1", a: "A1", b: "B1", c: "C1" }];
      const cols: Column<R>[] = [
        { id: "a", label: "A", width: 100, render: (r) => r.a },
        { width: 100, render: (r) => r.b }, // no id, no label → definition key "1"
        { id: "c", label: "C", width: 100, render: (r) => r.c },
      ];
      let api!: UseDataTableReturn<R>;
      function Harness() {
        const table = useDataTable<R>({ columns: cols, data: { rows: dataRows } });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      const keyless = () =>
        container.querySelector<HTMLElement>(
          '[data-slot="data-table-header"] th[data-col-key="1"]',
        );

      // Renders under its definition-order key, then pin it (stored under "1").
      expect(keyless()).not.toBeNull();
      act(() => api.setPin("1", "left"));
      expect(keyless()?.style.position).toBe("sticky");

      // Hiding the column ahead of it must NOT re-key it to its new visible
      // index and drop the pin.
      act(() => api.toggleColumn("a"));
      expect(keyless()?.style.position).toBe("sticky");
    });
  });
});
