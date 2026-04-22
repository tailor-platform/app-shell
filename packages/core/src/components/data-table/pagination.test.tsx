import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createAppShellWrapper } from "../../../../tests/test-utils";
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

function TestPagination({ data }: { data: DataTableData<TestRow> }) {
  const control = makeControl();
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

describe("DataTable.Pagination", () => {
  it("shows First/Last buttons when total is provided", () => {
    const data: DataTableData<TestRow> = {
      rows: [],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        nextPageToken: "tok",
        previousPageToken: null,
      },
      total: 50,
    };
    render(<TestPagination data={data} />, { wrapper });

    expect(screen.queryByLabelText("First page")).not.toBeNull();
    expect(screen.queryByLabelText("Last page")).not.toBeNull();
  });

  it("hides First/Last buttons when total is not provided", () => {
    const data: DataTableData<TestRow> = {
      rows: [],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        nextPageToken: "tok",
        previousPageToken: null,
      },
    };
    render(<TestPagination data={data} />, { wrapper });

    expect(screen.queryByLabelText("First page")).toBeNull();
    expect(screen.queryByLabelText("Last page")).toBeNull();
  });

  it("still shows Previous/Next buttons when total is not provided", () => {
    const data: DataTableData<TestRow> = {
      rows: [],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        nextPageToken: "tok",
        previousPageToken: null,
      },
    };
    render(<TestPagination data={data} />, { wrapper });

    expect(screen.queryByLabelText("Previous page")).not.toBeNull();
    expect(screen.queryByLabelText("Next page")).not.toBeNull();
  });
});
