import { StrictMode, type ReactNode } from "react";
import { fireEvent } from "@testing-library/react";
import { resetLocalTimeZone } from "@internationalized/date";
import { vi } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { Column, DataTableData } from "./types";

export type TestRow = { id: string; name: string; status: string };

export const testColumns: Column<TestRow>[] = [
  { label: "Name", render: (row) => row.name },
  { label: "Status", render: (row) => row.status },
];

export const testData: DataTableData<TestRow> = {
  rows: [
    { id: "1", name: "Alice", status: "Active" },
    { id: "2", name: "Bob", status: "Inactive" },
  ],
};

export function stubBrowserTimeZone() {
  vi.stubEnv("TZ", "UTC");
  resetLocalTimeZone();
}

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

export function TestDataTable(props: {
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

export const wrapper = createAppShellWrapper("en");

export function createTimeZoneWrapper(timeZone: string) {
  const configurations = buildConfigurations({ modules: [], locale: "en", timeZone });
  return function TimeZoneWrapper({ children }: { children: ReactNode }) {
    return (
      <AppShellConfigContext.Provider value={{ configurations }}>
        {children}
      </AppShellConfigContext.Provider>
    );
  };
}

export const headByText = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="data-table-header"] th')).find(
    (th) => th.textContent?.trim().startsWith(text),
  );

export const openHeaderContextMenu = (container: HTMLElement, text: string) => {
  const trigger = headByText(container, text)?.querySelector<HTMLElement>(
    '[data-slot="data-table-header-context-menu-trigger"]',
  );
  fireEvent.contextMenu(trigger!);
};

// StrictMode exposes callbacks fired from an impure state updater.
export const strictWrapper = ({ children }: { children: ReactNode }) => {
  const Wrapper = wrapper;
  return (
    <StrictMode>
      <Wrapper>{children}</Wrapper>
    </StrictMode>
  );
};
