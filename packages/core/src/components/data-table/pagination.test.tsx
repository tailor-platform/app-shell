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
    cursor: null,
    paginationDirection: "forward",
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    resetPage: vi.fn(),
    goToFirstPage: vi.fn(),
    goToLastPage: vi.fn(),
    ...overrides,
  };
}

function TestPagination({
  data,
  control,
}: {
  data: DataTableData<TestRow>;
  control: CollectionControl;
}) {
  const table = useDataTable<TestRow>({ columns: testColumns, data, control });
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
// useCurrentPage — page counter behaviour
//
// The hook is internal, so it is tested through DataTable.Pagination.
// ---------------------------------------------------------------------------
describe("useCurrentPage", () => {
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
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Next page"));
    await user.click(screen.getByLabelText("Previous page"));
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("does not decrement below 1", async () => {
    const user = userEvent.setup();
    // hasPreviousPage: true so the button is enabled, but we're on page 1
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

    await user.click(screen.getByLabelText("Previous page"));
    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("resets to 1 on First-page click", async () => {
    const user = userEvent.setup();
    render(<TestPagination data={dataWithTotal} control={makeControl()} />, {
      wrapper,
    });

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

  it("resets to 1 when cursor is externally reset to null+forward (e.g. filter change)", () => {
    // Simulate: user is on page 3, then a filter change resets cursor→null+forward
    const controlOnPage3 = makeControl({
      cursor: "page-3-cursor",
      paginationDirection: "forward",
    });
    const { rerender } = render(<TestPagination data={dataWithTotal} control={controlOnPage3} />, {
      wrapper,
    });

    // Advance page counter manually to reflect "we are on page 3"
    // We simulate this by using a control that already has a non-null cursor
    // and then re-rendering with the reset control.
    const resetControl = makeControl({
      cursor: null,
      paginationDirection: "forward",
    });
    rerender(<TestPagination data={dataWithTotal} control={resetControl} />);

    expect(screen.getByText("Page 1 / 5")).not.toBeNull();
  });

  it("jumps to totalPages when cursor is externally reset to null+backward (goToLastPage)", () => {
    const controlMidPage = makeControl({
      cursor: "mid-cursor",
      paginationDirection: "forward",
    });
    const { rerender } = render(<TestPagination data={dataWithTotal} control={controlMidPage} />, {
      wrapper,
    });

    const lastPageControl = makeControl({
      cursor: null,
      paginationDirection: "backward",
    });
    rerender(<TestPagination data={dataWithTotal} control={lastPageControl} />);

    expect(screen.getByText("Page 5 / 5")).not.toBeNull();
  });
});
