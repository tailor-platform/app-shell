import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";
import type { CollectionControl } from "@/types/collection";
import type { Column } from "./types";

afterEach(() => {
  cleanup();
});

type TestRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function TestFilters({
  control,
  columns,
}: {
  control: CollectionControl;
  columns: Column<TestRow>[];
}) {
  const table = useDataTable<TestRow>({ columns, data: { rows: [] }, control });
  return (
    <DataTable.Root value={table}>
      <DataTable.Toolbar>
        <DataTable.Filters />
      </DataTable.Toolbar>
    </DataTable.Root>
  );
}

const wrapper = createAppShellWrapper("en");

// ---------------------------------------------------------------------------
// Column fixtures
// ---------------------------------------------------------------------------

const stringColumn: Column<TestRow> = {
  id: "name",
  label: "Name",
  render: (r) => String(r.name ?? ""),
  filter: { type: "string", field: "name" },
};

const uuidColumn: Column<TestRow> = {
  id: "id",
  label: "ID",
  render: (r) => String(r.id ?? ""),
  filter: { type: "uuid", field: "id" },
};

const numberColumn: Column<TestRow> = {
  id: "count",
  label: "Count",
  render: (r) => String(r.count ?? ""),
  filter: { type: "number", field: "count" },
};

const dateColumn: Column<TestRow> = {
  id: "createdAt",
  label: "Created At",
  render: (r) => String(r.createdAt ?? ""),
  filter: { type: "date", field: "createdAt" },
};

const datetimeColumn: Column<TestRow> = {
  id: "publishedAt",
  label: "Published At",
  render: (r) => String(r.publishedAt ?? ""),
  filter: { type: "datetime", field: "publishedAt" },
};

const timeColumn: Column<TestRow> = {
  id: "opensAt",
  label: "Opens At",
  render: (r) => String(r.opensAt ?? ""),
  filter: { type: "time", field: "opensAt" },
};

const enumColumn: Column<TestRow> = {
  id: "status",
  label: "Status",
  render: (r) => String(r.status ?? ""),
  filter: {
    type: "enum",
    field: "status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
};

const booleanColumn: Column<TestRow> = {
  id: "enabled",
  label: "Enabled",
  render: (r) => String(r.enabled ?? ""),
  filter: { type: "boolean", field: "enabled" },
};

// ---------------------------------------------------------------------------
// DataTable.Filters — rendering
// ---------------------------------------------------------------------------

describe("DataTable.Filters", () => {
  it("renders no filter chips when no active filters", () => {
    const control = makeControl({ filters: [] });
    const { container } = render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(container.querySelector('[data-slot="data-table-filter-chip"]')).toBeNull();
  });

  it("renders a filter chip for each active filter", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    const { container } = render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(container.querySelector('[data-slot="data-table-filter-chip"]')).not.toBeNull();
    expect(screen.getByText(/Name contains Alice/)).toBeDefined();
  });

  it("renders the add filter button when there are unfiltered filterable columns", () => {
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.getByText("Add filter")).toBeDefined();
  });

  it("does not render the add filter button when all filterable columns are active", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.queryByText("Add filter")).toBeNull();
  });

  it("returns null when there are no filterable columns", () => {
    const control = makeControl({ filters: [] });
    const nonFilterableColumn: Column<TestRow> = {
      id: "name",
      label: "Name",
      render: (r) => String(r.name ?? ""),
    };
    const { container } = render(
      <TestFilters control={control} columns={[nonFilterableColumn]} />,
      { wrapper },
    );
    expect(container.querySelector('[data-slot="data-table-filters"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FilterChip — remove button
// ---------------------------------------------------------------------------

describe("FilterChip", () => {
  it("calls removeFilter when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: "Remove filter" }));

    expect(control.removeFilter).toHaveBeenCalledWith("name");
  });
});

// ---------------------------------------------------------------------------
// StringFilterEditor — Apply button and Enter key
// ---------------------------------------------------------------------------

describe("StringFilterEditor", () => {
  it("shows an Apply button after opening the chip popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Name contains Alice/ }));

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated value and closes the popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Name contains Alice/ }));

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Bob");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Bob");
  });

  it("Enter key calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Name contains Alice/ }));

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Charlie");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Charlie");
  });

  it("Apply button calls removeFilter when the value is cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Name contains Alice/ }));

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("name");
  });
});

// ---------------------------------------------------------------------------
// UuidFilterEditor — Apply button and Enter key
// ---------------------------------------------------------------------------

describe("UuidFilterEditor", () => {
  it("shows an Apply button after opening the chip popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /ID equals uuid-123/ }));

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /ID equals uuid-123/ }));

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "uuid-456");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("id", "eq", "uuid-456");
  });

  it("Enter key calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /ID equals uuid-123/ }));

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "uuid-789");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("id", "eq", "uuid-789");
  });
});

// ---------------------------------------------------------------------------
// NumericFilterEditor — Apply button and Enter key
// ---------------------------------------------------------------------------

describe("NumericFilterEditor", () => {
  it("shows an Apply button after opening the chip popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Count equals 42/ }));

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the updated numeric value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Count equals 42/ }));

    const input = await screen.findByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "99");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "eq", 99);
  });

  it("Enter key calls addFilter with the updated numeric value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Count equals 42/ }));

    const input = await screen.findByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "7");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("count", "eq", 7);
  });
});

// ---------------------------------------------------------------------------
// DateFilterEditor — Apply button
// ---------------------------------------------------------------------------

describe("DateFilterEditor", () => {
  it("shows an Apply button after opening the chip popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Created At equals 2025-01-01/ }));

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("Apply button calls addFilter with the selected date", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    const { container } = render(<TestFilters control={control} columns={[dateColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Created At equals 2025-01-01/ }));

    // Use the data-slot selector since date inputs have no simple ARIA role
    const dateInput = await screen.findByDisplayValue("2025-01-01");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-06-15");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("createdAt", "eq", "2026-06-15");
    // Verify empty value triggers removeFilter instead
    void container; // suppress unused-var
  });

  it("Apply button calls removeFilter when date is cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Created At equals 2025-01-01/ }));

    const dateInput = await screen.findByDisplayValue("2025-01-01");
    await user.clear(dateInput);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("createdAt");
  });
});

// ---------------------------------------------------------------------------
// TemporalFilterEditor — datetime/time inputs preserve backend formats
// ---------------------------------------------------------------------------

describe("TemporalFilterEditor", () => {
  it("Apply button calls addFilter with a full RFC3339 datetime", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00Z" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper,
    });

    await user.click(
      screen.getByRole("button", {
        name: /Published At equals 2025-01-01T10:30:00Z/,
      }),
    );

    const input = await screen.findByDisplayValue("2025-01-01T10:30:00Z");
    await user.clear(input);
    await user.type(input, "2026-06-15T08:45:30+09:00");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith(
      "publishedAt",
      "eq",
      "2026-06-15T08:45:30+09:00",
    );
  });

  it("Apply button stays disabled for an invalid RFC3339 datetime", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00Z" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper,
    });

    await user.click(
      screen.getByRole("button", {
        name: /Published At equals 2025-01-01T10:30:00Z/,
      }),
    );

    const input = await screen.findByDisplayValue("2025-01-01T10:30:00Z");
    await user.clear(input);
    await user.type(input, "2026-06-15T08:45");

    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("Apply button calls addFilter with an HH:MM time", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "opensAt", operator: "eq", value: "09:30" }],
    });
    render(<TestFilters control={control} columns={[timeColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Opens At equals 09:30/ }));

    const input = await screen.findByDisplayValue("09:30");
    await user.clear(input);
    await user.type(input, "18:45");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("opensAt", "eq", "18:45");
  });
});

// ---------------------------------------------------------------------------
// EnumFilterEditor — immediate update on checkbox toggle
// ---------------------------------------------------------------------------

describe("EnumFilterEditor", () => {
  it("toggling a checkbox calls addFilter immediately without an Apply button", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Status in: Active/ }));

    // Click the "Inactive" option
    await user.click(await screen.findByText("Inactive"));

    expect(control.addFilter).toHaveBeenCalledWith("status", "in", ["active", "inactive"]);
    // No Apply button for enum
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("unchecking the only selected option calls removeFilter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Status in: Active/ }));

    // Uncheck "Active" (the currently selected option)
    await user.click(await screen.findByText("Active"));

    expect(control.removeFilter).toHaveBeenCalledWith("status");
  });
});

// ---------------------------------------------------------------------------
// BooleanFilterEditor — operator selector + value select + Apply button
// ---------------------------------------------------------------------------

describe("BooleanFilterEditor", () => {
  it("shows an Apply button after opening the chip popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Enabled equals True/ }));

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("does not call addFilter immediately on open", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Enabled equals True/ }));
    await screen.findByRole("button", { name: "Apply" });

    expect(control.addFilter).not.toHaveBeenCalled();
  });

  it("Apply button calls addFilter with the current value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Enabled equals True/ }));
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "eq", true);
  });

  it("Apply button calls addFilter with false when value is false", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: false }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Enabled equals False/ }));
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "eq", false);
  });

  it("Apply button calls addFilter with ne operator when filter has ne", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "ne", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Enabled not equals True/ }));
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "ne", true);
  });
});
