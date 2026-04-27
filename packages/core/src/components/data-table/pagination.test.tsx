import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { CollectionControl } from "@/types/collection";
import type { Column, DataTableData } from "./types";

afterEach(() => {
  cleanup();
});

type TestRow = { id: string; name: string; status: string };

const testColumns: Column<TestRow>[] = [
  { label: "Name", render: (row) => row.name },
  { label: "Status", render: (row) => row.status },
];

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

function TestPagination({
  data,
  control,
  onSelectionChange,
}: {
  data: DataTableData<TestRow>;
  control: CollectionControl;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const table = useDataTable<TestRow>({ columns: testColumns, data, control, onSelectionChange });
  return (
    <DataTable.Root value={table}>
      <DataTable.Footer>
        <DataTable.Pagination />
      </DataTable.Footer>
    </DataTable.Root>
  );
}

const wrapper = createAppShellWrapper("en");

// Data fixtures used across multiple tests
const dataWithTotal: DataTableData<TestRow> = {
  rows: [],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: true,
    endCursor: "next-tok",
    startCursor: "prev-tok",
  },
  total: 50, // totalPages = ceil(50/10) = 5
};

const dataWithoutTotal: DataTableData<TestRow> = {
  rows: [],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor: "tok",
    startCursor: null,
  },
};

describe("DataTable.Pagination", () => {
  it("shows First/Last buttons when total is provided", () => {
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("First page")).not.toBeNull();
    expect(screen.queryByLabelText("Last page")).not.toBeNull();
  });

  it("hides First/Last buttons when total is not provided", () => {
    render(<TestPagination data={dataWithoutTotal} control={makeControl()} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("First page")).toBeNull();
    expect(screen.queryByLabelText("Last page")).toBeNull();
  });

  it("still shows Previous/Next buttons when total is not provided", () => {
    render(<TestPagination data={dataWithoutTotal} control={makeControl()} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("Previous page")).not.toBeNull();
    expect(screen.queryByLabelText("Next page")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Page counter behaviour
//
// usePageCounter is internal to useDataTable, tested through DataTable.Pagination.
// ---------------------------------------------------------------------------
describe("page counter", () => {
  it("starts at page 1", () => {
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("increments on Next click", async () => {
    const user = userEvent.setup();
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Page 2 / 5")).not.toBeNull();
  });

  it("decrements on Previous click", async () => {
    const user = userEvent.setup();
    // hasPrevPage must be true for Prev to be enabled
    render(
      <TestPagination data={dataWithTotal} control={makeControl({ getHasPrevPage: () => true })} />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Next page"));
    await user.click(screen.getByLabelText("Previous page"));
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("does not decrement below 1", async () => {
    const user = userEvent.setup();
    render(
      <TestPagination data={dataWithTotal} control={makeControl({ getHasPrevPage: () => true })} />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Previous page"));
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("resets to 1 on First-page click", async () => {
    const user = userEvent.setup();
    render(
      <TestPagination data={dataWithTotal} control={makeControl({ getHasPrevPage: () => true })} />,
      { wrapper },
    );

    await user.click(screen.getByLabelText("Next page"));
    await user.click(screen.getByLabelText("Next page"));
    await user.click(screen.getByLabelText("First page"));
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("jumps to totalPages on Last-page click", async () => {
    const user = userEvent.setup();
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Last page"));
    expect(screen.getByText("Page 5 / 5")).not.toBeNull();
  });

  it("resets to 1 when resetCount changes (e.g. filter change)", () => {
    const control = makeControl({ resetCount: 0 });
    const { rerender } = render(<TestPagination data={dataWithTotal} control={control} />, {
      wrapper,
    });

    // Simulate filter change bumping resetCount
    const resetControl = makeControl({ resetCount: 1 });
    rerender(<TestPagination data={dataWithTotal} control={resetControl} />);

    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("disables Next button when currentPage reaches totalPages", async () => {
    const user = userEvent.setup();
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    // Navigate to page 5 (= totalPages) by clicking Next 4 times
    await user.click(screen.getByLabelText("Next page")); // page 2
    await user.click(screen.getByLabelText("Next page")); // page 3
    await user.click(screen.getByLabelText("Next page")); // page 4
    await user.click(screen.getByLabelText("Next page")); // page 5

    expect(screen.getByText("Page 5 / 5")).not.toBeNull();
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true);
  });

  it("delegates goToPrevPage to control", async () => {
    const user = userEvent.setup();
    const control = makeControl({ getHasPrevPage: () => true });
    render(<TestPagination data={dataWithTotal} control={control} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Previous page"));
    expect(control.goToPrevPage).toHaveBeenCalledWith(dataWithTotal.pageInfo);
  });

  it("delegates goToNextPage to control", async () => {
    const user = userEvent.setup();
    const control = makeControl();
    render(<TestPagination data={dataWithTotal} control={control} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Next page"));
    expect(control.goToNextPage).toHaveBeenCalledWith(dataWithTotal.pageInfo);
  });

  it("disables Prev/Next based on getHasPrevPage/getHasNextPage", () => {
    render(
      <TestPagination
        data={dataWithTotal}
        control={makeControl({
          getHasPrevPage: () => false,
          getHasNextPage: () => false,
        })}
      />,
      { wrapper },
    );

    expect(screen.getByLabelText("Previous page")).toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Next page")).toHaveProperty("disabled", true);
  });
});

// ---------------------------------------------------------------------------
// Row info text (total rows / selected rows)
// ---------------------------------------------------------------------------
describe("row info text", () => {
  const dataWithRows: DataTableData<TestRow> = {
    rows: [
      { id: "1", name: "A", status: "active" },
      { id: "2", name: "B", status: "inactive" },
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: null,
      startCursor: null,
    },
    total: 50,
  };

  const dataWithRowsNoTotal: DataTableData<TestRow> = {
    rows: [
      { id: "1", name: "A", status: "active" },
      { id: "2", name: "B", status: "inactive" },
    ],
    pageInfo: {
      hasNextPage: true,
      hasPreviousPage: false,
      endCursor: "tok",
      startCursor: null,
    },
  };

  it("shows total rows when total is provided and no selection enabled", () => {
    render(<TestPagination data={dataWithRows} control={makeControl()} />, { wrapper });
    expect(screen.getByText("50 row(s)")).not.toBeNull();
  });

  it("shows total rows when total is provided and selection enabled but nothing selected", () => {
    render(
      <TestPagination data={dataWithRows} control={makeControl()} onSelectionChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText("50 row(s)")).not.toBeNull();
  });

  it("shows 'Y of X row(s) selected' when rows are selected and total is provided", async () => {
    const user = userEvent.setup();

    function TestWithTable() {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: dataWithRows,
        control: makeControl(),
        onSelectionChange: vi.fn(),
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

    render(<TestWithTable />, { wrapper });

    // Click the first row's checkbox to select it
    const checkboxes = screen.getAllByRole("checkbox");
    // checkboxes[0] is the "select all" checkbox, [1] is the first row
    await user.click(checkboxes[1]);

    expect(screen.getByText("1 of 50 row(s) selected")).not.toBeNull();
  });

  it("shows 'Y row(s) selected' when rows are selected and no total", async () => {
    const user = userEvent.setup();

    function TestWithTable() {
      const table = useDataTable<TestRow>({
        columns: testColumns,
        data: dataWithRowsNoTotal,
        control: makeControl(),
        onSelectionChange: vi.fn(),
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

    render(<TestWithTable />, { wrapper });

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);

    expect(screen.getByText("1 row(s) selected")).not.toBeNull();
  });

  it("shows nothing when no total and no selection enabled", () => {
    render(<TestPagination data={dataWithRowsNoTotal} control={makeControl()} />, { wrapper });
    // No row info text should be rendered
    expect(screen.queryByText(/row\(s\)/)).toBeNull();
  });

  it("shows nothing when no total and selection enabled but nothing selected", () => {
    render(
      <TestPagination
        data={dataWithRowsNoTotal}
        control={makeControl()}
        onSelectionChange={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.queryByText(/row\(s\) selected/)).toBeNull();
    expect(screen.queryByText(/rows$/)).toBeNull();
  });
});
