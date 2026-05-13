import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData, RowAction } from "./types";

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
});
