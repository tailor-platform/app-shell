import type { ReactNode } from "react";
import { vi } from "vitest";
import type userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../../tests/test-utils";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import type { CollectionControl } from "@/types/collection";
import { DataTable } from "../data-table";
import { useDataTable } from "../use-data-table";
import type { Column } from "../types";

export type TestRow = Record<string, unknown>;

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

export function TestFilters({
  control,
  columns,
  slot,
  addIconOnly,
}: {
  control: CollectionControl;
  columns: Column<TestRow>[];
  slot?: "all" | "chips" | "add";
  addIconOnly?: boolean;
}) {
  const table = useDataTable<TestRow>({ columns, data: { rows: [] }, control });
  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar>
        <DataTable.Filters slot={slot} addIconOnly={addIconOnly} />
      </DataTable.Toolbar>
    </DataTable.Root>
  );
}

export const wrapper = createAppShellWrapper("en");
export const timeZoneWrapper = ({ children }: { children: ReactNode }) => (
  <AppShellConfigContext.Provider
    value={{
      configurations: buildConfigurations({
        modules: [],
        locale: "en",
        timeZone: "America/Los_Angeles",
      }),
    }}
  >
    {children}
  </AppShellConfigContext.Provider>
);

// The value segment is the second-to-last button: [operator?, value, remove].
function valueSegmentButton(chipIndex = 0): HTMLButtonElement {
  const chip = document.querySelectorAll('[data-slot="data-table-filter-chip"]')[chipIndex];
  if (!chip) throw new Error("No filter chip rendered");
  const buttons = chip.querySelectorAll("button");
  return buttons[buttons.length - 2] as HTMLButtonElement;
}

export async function openValueEditor(user: ReturnType<typeof userEvent.setup>, chipIndex = 0) {
  await user.click(valueSegmentButton(chipIndex));
}

export const stringColumn: Column<TestRow> = {
  id: "name",
  label: "Name",
  render: (r) => String(r.name ?? ""),
  filter: { type: "string", field: "name" },
};

export const uuidColumn: Column<TestRow> = {
  id: "id",
  label: "ID",
  render: (r) => String(r.id ?? ""),
  filter: { type: "uuid", field: "id" },
};

export const numberColumn: Column<TestRow> = {
  id: "count",
  label: "Count",
  render: (r) => String(r.count ?? ""),
  filter: { type: "number", field: "count" },
};

export const dateColumn: Column<TestRow> = {
  id: "createdAt",
  label: "Created At",
  render: (r) => String(r.createdAt ?? ""),
  filter: { type: "date", field: "createdAt" },
};

export const datetimeColumn: Column<TestRow> = {
  id: "publishedAt",
  label: "Published At",
  render: (r) => String(r.publishedAt ?? ""),
  filter: { type: "datetime", field: "publishedAt" },
};

export const timeColumn: Column<TestRow> = {
  id: "opensAt",
  label: "Opens At",
  render: (r) => String(r.opensAt ?? ""),
  filter: { type: "time", field: "opensAt" },
};
