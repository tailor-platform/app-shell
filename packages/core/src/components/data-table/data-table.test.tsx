import { afterEach, describe, it, expect, expectTypeOf, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StrictMode, type ReactNode } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type {
  Column,
  DataTableData,
  RowAction,
  RowExpansionOptions,
  UseDataTableOptions,
  UseDataTableReturn,
} from "./types";

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

// Detail-panel render props shared by the "expandable rows" block. The
// focusable variant lets tests drive focus into an open panel.
const detail = (row: TestRow) => <div>Details for {row.name}</div>;
const focusableDetail = () => (
  <button type="button" data-testid="inner">
    Inner
  </button>
);

// StrictMode double-invokes state updaters to surface impure ones, so it is what
// proves the selection/expansion callbacks fire outside the updater.
const strictWrapper = ({ children }: { children: ReactNode }) => {
  const Wrapper = wrapper;
  return (
    <StrictMode>
      <Wrapper>{children}</Wrapper>
    </StrictMode>
  );
};

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

  it("resets the table scroll position when pagination changes page", async () => {
    const pagedData: DataTableData<TestRow> = {
      rows: testData.rows,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
        endCursor: "next-tok",
        startCursor: "prev-tok",
      },
      total: 50,
    };

    function PaginatedTable() {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: pagedData,
        control: makeControl({ getHasPrevPage: () => true }),
      });

      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
          <DataTable.Footer>
            <DataTable.Pagination />
          </DataTable.Footer>
        </DataTable.Root>
      );
    }

    const { container } = render(<PaginatedTable />, { wrapper });
    const scrollContainer = container.querySelector<HTMLDivElement>(
      '[data-slot="table-container"]',
    );

    expect(scrollContainer).not.toBeNull();
    if (!scrollContainer) return;

    scrollContainer.scrollTop = 120;
    fireEvent.click(screen.getByLabelText("Next page"));

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0);
    });
  });

  describe("custom headers", () => {
    it("renders custom header content", () => {
      const columns: Column<TestRow>[] = [
        {
          label: "Name",
          header: () => (
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

    it("keeps built-in sort behavior and hit area when header is omitted", () => {
      const control = makeControl();

      function Harness() {
        const table = useDataTable<TestRow>({
          columns: [
            {
              label: "Name",
              sort: { field: "name", type: "string" },
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

      const button = screen.getByRole("button", { name: "Name" });
      expect(button.className).toContain("astw:h-10");
      expect(button.className).toContain("astw:-mx-2");
      expect(button.className).toContain("astw:px-2");

      fireEvent.click(button);

      expect(control.clearSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledWith("name", "Asc");
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
                  <button type="button" onClick={ctx.activateSort}>
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

      expect(control.clearSort).toHaveBeenCalledTimes(1);
      expect(control.setSort).toHaveBeenCalledTimes(1);
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

    it("calls onSelectionChange once per toggle under StrictMode", () => {
      const onSelectionChange = vi.fn();
      render(<TestDataTable onSelectionChange={onSelectionChange} />, {
        wrapper: strictWrapper,
      });

      fireEvent.click(screen.getAllByRole("checkbox")[1]);

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
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

    it("composes several toggles dispatched in one commit", () => {
      // Consumer code like `overdue.forEach((r) => toggleRowSelection(r))`.
      // Every built-in affordance fires exactly one toggle per commit, so this
      // is only reachable through the public API.
      const onSelectionChange = vi.fn();
      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange,
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      act(() => {
        api.toggleRowSelection?.(testData.rows[0]);
        api.toggleRowSelection?.(testData.rows[1]);
      });

      expect(api.selectedIds).toEqual(["1", "2"]);
      expect(onSelectionChange).toHaveBeenLastCalledWith(["1", "2"]);
    });

    it("applies clearSelection before a toggle in the same commit", () => {
      const onSelectionChange = vi.fn();
      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange,
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      act(() => api.selectAllRows?.());
      expect(api.selectedIds).toEqual(["1", "2"]);

      // "replace the selection with just this row"
      act(() => {
        api.clearSelection?.();
        api.toggleRowSelection?.(testData.rows[1]);
      });

      expect(api.selectedIds).toEqual(["2"]);
      expect(onSelectionChange).toHaveBeenLastCalledWith(["2"]);
    });

    it("marks the selected row with data-state='selected' so the whole row highlights", () => {
      const { container } = render(<TestDataTable onSelectionChange={vi.fn()} />, { wrapper });

      // Nothing selected initially.
      expect(
        container.querySelector('[data-slot="data-table-row"][data-state="selected"]'),
      ).toBeNull();

      // checkboxes[0] = header, checkboxes[1] = first data row.
      fireEvent.click(screen.getAllByRole("checkbox")[1]);

      // The row (not just the pinned cells) must carry data-state="selected",
      // which is what `Table.Row` keys its selected background off of.
      expect(
        container.querySelectorAll('[data-slot="data-table-row"][data-state="selected"]'),
      ).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Expandable rows
  // -------------------------------------------------------------------------
  describe("expandable rows", () => {
    const EXPAND_TH = '[data-slot="data-table-header"] th[data-col-key="__datatable_expand__"]';
    const EXPANDED_ROW = '[data-slot="data-table-expanded-row"]';

    function ExpandHarness(props: {
      data?: DataTableData<TestRow>;
      loading?: boolean;
      error?: Error | null;
      onClickRow?: (row: TestRow) => void;
      onSelectionChange?: (ids: string[]) => void;
      rowActions?: RowAction<TestRow>[];
      renderExpandedRow?: (row: TestRow) => ReactNode;
      canExpandRow?: (row: TestRow) => boolean;
      expandRowLabel?: (row: TestRow) => string;
      expandedIds?: string[];
      onExpandedChange?: (ids: string[]) => void;
    }) {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: "data" in props ? props.data : testData,
        loading: props.loading,
        error: props.error,
        onClickRow: props.onClickRow,
        onSelectionChange: props.onSelectionChange,
        rowActions: props.rowActions,
        rowExpansion: props.renderExpandedRow
          ? // Cast because the harness keeps flat props and picks the union
            // branch at runtime; the branches themselves are covered by the
            // type-level test below.
            ({
              render: props.renderExpandedRow,
              canExpand: props.canExpandRow,
              getLabel: props.expandRowLabel,
              expandedIds: props.expandedIds,
              onChange: props.onExpandedChange,
            } as RowExpansionOptions<TestRow>)
          : undefined,
      });
      return (
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      );
    }

    it("rejects incoherent rowExpansion configs at compile time", () => {
      const base = { columns: testColumns, data: testData };
      type Options = UseDataTableOptions<TestRow>;

      // The directive sits on the offending property, which is where TS reports
      // the mismatch.
      const missingOnChange: Options = {
        ...base,
        // @ts-expect-error — `expandedIds` without `onChange` is inert. Making it
        // unrepresentable is what removed the hook's dev-time warning effect.
        rowExpansion: { render: detail, expandedIds: ["1"] },
      };

      const labelWithoutRender: Options = {
        ...base,
        // @ts-expect-error — a label with no renderer does nothing.
        rowExpansion: { getLabel: (r: TestRow) => r.name },
      };

      const controlled: Options = {
        ...base,
        rowExpansion: { render: detail, expandedIds: ["1"], onChange: () => {} },
      };
      const uncontrolled: Options = { ...base, rowExpansion: { render: detail } };
      // `onChange` alone stays legal — in uncontrolled mode it is a notification.
      const notified: Options = {
        ...base,
        rowExpansion: { render: detail, onChange: () => {} },
      };

      expect([
        missingOnChange,
        labelWithoutRender,
        controlled,
        uncontrolled,
        notified,
      ]).toHaveLength(5);
    });

    it("renders no expand column when renderExpandedRow is absent", () => {
      const { container } = render(<ExpandHarness />, { wrapper });

      expect(container.querySelector(EXPAND_TH)).toBeNull();
      expect(screen.queryByLabelText("Expand row")).toBeNull();
    });

    it("renders an expand column when renderExpandedRow is provided", () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const th = container.querySelector(EXPAND_TH);
      expect(th).not.toBeNull();
      // Never an empty <th> — the header carries sr-only text.
      expect(th?.textContent).toBe("Expand");
      expect(screen.getAllByLabelText("Expand row")).toHaveLength(2);
    });

    it("clicking the chevron reveals the render prop's content", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      expect(screen.queryByText("Details for Alice")).toBeNull();
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(screen.getByText("Details for Alice")).toBeDefined();
      // Only the clicked row opens.
      expect(screen.queryByText("Details for Bob")).toBeNull();
    });

    it("clicking the chevron again collapses the row", async () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // The row stays mounted while the collapse transition plays, so removal
      // is asynchronous — `aria-expanded` flips immediately, the DOM catches up.
      await waitFor(() => expect(screen.queryByText("Details for Alice")).toBeNull());
    });

    it("keeps the detail row mounted while collapsing, marked data-state='closed'", async () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(container.querySelector(`${EXPANDED_ROW}[data-state="open"]`)).not.toBeNull();

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // Still in the DOM, but flipped to the closed state — this is what gives
      // the exit transition something to animate. Without the presence state
      // machine React would remove the row on the same tick and it would snap.
      expect(container.querySelector(`${EXPANDED_ROW}[data-state="closed"]`)).not.toBeNull();
      // The trigger's state is not deferred — it reports collapsed right away
      // (both rows now read "Expand row", so index into them).
      expect(screen.getAllByLabelText("Expand row")[0].getAttribute("aria-expanded")).toBe("false");

      await waitFor(() => expect(container.querySelector(EXPANDED_ROW)).toBeNull());
    });

    it("exposes aria-expanded on the trigger, flipping false → true", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const trigger = screen.getAllByLabelText("Expand row")[0];
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);
      expect(screen.getByLabelText("Collapse row").getAttribute("aria-expanded")).toBe("true");
    });

    it("points aria-controls at a present element while expanded, and omits it while collapsed", () => {
      render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const trigger = screen.getAllByLabelText("Expand row")[0];
      // Must never point at an id that is absent from the DOM.
      expect(trigger.getAttribute("aria-controls")).toBeNull();

      fireEvent.click(trigger);
      const controls = screen.getByLabelText("Collapse row").getAttribute("aria-controls");
      expect(controls).toBeTruthy();
      expect(document.getElementById(controls as string)).not.toBeNull();
    });

    it("spans the detail cell across selection + expand + columns + actions", () => {
      const { container } = render(
        <ExpandHarness
          renderExpandedRow={detail}
          onSelectionChange={vi.fn()}
          rowActions={[{ id: "edit", label: "Edit", onClick: vi.fn() }]}
        />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      // 1 selection + 1 expand + 2 visible columns + 1 actions
      expect(container.querySelector(`${EXPANDED_ROW} td`)?.getAttribute("colspan")).toBe("5");
    });

    it("keeps several rows open at once", () => {
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const triggers = screen.getAllByLabelText("Expand row");
      fireEvent.click(triggers[0]);
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]); // Bob's, after Alice's flipped

      expect(screen.getByText("Details for Alice")).toBeDefined();
      expect(screen.getByText("Details for Bob")).toBeDefined();
      expect(container.querySelectorAll(EXPANDED_ROW)).toHaveLength(2);
    });

    it("does not fire onClickRow when the chevron is used", () => {
      const onClickRow = vi.fn();
      render(<ExpandHarness renderExpandedRow={detail} onClickRow={onClickRow} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onClickRow).not.toHaveBeenCalled();
      expect(screen.getByText("Details for Alice")).toBeDefined();
    });

    it("renders no chevron for rows without an id", () => {
      // Expansion is keyed by id, so an id-less row gets no chevron at all
      // rather than a disabled one — a row must never be un-toggleable.
      const mixed: DataTableData<TestRow> = {
        rows: [
          { id: "1", name: "Alice", status: "Active" },
          { name: "Bob", status: "Inactive" } as TestRow,
        ],
      };
      const { container } = render(<ExpandHarness data={mixed} renderExpandedRow={detail} />, {
        wrapper,
      });

      expect(screen.getAllByLabelText("Expand row")).toHaveLength(1);
      // The cell is still rendered (empty), so the column count stays consistent.
      const bodyRows = container.querySelectorAll('[data-slot="data-table-row"]');
      expect(bodyRows[1].querySelectorAll("td")).toHaveLength(3);
    });

    it("renders no chevron for a row that canExpandRow rejects", () => {
      render(
        <ExpandHarness renderExpandedRow={detail} canExpandRow={(row) => row.name === "Alice"} />,
        { wrapper },
      );

      const triggers = screen.getAllByLabelText("Expand row");
      expect(triggers).toHaveLength(1);
      fireEvent.click(triggers[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
    });

    it("builds a contextual accessible name from expandRowLabel", () => {
      render(<ExpandHarness renderExpandedRow={detail} expandRowLabel={(row) => row.name} />, {
        wrapper,
      });

      const trigger = screen.getByLabelText("Expand row Alice");
      expect(screen.getByLabelText("Expand row Bob")).toBeDefined();

      fireEvent.click(trigger);
      expect(screen.getByLabelText("Collapse row Alice")).toBeDefined();
    });

    it("renders the panel as a named region", () => {
      render(<ExpandHarness renderExpandedRow={detail} expandRowLabel={(row) => row.name} />, {
        wrapper,
      });

      fireEvent.click(screen.getByLabelText("Expand row Alice"));

      const region = screen.getByRole("region", { name: "Alice details" });
      expect(region.textContent).toBe("Details for Alice");
    });

    it("returns focus to the trigger when the panel collapses while focus is inside it", async () => {
      render(<ExpandHarness renderExpandedRow={focusableDetail} />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      const inner = screen.getByTestId("inner");
      act(() => inner.focus());
      expect(document.activeElement).toBe(inner);

      const trigger = screen.getByLabelText("Collapse row");
      fireEvent.click(trigger);

      // The handoff runs on unmount, which now waits for the collapse
      // transition. Without it, focus would fall to <body> and the user would
      // lose their place in the table.
      await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it("renders the matching rows open from a controlled expandedIds", () => {
      const { container } = render(
        <ExpandHarness renderExpandedRow={detail} expandedIds={["2"]} onExpandedChange={vi.fn()} />,
        { wrapper },
      );

      expect(screen.getByText("Details for Bob")).toBeDefined();
      expect(screen.queryByText("Details for Alice")).toBeNull();
      expect(container.querySelectorAll(EXPANDED_ROW)).toHaveLength(1);
    });

    it("reports controlled toggles through onExpandedChange without changing internal state", () => {
      const onExpandedChange = vi.fn();
      render(
        <ExpandHarness
          renderExpandedRow={detail}
          expandedIds={[]}
          onExpandedChange={onExpandedChange}
        />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onExpandedChange).toHaveBeenCalledWith(["1"]);
      // The caller owns the state — nothing opens until `expandedIds` changes.
      expect(screen.queryByText("Details for Alice")).toBeNull();
    });

    it("pins the expand column left at the selection column's measured offset", () => {
      const { container } = render(
        <ExpandHarness renderExpandedRow={detail} onSelectionChange={vi.fn()} />,
        { wrapper },
      );

      const th = container.querySelector<HTMLElement>(EXPAND_TH);
      expect(th?.style.position).toBe("sticky");
      expect(th?.style.left).toBe("52px");
      // The freeze seam moves off the selection column onto the expand column.
      const selectionTh = container.querySelector<HTMLElement>(
        '[data-slot="data-table-header"] th[data-col-key="__datatable_selection__"]',
      );
      expect(th?.className).toContain("data-pin-shadow-left");
      expect(selectionTh?.className).not.toContain("data-pin-shadow-left");
    });

    it("includes an expand cell in the skeleton rows", () => {
      const { container } = render(
        <ExpandHarness data={undefined} loading renderExpandedRow={detail} />,
        { wrapper },
      );

      const loadingRow = container.querySelector('[data-datatable-state="loading"]');
      // 1 expand + 2 visible columns — row heights match before and after load.
      expect(loadingRow?.querySelectorAll("td")).toHaveLength(3);
    });

    it("spans the expand column in the empty and error status rows", () => {
      const { container: emptyContainer } = render(
        <ExpandHarness data={{ rows: [] }} renderExpandedRow={detail} />,
        { wrapper },
      );
      expect(
        emptyContainer.querySelector('[data-datatable-state="empty"] td')?.getAttribute("colspan"),
      ).toBe("3");

      const { container: errorContainer } = render(
        <ExpandHarness data={undefined} error={new Error("boom")} renderExpandedRow={detail} />,
        { wrapper },
      );
      expect(
        errorContainer.querySelector('[data-datatable-state="error"] td')?.getAttribute("colspan"),
      ).toBe("3");
    });

    // -----------------------------------------------------------------------
    // Regressions found in review
    // -----------------------------------------------------------------------

    it("keeps row keys unique when an id-less row's index matches another row's id", () => {
      // `{id: "1"}` at index 0 and an id-less row at index 1 both keyed to "1"
      // (React stringifies keys), so React reconciled two siblings under one key.
      // The keys are namespaced now, so the two spaces can't overlap.
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const collidingData: DataTableData<TestRow> = {
        rows: [
          { id: "1", name: "Alice", status: "Active" },
          { name: "Bob", status: "Inactive" } as TestRow,
          { id: "2", name: "Carol", status: "Active" },
        ],
      };
      render(<ExpandHarness data={collidingData} renderExpandedRow={detail} />, { wrapper });

      expect(err.mock.calls.filter((call) => String(call[0]).includes("same key"))).toHaveLength(0);
      err.mockRestore();
    });

    it("closes a row that becomes non-expandable while open", async () => {
      // `canExpandRow` gates both directions. A row whose predicate flips to
      // false goes quiet: no panel, no chevron. Its id stays in `expandedIds`
      // but is inert — the alternative (letting the set alone open a panel)
      // renders detail content for a row the consumer told us to skip.
      function Harness({ canExpand }: { canExpand: boolean }) {
        return (
          <ExpandHarness
            renderExpandedRow={detail}
            canExpandRow={() => canExpand}
            expandedIds={["1"]}
            onExpandedChange={vi.fn()}
          />
        );
      }
      const { rerender } = render(<Harness canExpand />, { wrapper });
      expect(screen.getByText("Details for Alice")).toBeDefined();

      rerender(<Harness canExpand={false} />);

      await waitFor(() => expect(screen.queryByText("Details for Alice")).toBeNull());
      expect(screen.queryByLabelText("Collapse row")).toBeNull();
      expect(screen.queryByLabelText("Expand row")).toBeNull();
    });

    it("does not open a panel for a row canExpandRow rejects, even when its id is in expandedIds", () => {
      // Restoring `expandedIds` from a URL or storage must not run
      // `renderExpandedRow` against a row the consumer excluded — that row may
      // have no detail data at all.
      const renderExpandedRow = vi.fn(detail);
      render(
        <ExpandHarness
          renderExpandedRow={renderExpandedRow}
          canExpandRow={() => false}
          expandedIds={["1", "2"]}
          onExpandedChange={vi.fn()}
        />,
        { wrapper },
      );

      expect(screen.queryByText("Details for Alice")).toBeNull();
      expect(screen.queryByRole("region")).toBeNull();
      expect(renderExpandedRow).not.toHaveBeenCalled();
    });

    it("marks the closing panel inert so it leaves the tab order and a11y tree", async () => {
      const { container } = render(<ExpandHarness renderExpandedRow={focusableDetail} />, {
        wrapper,
      });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      const panel = container.querySelector(`${EXPANDED_ROW} section`);
      expect(panel?.hasAttribute("inert")).toBe(false);

      fireEvent.click(screen.getByLabelText("Collapse row"));

      // Zero height and zero opacity still leave descendants focusable and
      // announced, so the closing window needs `inert` explicitly.
      expect(container.querySelector(`${EXPANDED_ROW} section`)?.hasAttribute("inert")).toBe(true);
      await waitFor(() => expect(container.querySelector(EXPANDED_ROW)).toBeNull());
    });

    it("sanitises whitespace in row ids so the panel id and aria-controls stay valid", () => {
      const spaced: DataTableData<TestRow> = {
        rows: [{ id: "ORD 4471", name: "Alice", status: "Active" }],
      };
      render(<ExpandHarness data={spaced} renderExpandedRow={detail} />, { wrapper });

      fireEvent.click(screen.getByLabelText("Expand row"));

      const controls = screen
        .getByLabelText("Collapse row")
        .getAttribute("aria-controls") as string;
      // `aria-controls` is an IDREF *list*: a space would split it into two
      // references that resolve to nothing, silently dropping the association.
      expect(controls).not.toMatch(/\s/);
      expect(document.getElementById(controls)).not.toBeNull();
    });

    it("moves focus to the table container when the whole row unmounts from under it", () => {
      // The collapse-by-click test covers the case where the trigger survives.
      // Here the row disappears (refetch/filter/pagination) while focus is in the
      // panel, so the trigger is gone too and focus would otherwise hit <body>.
      const { container, rerender } = render(
        <ExpandHarness data={testData} renderExpandedRow={focusableDetail} />,
        { wrapper },
      );

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      const inner = screen.getByTestId("inner");
      act(() => inner.focus());
      expect(document.activeElement).toBe(inner);

      // Alice drops out of the result set entirely.
      rerender(
        <ExpandHarness
          data={{ rows: [{ id: "2", name: "Bob", status: "Inactive" }] }}
          renderExpandedRow={focusableDetail}
        />,
      );

      const scrollContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
      expect(document.activeElement).toBe(scrollContainer);
      expect(document.activeElement).not.toBe(document.body);
    });

    it("does not measure a nested DataTable's header into the outer table's widths", () => {
      // Built-in column keys are module constants shared by every instance, so an
      // unscoped descendant query let the inner table's selection column (later
      // in document order) overwrite the outer one's measured width and shift
      // every pinned column left of where it belongs.
      //
      // Widths are 0 in the test DOM, so the two selection headers are stubbed to
      // distinguishable non-zero values — 70 outer, 40 inner. The outer expand
      // column must land at 70, never 40.
      // Stub on whichever prototype actually owns `offsetWidth` (installing one
      // if none does), rather than assuming `HTMLElement`. A spy on the wrong
      // link of the chain silently no-ops and every cell measures 0, and a stub
      // placed on the elements themselves is lost if React recreates the header
      // nodes on re-render. This survives both.
      const offsetWidthOwner = (() => {
        let proto: object | null = Object.getPrototypeOf(document.createElement("th"));
        while (proto && !Object.getOwnPropertyDescriptor(proto, "offsetWidth")) {
          proto = Object.getPrototypeOf(proto);
        }
        if (proto) return proto;
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
          configurable: true,
          get: () => 0,
        });
        return HTMLElement.prototype;
      })();
      const offsetWidth = vi
        .spyOn(offsetWidthOwner as HTMLElement, "offsetWidth", "get")
        .mockImplementation(function (this: HTMLElement) {
          if (this.dataset?.colKey !== "__datatable_selection__") return 0;
          return this.closest("[data-nested]") ? 40 : 70;
        });

      function NestedTable() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: { rows: [testData.rows[0]] },
          onSelectionChange: vi.fn(),
        });
        return (
          <div data-nested>
            <DataTable.Root value={table}>
              <DataTable.Table />
            </DataTable.Root>
          </div>
        );
      }

      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          onSelectionChange: vi.fn(),
          rowExpansion: { render: () => <NestedTable /> },
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { container } = render(<Harness />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(container.querySelectorAll("table").length).toBeGreaterThan(1);

      // Guard the stub itself, so a future environment where it stops taking
      // effect fails here — naming the cause — rather than at the layout
      // assertion below, which would just read the declared 52px fallback and
      // look like a pinning bug.
      const selectionHeaders = container.querySelectorAll<HTMLElement>(
        '[data-slot="data-table-header"] th[data-col-key="__datatable_selection__"]',
      );
      // Outer thead precedes the nested table in the outer tbody.
      expect(selectionHeaders).toHaveLength(2);
      expect([selectionHeaders[0].offsetWidth, selectionHeaders[1].offsetWidth]).toEqual([70, 40]);

      // Preconditions for the production filter (`cell.closest("table") === ownTable`).
      // Asserted explicitly so that if a DOM implementation resolves either side
      // differently, this names the cause instead of surfacing as a pin offset.
      const scrollContainer = container.querySelector('[data-slot="table-container"]');
      const outerTable = scrollContainer?.querySelector("table");
      expect(outerTable).not.toBeNull();
      expect(selectionHeaders[0].closest("table")).toBe(outerTable);
      expect(selectionHeaders[1].closest("table")).not.toBe(outerTable);

      // Force the measure effect to re-run now that the nested table is mounted
      // (in a browser the ResizeObserver does this when the row expands).
      act(() => api.toggleColumn("Status"));

      const left = container.querySelector<HTMLElement>(EXPAND_TH)?.style.left;

      // The invariant: the inner table's width must never reach the outer
      // table's offsets. That is what the `closest("table") === ownTable` filter
      // exists for, and removing it makes this fail with "40px".
      expect(left).not.toBe("40px");
      // Which of the two legitimate values appears depends on whether the DOM
      // implementation feeds real geometry to the component's layout effect.
      // Where it does, the offset is the outer table's measured 70px. Where
      // every element reports `offsetWidth: 0` to the component — as happens in
      // CI, which is also why every other pinning test here asserts declared
      // fallbacks — the declared 52px stands. Asserting 70px unconditionally
      // pins the test to one environment's layout behaviour, not to the
      // behaviour under test.
      expect(["70px", "52px"]).toContain(left);
      offsetWidth.mockRestore();
    });

    it("keeps collapseAllRows stable and inert while nothing is expanded", () => {
      // The documented "collapse on page change" recipe lists it in an effect's
      // dependency array; an unstable identity plus an unconditional state write
      // there loops until React bails with a max-update-depth error.
      const seen: (() => void)[] = [];
      const onExpandedChange = vi.fn();
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail, onChange: onExpandedChange },
        });
        if (table.collapseAllRows) seen.push(table.collapseAllRows);
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      const { rerender } = render(<Harness />, { wrapper });
      rerender(<Harness />);

      expect(seen.length).toBeGreaterThan(1);
      expect(seen[seen.length - 1]).toBe(seen[0]);

      // Collapsing an already-collapsed table is a no-op, not a spurious event.
      act(() => seen[0]());
      expect(onExpandedChange).not.toHaveBeenCalled();

      // The identity must survive an actual expansion, not just a re-render.
      // `expandedRowIds` is a fresh Set on every expansion change, so having it
      // in the useCallback deps kept the identity churning — and the documented
      // effect recipe then re-fired on expand and collapsed the row the user had
      // just opened. A rerender-only assertion never sees that.
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
      expect(seen[seen.length - 1]).toBe(seen[0]);
    });

    it("calls onExpandedChange once per toggle under StrictMode", () => {
      const onExpandedChange = vi.fn();
      render(<ExpandHarness renderExpandedRow={detail} onExpandedChange={onExpandedChange} />, {
        wrapper: strictWrapper,
      });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(onExpandedChange).toHaveBeenCalledTimes(1);
      expect(onExpandedChange).toHaveBeenCalledWith(["1"]);
    });

    it("composes several expansion toggles dispatched in one commit", () => {
      const onChange = vi.fn();
      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail, onChange },
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      act(() => {
        api.toggleRowExpansion?.(testData.rows[0]);
        api.toggleRowExpansion?.(testData.rows[1]);
      });

      expect(api.expandedIds).toEqual(["1", "2"]);
      expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);
    });

    it("applies collapseAllRows before a toggle in the same commit", () => {
      let api!: UseDataTableReturn<TestRow>;
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail },
        });
        api = table;
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      act(() => {
        api.toggleRowExpansion?.(testData.rows[0]);
        api.toggleRowExpansion?.(testData.rows[1]);
      });

      act(() => {
        api.collapseAllRows?.();
        api.toggleRowExpansion?.(testData.rows[1]);
      });

      expect(api.expandedIds).toEqual(["2"]);
    });

    it("keeps toggleRowExpansion stable across an expansion", () => {
      const seen: ((row: TestRow) => void)[] = [];
      function Harness() {
        const table = useDataTable<TestRow>({
          columns: testColumns,
          data: testData,
          rowExpansion: { render: detail },
        });
        if (table.toggleRowExpansion) seen.push(table.toggleRowExpansion);
        return (
          <DataTable.Root value={table}>
            <DataTable.Table />
          </DataTable.Root>
        );
      }
      render(<Harness />, { wrapper });

      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);

      expect(seen.length).toBeGreaterThan(1);
      expect(seen[seen.length - 1]).toBe(seen[0]);
    });

    it("leaves --data-table-viewport unset when the scrollport measures zero", () => {
      // jsdom reports clientWidth 0, matching a table mounted inside a hidden
      // container. Writing `0px` would collapse every panel via min(100%, 0px).
      const { container } = render(<ExpandHarness renderExpandedRow={detail} />, { wrapper });

      const scrollContainer = container.querySelector<HTMLElement>('[data-slot="table-container"]');
      expect(scrollContainer?.style.getPropertyValue("--data-table-viewport")).toBe("");

      // The panel therefore falls back to 100% rather than 0.
      fireEvent.click(screen.getAllByLabelText("Expand row")[0]);
      expect(screen.getByText("Details for Alice")).toBeDefined();
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
