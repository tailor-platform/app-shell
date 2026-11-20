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
  pageSizeOptions,
}: {
  data: DataTableData<TestRow>;
  control: CollectionControl;
  onSelectionChange?: (ids: string[]) => void;
  pageSizeOptions?: number[];
}) {
  const table = useDataTable<TestRow>({
    columns: testColumns,
    data,
    control,
    onSelectionChange,
  });
  return (
    <DataTable.Root value={table}>
      <DataTable.Footer>
        <DataTable.Pagination pageSizeOptions={pageSizeOptions} />
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

  it("shows First button and hides Last button when total is not provided", () => {
    render(<TestPagination data={dataWithoutTotal} control={makeControl()} />, {
      wrapper,
    });

    expect(screen.queryByLabelText("First page")).not.toBeNull();
    expect(screen.queryByLabelText("Last page")).toBeNull();
  });

  it("names the page-size select with the Rows per page label", () => {
    render(
      <TestPagination data={dataWithTotal} control={makeControl()} pageSizeOptions={[10, 20]} />,
      { wrapper },
    );

    expect(screen.getByRole("combobox", { name: "Rows per page" })).not.toBeNull();
  });

  it("hides the short page text from assistive tech", () => {
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    // A narrow footer shows "1/5" in place of "Page 1 / 5"; only the full
    // text should be announced.
    const short = screen.getByText("1/5");
    const full = screen.getByText("Page 1 / 5");
    expect(short.getAttribute("aria-hidden")).toBe("true");
    expect(full.getAttribute("aria-hidden")).toBeNull();
    // jsdom has no container queries, so check the classes that swap them.
    expect(short.className).toContain("astw:hidden");
    expect(short.className).toContain("astw:@max-[480px]/data-table-footer:inline");
    expect(full.className).toContain("astw:@max-[480px]/data-table-footer:sr-only");
  });

  it("drops the page-size switcher and shrinks the page buttons in a narrow footer", () => {
    const { container } = render(
      <TestPagination data={dataWithTotal} control={makeControl()} pageSizeOptions={[10, 20]} />,
      { wrapper },
    );

    // jsdom has no container queries, so check the classes that apply them.
    const select = screen.getByRole("combobox", { name: "Rows per page" });
    const switcher = container.querySelector('[class*="data-table-footer:hidden"]');
    expect(switcher?.contains(select)).toBe(true);
    for (const name of ["First page", "Previous page", "Next page", "Last page"]) {
      expect(screen.getByLabelText(name).className).toContain(
        "astw:@max-[480px]/data-table-footer:size-7",
      );
    }
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
    render(<TestPagination data={dataWithRows} control={makeControl()} />, {
      wrapper,
    });
    expect(screen.getByText("50 rows")).not.toBeNull();
  });

  it("uses the singular for a single row", () => {
    render(<TestPagination data={{ ...dataWithRows, total: 1 }} control={makeControl()} />, {
      wrapper,
    });
    expect(screen.getByText("1 row")).not.toBeNull();
  });

  it("shows total rows when total is provided and selection enabled but nothing selected", () => {
    render(
      <TestPagination data={dataWithRows} control={makeControl()} onSelectionChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText("50 rows")).not.toBeNull();
  });

  it.each([
    { locale: "en", full: "1 of 50 rows selected", short: "1/50 selected" },
    { locale: "ja", full: "50 行中 1 行を選択中", short: "1/50 行を選択中" },
  ])("shows the selected count with a short form ($locale)", async ({ locale, full, short }) => {
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

    render(<TestWithTable />, { wrapper: createAppShellWrapper(locale) });

    // Click the first row's checkbox to select it
    const checkboxes = screen.getAllByRole("checkbox");
    // checkboxes[0] is the "select all" checkbox, [1] is the first row
    await user.click(checkboxes[1]);

    // A narrow footer shows the short form; only the full text is announced.
    const fullText = screen.getByText(full);
    const shortText = screen.getByText(short);
    expect(fullText.getAttribute("aria-hidden")).toBeNull();
    expect(fullText.className).toContain("astw:@max-[480px]/data-table-footer:sr-only");
    expect(shortText.getAttribute("aria-hidden")).toBe("true");
    expect(shortText.className).toContain("astw:hidden");
    expect(shortText.className).toContain("astw:@max-[480px]/data-table-footer:inline");
  });

  it("shows 'Y row(s) selected' by count when rows are selected and no total", async () => {
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
    expect(screen.getByText("1 row selected")).not.toBeNull();

    await user.click(checkboxes[2]);
    expect(screen.getByText("2 rows selected")).not.toBeNull();
  });

  it("shows nothing when no total and no selection enabled", () => {
    const { container } = render(
      <TestPagination data={dataWithRowsNoTotal} control={makeControl()} />,
      {
        wrapper,
      },
    );
    // No row info text should be rendered
    expect(screen.queryByText(/row\(s\)/)).toBeNull();
    expect(container.querySelector(".astw\\:text-sm.astw\\:text-muted-foreground")).toBeNull();
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
    expect(screen.queryByText(/row\(s\)/)).toBeNull();
  });
});
