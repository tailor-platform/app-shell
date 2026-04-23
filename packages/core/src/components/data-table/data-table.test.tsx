import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
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
