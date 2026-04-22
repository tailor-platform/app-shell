import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { createAppShellWrapper } from "@/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData } from "./types";

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
    render(<TestDataTable data={undefined} loading />, { wrapper });

    expect(screen.getByText("Loading...")).toBeDefined();
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
