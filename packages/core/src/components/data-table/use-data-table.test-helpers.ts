import { vi } from "vitest";
import type { CollectionControl } from "@/types/collection";
import type { Column, DataTableData } from "./types";

export type TestRow = { id: string; name: string; value: number };

export const columns: Column<TestRow>[] = [
  { id: "name", label: "Name", render: (row) => row.name },
  { id: "value", label: "Value", render: (row) => String(row.value) },
];

export const testData: DataTableData<TestRow> = {
  rows: [
    { id: "1", name: "Alice", value: 10 },
    { id: "2", name: "Bob", value: 20 },
  ],
  pageInfo: {
    hasNextPage: true,
    hasPreviousPage: false,
    endCursor: "token-next",
    startCursor: null,
  },
  total: 50,
};

export function makeControl(overrides?: Partial<CollectionControl>): CollectionControl {
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
