import { afterEach, describe, it, expect, expectTypeOf, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData, RowAction, UseDataTableReturn } from "./types";

afterEach(() => {
  cleanup();
});

type TestRow = { id: string; name: string; status: string };

const testColumns: Column<TestRow>[] = [
  { label: "Name", render: (row) => row.name },
  { label: "Status", render: (row) => row.status },
];

const testData: DataTableData<TestRow> = {
  rows: [
    { id: "1", name: "Alice", status: "Active" },
    { id: "2", name: "Bob", status: "Inactive" },
  ],
};

function makeControl(overrides?: Partial<CollectionControl>): CollectionControl {
  return {
    filters: [],
    addFilter: vi.fn(),
    setFilters: vi.fn(),
    removeFilter: vi.fn(),
    clearFilters: vi.fn(),
    sortStates: [],
    setSort: vi.fn(),
    clearSort: vi.fn(),
    pageSize: 10,
    setPageSize: vi.fn(),
    goToNextPage: vi.fn(),
    goToPrevPage: vi.fn(),
    resetPage: vi.fn(),
    goToFirstPage: vi.fn(),
    goToLastPage: vi.fn(),
    resetCount: 0,
    getHasPrevPage: () => false,
    getHasNextPage: (pageInfo) => pageInfo.hasNextPage,
    ...overrides,
  };
}

function TestDataTable(props: {
  columns?: Column<TestRow>[];
  data?: DataTableData<TestRow> | undefined;
  loading?: boolean;
  error?: Error | null;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const {
    columns = testColumns,
    data = "data" in props ? props.data : testData,
    loading,
    error,
    onSelectionChange,
  } = props;
  const table = useDataTable<TestRow>({
    columns,
    data,
    loading,
    error,
    onSelectionChange,
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

const wrapper = createAppShellWrapper("en");

const headByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="data-table-header"] th')).find(
    (th) => th.textContent?.trim() === text,
  );

// When a cell is wrapped in `Tooltip.Trigger`, Base UI tags the trigger
// element with a generated `base-ui-…` id (used for the popup's
// `aria-describedby` pointer). We assert that id's presence as the
// structural signal that the tooltip is wired — it sidesteps Base UI's
// hover-delay timer machinery, which is awkward to drive in jsdom.
const isTooltipWired = (cell: Element | null) =>
  typeof cell?.id === "string" && cell.id.startsWith("base-ui-");

describe("DataTable", () => {
  it("renders a basic data table with headers and rows", () => {
    render(<TestDataTable />, { wrapper });

    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("renders loading state", () => {
    const { container } = render(<TestDataTable data={undefined} loading />, {
      wrapper,
    });

    expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
      0,
    );
  });

  it("renders error state", () => {
    render(<TestDataTable data={undefined} error={new Error("Network error")} />, { wrapper });

    expect(screen.getByText(/Network error/)).toBeDefined();
  });

  it("renders empty state", () => {
    const emptyData: DataTableData<TestRow> = {
      rows: [],
    };
    render(<TestDataTable data={emptyData} />, { wrapper });

    expect(screen.getByText("No data")).toBeDefined();
  });

  it("renders with data-slot attributes", () => {
    const { container } = render(<TestDataTable />, { wrapper });

    expect(container.querySelector('[data-slot="data-table"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-table"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-header"]')).toBeDefined();
    expect(container.querySelector('[data-slot="data-table-body"]')).toBeDefined();
  });

  describe("custom headers", () => {
    it("renders custom header content", () => {
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          header: (
            <>
              <span>Customer</span>
              <span aria-hidden>*</span>
            </>
          ),
          render: (row) => row.name,
        },
      ];

      render(<TestDataTable columns={columns} />, { wrapper });

      expect(screen.getByText("Customer")).toBeDefined();
      expect(screen.getByText("*")).toBeDefined();
      expect(screen.queryByText("Name")).toBeNull();
    });

    it("passes non-sortable context when sort config exists but sorting is inactive", () => {
      let seenSortable: boolean | undefined;
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          sort: { field: "name", type: "string" },
          header: (ctx) => {
            seenSortable = ctx.sortable;
            return ctx.sortable ? "sortable" : "static";
          },
          render: (row) => row.name,
        },
      ];

      render(<TestDataTable columns={columns} />, { wrapper });

      expect(screen.getByText("static")).toBeDefined();
      expect(seenSortable).toBe(false);
    });

    it("passes sortable context and activateSort reuses the shared sort behavior", () => {
      const control = makeControl({
        sortStates: [{ field: "name", direction: "Asc" }],
      });

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
              header: (ctx) =>
                ctx.sortable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      ctx.activateSort();
                    }}
                  >
                    {ctx.label} {ctx.sortDirection}
                  </button>
                ) : null,
              render: (row) => row.name,
            },
          ],
          data: testData,
          control,
        });

        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      render(<Harness />, { wrapper });

      fireEvent.click(screen.getByRole("button", { name: "Name Asc" }));

      expect(control.clearSort).toHaveBeenCalled();
      expect(control.setSort).toHaveBeenCalledWith("name", "Desc");
    });

    it("narrows header render context by sortable", () => {
      const column: Column<TestRow> = {
        label: "Name",
        header: (ctx) => {
          if (ctx.sortable) {
            expectTypeOf(ctx).toEqualTypeOf<{
              label?: string;
              sortable: true;
              sortDirection: "Asc" | "Desc" | undefined;
              activateSort: () => void;
            }>();
          } else {
            expectTypeOf(ctx).toEqualTypeOf<{
              label?: string;
              sortable: false;
            }>();
          }
          return ctx.label;
        },
        render: (row) => row.name,
      };

      expect(column).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // State exclusivity (loading / error / empty / data)
  // -------------------------------------------------------------------------
  describe("state exclusivity", () => {
    it("shows only skeleton when loading=true, regardless of data", () => {
      const { container } = render(<TestDataTable data={testData} loading />, {
        wrapper,
      });

      expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
        0,
      );
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only skeleton when loading=true and error is also set", () => {
      const { container } = render(
        <TestDataTable data={undefined} loading error={new Error("fail")} />,
        { wrapper },
      );

      expect(container.querySelectorAll('[data-datatable-state="loading"]').length).toBeGreaterThan(
        0,
      );
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
    });

    it("shows only error when loading=false and error is set, even with data", () => {
      const { container } = render(<TestDataTable data={testData} error={new Error("fail")} />, {
        wrapper,
      });

      expect(container.querySelector('[data-datatable-state="error"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only empty state when loading=false, no error, and rows is empty", () => {
      const { container } = render(<TestDataTable data={{ rows: [] }} />, {
        wrapper,
      });

      expect(container.querySelector('[data-datatable-state="empty"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-slot="data-table-row"]')).toBeNull();
    });

    it("shows only data rows when loading=false, no error, and rows exist", () => {
      const { container } = render(<TestDataTable />, { wrapper });

      expect(container.querySelectorAll('[data-slot="data-table-row"]').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('[data-datatable-state="loading"]')).toHaveLength(0);
      expect(container.querySelector('[data-datatable-state="error"]')).toBeNull();
      expect(container.querySelector('[data-datatable-state="empty"]')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------
  describe("loading skeleton", () => {
    it("renders DEFAULT_ROWS (5) skeleton rows when loading with no data", () => {
      const { container } = render(<TestDataTable data={undefined} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows).toHaveLength(5);
    });

    it("renders skeleton rows even when data is present while loading", () => {
      const { container } = render(<TestDataTable data={testData} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
    });

    it("hides actual data rows while loading", () => {
      render(<TestDataTable data={testData} loading />, { wrapper });

      expect(screen.queryByText("Alice")).toBeNull();
      expect(screen.queryByText("Bob")).toBeNull();
    });

    it("each skeleton row has one cell per visible column", () => {
      const { container } = render(<TestDataTable data={undefined} loading />, {
        wrapper,
      });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // testColumns has 2 columns, no selection, no row actions
        expect(row.querySelectorAll("td")).toHaveLength(2);
      });
    });

    it("skeleton rows include selection cell when onSelectionChange is provided", () => {
      const { container } = render(
        <TestDataTable data={undefined} loading onSelectionChange={vi.fn()} />,
        { wrapper },
      );

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // 2 columns + 1 selection cell
        expect(row.querySelectorAll("td")).toHaveLength(3);
      });
    });

    it("skeleton rows include actions cell when rowActions are provided", () => {
      const rowActions: RowAction<TestRow>[] = [{ id: "edit", label: "Edit", onClick: vi.fn() }];

      function TestDataTableWithActions() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: undefined,
          loading: true,
          rowActions,
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }

      const { container } = render(<TestDataTableWithActions />, { wrapper });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      skeletonRows.forEach((row) => {
        // 2 columns + 1 actions cell
        expect(row.querySelectorAll("td")).toHaveLength(3);
      });
    });

    it("does not render skeleton rows when not loading", () => {
      const { container } = render(<TestDataTable />, { wrapper });

      const skeletonRows = container.querySelectorAll('[data-datatable-state="loading"]');
      expect(skeletonRows).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Column alignment
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Column truncate
  // -------------------------------------------------------------------------
  describe("column truncate", () => {
    it("constrains the cell width and truncates in an inner span when truncate=true", () => {
      const cols: Column<TestRow>[] = [
        {
          label: "Name",
          render: (row) => row.name,
          accessor: (row) => row.name,
          truncate: true,
        },
        { label: "Status", render: (row) => row.status },
      ];
      const { container } = render(<TestDataTable columns={cols} />, {
        wrapper,
      });
      const firstRow = container.querySelector('[data-slot="data-table-row"]');
      const cells = firstRow?.querySelectorAll('[data-slot="data-table-cell"]') ?? [];
      // The cell keeps the width constraint but NOT `overflow: hidden` (which would
      // clip a pinned column's freeze shadow); truncation moves to an inner span.
      expect(cells[0]?.className).toContain("max-w-0");
      expect(cells[0]?.className).not.toContain("astw:truncate");
      expect(cells[0]?.querySelector('span[class*="truncate"]')).toBeTruthy();
      expect(cells[1]?.className).not.toContain("max-w-0");
      expect(cells[1]?.querySelector('span[class*="truncate"]')).toBeFalsy();
    });

    it("wires a Tooltip when accessor returns a string", () => {
      const cols: Column<TestRow>[] = [
        {
          label: "Name",
          render: (row) => <strong>{row.name}</strong>,
          accessor: (row) => row.name,
          truncate: true,
        },
      ];
      const { container } = render(<TestDataTable columns={cols} />, {
        wrapper,
      });
      const cells = container.querySelectorAll('[data-slot="data-table-cell"]');
      expect(isTooltipWired(cells[0] ?? null)).toBe(true);
      expect(isTooltipWired(cells[1] ?? null)).toBe(true);
    });

    it("wires a Tooltip when accessor returns a number", () => {
      type NumRow = { id: string; count: number };
      const numRows: NumRow[] = [{ id: "1", count: 42 }];
      const cols: Column<NumRow>[] = [
        {
          label: "Count",
          render: (row) => row.count,
          accessor: (row) => row.count,
          truncate: true,
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
      const cell = container.querySelector('[data-slot="data-table-cell"]');
      expect(isTooltipWired(cell)).toBe(true);
    });

    it("does not wire a Tooltip when accessor returns a non-stringifiable value", () => {
      type ObjRow = { id: string; meta: { tags: string[] } };
      const objRows: ObjRow[] = [{ id: "1", meta: { tags: ["a"] } }];
      const cols: Column<ObjRow>[] = [
        {
          label: "Meta",
          render: (row) => JSON.stringify(row.meta),
          accessor: (row) => row.meta,
          truncate: true,
        },
      ];
      function Harness() {
        const table = useDataTable<ObjRow>({
          columns: cols,
          data: { rows: objRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      const cell = container.querySelector('[data-slot="data-table-cell"]');
      // Truncation still applies (inner span), but no Tooltip wraps the cell.
      expect(cell?.querySelector('span[class*="truncate"]')).toBeTruthy();
      expect(isTooltipWired(cell)).toBe(false);
    });

    it("does not wire a Tooltip when accessor is not provided", () => {
      const cols: Column<TestRow>[] = [
        {
          label: "Name",
          render: (row) => row.name,
          truncate: true,
        },
      ];
      const { container } = render(<TestDataTable columns={cols} />, {
        wrapper,
      });
      const cell = container.querySelector('[data-slot="data-table-cell"]');
      expect(cell?.querySelector('span[class*="truncate"]')).toBeTruthy();
      expect(isTooltipWired(cell)).toBe(false);
    });

    it("wires a Tooltip via row[col.id] when accessor is omitted but id matches a row field", () => {
      // Mirrors the `infer("...")` shape: no `accessor`, but `id` is pinned
      // to a row field so the cell renderer's `row[col.id]` fallback can
      // resolve the value for both rendering and the truncate tooltip.
      const cols: Column<TestRow>[] = [
        {
          id: "name",
          label: "Name",
          render: (row) => <strong>{row.name}</strong>,
          truncate: true,
        },
      ];
      const { container } = render(<TestDataTable columns={cols} />, {
        wrapper,
      });
      const cells = container.querySelectorAll('[data-slot="data-table-cell"]');
      expect(isTooltipWired(cells[0] ?? null)).toBe(true);
      expect(isTooltipWired(cells[1] ?? null)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Row selection (DOM)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Type-aware cell renderers
  // -------------------------------------------------------------------------
  describe("column type renderers", () => {
    type TypedRow = {
      id: string;
      name: string | null;
      total: number | null;
      currency: string;
      placedAt: string | null;
      status: string;
      detailUrl: string | null;
    };

    const typedRows: TypedRow[] = [
      {
        id: "1",
        name: "Order 1",
        total: 1234.5,
        currency: "USD",
        placedAt: "2026-04-09T12:00:00Z",
        status: "shipped",
        detailUrl: "/orders/1",
      },
      {
        id: "2",
        name: null,
        total: null,
        currency: "JPY",
        placedAt: null,
        status: "unknown",
        detailUrl: null,
      },
    ];

    function renderTypedTable(columns: Column<TypedRow>[]) {
      function Harness() {
        const table = useDataTable<TypedRow>({
          columns,
          data: { rows: typedRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      return render(<Harness />, { wrapper });
    }

    it("renders text cells with — placeholder for null values", () => {
      const { container } = renderTypedTable([
        { label: "Name", type: "text", accessor: (r) => r.name },
      ]);
      expect(container.textContent).toContain("Order 1");
      expect(container.textContent).toContain("—");
    });

    it("renders money cells with currency formatting", () => {
      const { container } = renderTypedTable([
        {
          label: "Total",
          type: "money",
          accessor: (r) => r.total,
          typeOptions: { currency: "USD", locale: "en-US" },
        },
      ]);
      expect(container.textContent).toContain("$1,234.50");
    });

    it("reads currency from row via function accessor", () => {
      const { container } = renderTypedTable([
        {
          label: "Total",
          type: "money",
          accessor: (r) => r.total ?? 0,
          typeOptions: { currency: (r) => r.currency, locale: "en-US" },
        },
      ]);
      // First row: USD 1234.5 → "$1,234.50". Second row: JPY 0 → "¥0".
      expect(container.textContent).toContain("$1,234.50");
      expect(container.textContent).toContain("¥0");
    });

    it("renders date cells with short format by default", () => {
      const { container } = renderTypedTable([
        {
          label: "Placed",
          type: "date",
          accessor: (r) => r.placedAt,
          typeOptions: { locale: "en-US" },
        },
      ]);
      expect(container.textContent).toMatch(/Apr 9, 2026/);
    });

    it("renders badge cells via variant/label maps", () => {
      const { container } = renderTypedTable([
        {
          label: "Status",
          type: "badge",
          accessor: (r) => r.status,
          typeOptions: {
            badgeVariantMap: { shipped: "success" },
            badgeLabelMap: { shipped: "Shipped" },
          },
        },
      ]);
      expect(container.textContent).toContain("Shipped");
      // Unknown values still render but with default variant + raw label
      expect(container.textContent).toContain("unknown");
    });

    it("renders multiple badges from array accessor", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["urgent", "fragile"],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
              typeOptions: {
                badgeVariantMap: { urgent: "error", fragile: "warning" },
              },
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("urgent");
      expect(container.textContent).toContain("fragile");
    });

    it("renders maxVisible badges with +N overflow in DataTable", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["a", "b", "c", "d"],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
              typeOptions: { maxVisible: 2 },
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("b");
      expect(container.textContent).toContain("+2");
      expect(container.textContent).not.toContain("c");
      expect(container.textContent).not.toContain("d");
    });

    it("renders placeholder for empty array in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: [] as string[],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders placeholder for array of all-null values in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: [null, null] as (string | null)[],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags as unknown as string[],
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders placeholder for array of empty strings in badge column", () => {
      const rows = [
        {
          id: "1",
          name: "Item",
          tags: ["", ""],
          status: "shipped",
          amount: 100,
          date: "2026-01-01",
          detailUrl: "/items/1",
        },
      ];
      function Harness() {
        const table = useDataTable<(typeof rows)[number]>({
          columns: [
            {
              label: "Tags",
              type: "badge",
              accessor: (r) => r.tags,
            },
          ],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("—");
    });

    it("renders link cells with anchor when href is provided", () => {
      function RouterWrapper({ children }: { children: ReactNode }) {
        return <MemoryRouter>{wrapper({ children })}</MemoryRouter>;
      }
      function Harness() {
        const table = useDataTable<TypedRow>({
          columns: [
            {
              label: "Name",
              type: "link",
              accessor: (r) => r.name,
              typeOptions: { href: (r) => r.detailUrl },
            },
          ],
          data: { rows: typedRows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper: RouterWrapper });
      const anchor = container.querySelector("a[href='/orders/1']");
      expect(anchor).not.toBeNull();
      expect(anchor?.textContent).toBe("Order 1");
    });

    it("falls back to row[id] when accessor is omitted", () => {
      const { container } = renderTypedTable([{ id: "name", type: "text" }]);
      expect(container.textContent).toContain("Order 1");
    });

    it("renders boolean as ✓/✗ when no type is set", () => {
      type BoolRow = { id: string; active: boolean };
      const rows: BoolRow[] = [
        { id: "1", active: true },
        { id: "2", active: false },
      ];
      function Harness() {
        const table = useDataTable<BoolRow>({
          columns: [{ id: "active", label: "Active", accessor: (r) => r.active }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain("✓");
      expect(container.textContent).toContain("✗");
    });

    it("renders Date as locale string when no type is set", () => {
      type DateRow = { id: string; createdAt: Date };
      const date = new Date("2026-03-15T00:00:00Z");
      const rows: DateRow[] = [{ id: "1", createdAt: date }];
      function Harness() {
        const table = useDataTable<DateRow>({
          columns: [{ id: "createdAt", label: "Created", accessor: (r) => r.createdAt }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain(date.toLocaleDateString());
    });

    it("renders object as JSON when no type is set", () => {
      type ObjRow = { id: string; meta: Record<string, unknown> };
      const rows: ObjRow[] = [{ id: "1", meta: { foo: "bar" } }];
      function Harness() {
        const table = useDataTable<ObjRow>({
          columns: [{ id: "meta", label: "Meta", accessor: (r) => r.meta }],
          data: { rows },
        });
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });
      expect(container.textContent).toContain('{"foo":"bar"}');
    });

    it("explicit render overrides type renderer", () => {
      const { container } = renderTypedTable([
        {
          label: "Status",
          type: "badge",
          accessor: (r) => r.status,
          render: (r) => <span data-testid="custom">{r.status.toUpperCase()}</span>,
        },
      ]);
      expect(container.querySelector("[data-testid='custom']")).not.toBeNull();
      expect(container.textContent).toContain("SHIPPED");
    });

    // Compile-time tests — these assertions verify the discriminated-union
    // shape rejects wrong-type options. Runtime behavior is incidental.
    it("[types] rejects wrong-type options on each branch", () => {
      const moneyCol: Column<TypedRow> = {
        type: "money",
        accessor: (r) => r.total,
        // @ts-expect-error — badgeVariantMap is not a money option
        typeOptions: { badgeVariantMap: { shipped: "success" } },
      };
      const badgeCol: Column<TypedRow> = {
        type: "badge",
        accessor: (r) => r.status,
        // @ts-expect-error — currency is not a badge option
        typeOptions: { currency: "USD" },
      };
      // @ts-expect-error — text columns reject typeOptions entirely
      const textCol: Column<TypedRow> = {
        type: "text",
        accessor: (r) => r.name,
        typeOptions: { locale: "en-US" },
      };
      // Reference the variables so the binding isn't elided.
      expect([moneyCol, badgeCol, textCol]).toHaveLength(3);
    });

    it("[types] requires href on link columns", () => {
      // @ts-expect-error — link branch requires typeOptions.href
      const linkColMissingHref: Column<TypedRow> = {
        type: "link",
        accessor: (r) => r.name,
      };
      const linkColOk: Column<TypedRow> = {
        type: "link",
        accessor: (r) => r.name,
        typeOptions: { href: (r) => r.detailUrl },
      };
      expect([linkColMissingHref, linkColOk]).toHaveLength(2);
    });

    it("[types] rejects array and object accessor return values on typed branches", () => {
      // Each typed branch narrows accessor's return type to values its
      // renderer can display. Arrays and plain objects are compile errors —
      // the built-in renderers never produced anything useful for them. Pass
      // `render` (and drop `type`) when the cell value isn't a primitive.

      // @ts-expect-error — text accessor cannot return an array
      const textArr: Column<TypedRow> = {
        type: "text",
        accessor: () => [1, 2],
      };
      // @ts-expect-error — text accessor cannot return a plain object
      const textObj: Column<TypedRow> = {
        type: "text",
        accessor: () => ({ a: 1 }),
      };
      // @ts-expect-error — number accessor cannot return an object
      const numberObj: Column<TypedRow> = {
        type: "number",
        accessor: () => ({ value: 1 }),
      };
      // @ts-expect-error — money accessor cannot return an array
      const moneyArr: Column<TypedRow> = {
        type: "money",
        accessor: () => [100],
      };
      // @ts-expect-error — date accessor cannot return an array
      const dateArr: Column<TypedRow> = {
        type: "date",
        accessor: () => [2026, 5, 13],
      };
      // badge accessor CAN return an array (multi-badge support)
      const badgeArr: Column<TypedRow> = {
        type: "badge",
        accessor: () => ["a", "b"],
      };
      // @ts-expect-error — link accessor cannot return a plain object
      const linkObj: Column<TypedRow> = {
        type: "link",
        accessor: () => ({ label: "x" }),
        typeOptions: { href: () => "/x" },
      };

      // Date is allowed on the date branch (and only there).
      const dateOk: Column<TypedRow> = {
        type: "date",
        accessor: () => new Date(),
      };
      // The untyped branch keeps `unknown` — callers escape the built-in
      // renderer entirely by providing `render`, so any return is fine.
      const untypedAny: Column<TypedRow> = {
        accessor: () => ({ shape: "anything" }),
        render: () => null,
      };

      expect([
        textArr,
        textObj,
        numberObj,
        moneyArr,
        dateArr,
        badgeArr,
        linkObj,
        dateOk,
        untypedAny,
      ]).toHaveLength(9);
    });
  });

  describe("row selection", () => {
    it("renders checkboxes when onSelectionChange is provided", () => {
      render(<TestDataTable onSelectionChange={vi.fn()} />, { wrapper });

      const checkboxes = screen.getAllByRole("checkbox");
      // 1 header checkbox + 2 row checkboxes
      expect(checkboxes).toHaveLength(3);
    });

    it("does not render checkboxes when onSelectionChange is not provided", () => {
      render(<TestDataTable />, { wrapper });

      expect(screen.queryByLabelText("Select all rows")).toBeNull();
      expect(screen.queryByLabelText("Select row")).toBeNull();
    });

    it("clicking a row checkbox calls onSelectionChange with the row id", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // checkboxes[0] = header, checkboxes[1] = Alice (id "1")
      fireEvent.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenCalledWith(["1"]);
    });

    it("clicking the header checkbox selects all rows", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper,
      });

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);

      expect(onSelectionChange).toHaveBeenCalledWith(["1", "2"]);
    });
  });

  // -------------------------------------------------------------------------
  // Sticky / pinned columns
  // -------------------------------------------------------------------------
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
