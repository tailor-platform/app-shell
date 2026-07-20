import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
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
// Filter chip segment helpers
// ---------------------------------------------------------------------------
// The redesigned filter chip (`data-slot="data-table-filter-chip"`) is a
// segmented control. Its buttons are, in order, [operator?, value, remove]:
//   - field  → a plain <span> (never a button)
//   - operator → a <button> when the field has >1 operator, otherwise a <span>
//   - value  → always a <button>; clicking it opens the value-editor popover
//   - remove → a <button> with aria-label "Remove filter"
// The value segment is therefore always the *second-to-last* button, regardless
// of whether the operator segment is a button — a stable way to open the value
// editor without depending on the (type-specific, now value-only) button name.

function valueSegmentButton(chipIndex = 0): HTMLButtonElement {
  const chip = document.querySelectorAll('[data-slot="data-table-filter-chip"]')[chipIndex];
  if (!chip) throw new Error("No filter chip rendered");
  const buttons = chip.querySelectorAll("button");
  return buttons[buttons.length - 2] as HTMLButtonElement;
}

async function openValueEditor(user: ReturnType<typeof userEvent.setup>, chipIndex = 0) {
  await user.click(valueSegmentButton(chipIndex));
}

// ---------------------------------------------------------------------------
// Date filter (DatePicker) helpers
// ---------------------------------------------------------------------------
// `date` filters render the app-shell DatePicker — a labelled group of
// `spinbutton` segments — instead of a native date input. These helpers drive
// it via the segments, re-querying by index so they survive controlled
// re-renders.

const datePickerGroup = (index: number) => screen.getAllByRole("group")[index];

async function typeDateInto(
  user: ReturnType<typeof userEvent.setup>,
  groupIndex: number,
  iso: string,
) {
  const [year, month, day] = iso.split("-");
  const seg = (name: string) =>
    within(datePickerGroup(groupIndex)).getByRole("spinbutton", { name });
  await user.click(seg("month"));
  await user.keyboard(month);
  await user.click(seg("day"));
  await user.keyboard(day);
  await user.click(seg("year"));
  await user.keyboard(year);
}

async function clearDateIn(user: ReturnType<typeof userEvent.setup>, groupIndex: number) {
  // Clear every segment. Leaving the day set would trigger the field's on-blur
  // backfill (assume current month/year), so a genuine "cleared" state must
  // remove the day too — the day is the trigger for that backfill.
  for (const name of ["day", "month", "year"]) {
    await user.click(within(datePickerGroup(groupIndex)).getByRole("spinbutton", { name }));
    await user.keyboard("{Delete}");
  }
}

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

  it("renders a segmented filter chip (field / operator / value) for each active filter", () => {
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    const { container } = render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(container.querySelector('[data-slot="data-table-filter-chip"]')).not.toBeNull();
    // The chip is segmented: the field, operator, and value each render in their
    // own element rather than a single combined label.
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("contains")).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("renders the add filter button when there are unfiltered filterable columns", () => {
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.getByText("Add filter")).toBeDefined();
  });

  it("still renders the add filter button when all filterable columns are active", () => {
    // The add-filter trigger is always available now (it re-opens the editor for
    // active fields too), so it must remain present even when every filterable
    // column already has a chip.
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });
    expect(screen.getByText("Add filter")).toBeDefined();
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
// AddFilterPanel — the add-filter trigger opens a 3-column panel
// ---------------------------------------------------------------------------

describe("AddFilterPanel", () => {
  it("opens a panel listing every filterable field", async () => {
    // The add-filter surface is a single popover with three columns
    // (field ▸ condition ▸ value); the first column lists each filterable field
    // as a button.
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));

    expect(await screen.findByRole("button", { name: /^Name$/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /^Count$/ })).toBeDefined();
  });

  it("selecting a field shows the value editor with an Apply button", async () => {
    const user = userEvent.setup();
    const control = makeControl({ filters: [] });
    render(<TestFilters control={control} columns={[stringColumn, numberColumn]} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Count$/ }));

    // Amount/Count is numeric → condition column + a value input + Apply.
    expect(await screen.findByRole("button", { name: /^Apply$/ })).toBeDefined();
  });

  it("seeds an already-filtered field's operator/value so Apply preserves them", async () => {
    // Re-opening the panel on a field that already has a non-default filter
    // (here a number "between") must keep that operator and value rather than
    // resetting to the type default — otherwise Apply would silently overwrite.
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 5, max: 10 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Apply$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "between", { min: 5, max: 10 });
  });

  it("preserves case-sensitivity when re-applying a string filter from the panel", async () => {
    // The panel has no case-sensitive toggle; re-applying must carry the active
    // filter's caseSensitive flag through rather than clearing it.
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice", caseSensitive: true }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /Add filter/ }));
    await user.click(await screen.findByRole("button", { name: /^Apply$/ }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice", {
      caseSensitive: true,
    });
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
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

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

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Bob");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    // The operator comes from the chip's own operator segment (the editor is
    // rendered with hideOperator), so it stays "contains".
    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Bob", {
      caseSensitive: false,
    });
  });

  it("Enter key calls addFilter with the updated value", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "Charlie");
    await user.keyboard("{Enter}");

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Charlie", {
      caseSensitive: false,
    });
  });

  it("Apply button calls removeFilter when the value is cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("name");
  });

  it("shows a Case sensitive checkbox", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByText("Case sensitive")).toBeDefined();
  });

  it("Apply with case-sensitive checked calls addFilter with caseSensitive option", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "name", operator: "contains", value: "Alice" }],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const checkbox = await screen.findByRole("checkbox");
    await user.click(checkbox);

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("name", "contains", "Alice", {
      caseSensitive: true,
    });
  });

  it("restores case-sensitive state from existing filter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [
        {
          field: "name",
          operator: "contains",
          value: "Alice",
          caseSensitive: true,
        },
      ],
    });
    render(<TestFilters control={control} columns={[stringColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const checkbox = await screen.findByRole("checkbox");
    expect((checkbox as HTMLElement).dataset.checked).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// UuidFilterEditor — Apply button and Enter key
// ---------------------------------------------------------------------------

describe("UuidFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "id", operator: "eq", value: "uuid-123" }],
    });
    render(<TestFilters control={control} columns={[uuidColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

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

    await openValueEditor(user);

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

    await openValueEditor(user);

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
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "eq", value: 42 }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

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

    await openValueEditor(user);

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

    await openValueEditor(user);

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
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    expect(await screen.findByRole("button", { name: "Apply" })).toBeDefined();
  });

  it("renders a DatePicker (spinbutton segments) for the date filter", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await openValueEditor(user);

    // The editor uses the app-shell DatePicker: a labelled group of spinbuttons.
    expect(
      await within(datePickerGroup(0)).findByRole("spinbutton", { name: "day" }),
    ).toBeDefined();
  });

  it("Apply button calls addFilter with the selected date", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });

    await typeDateInto(user, 0, "2026-06-15");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("createdAt", "eq", "2026-06-15");
  });

  it("Apply button calls removeFilter when the date is cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });

    await clearDateIn(user, 0);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("createdAt");
  });

  it("labels date operators as exact date / after / before and formats the value", () => {
    // The chip's operator segment shows the friendly date labels, and the value
    // segment shows a locale-formatted medium date (never the raw ISO string).
    const { rerender } = render(
      <TestFilters
        control={makeControl({
          filters: [{ field: "createdAt", operator: "eq", value: "2025-01-01" }],
        })}
        columns={[dateColumn]}
      />,
      { wrapper },
    );
    expect(screen.getByText("exact date")).toBeDefined();
    expect(screen.getByText("Jan 1, 2025")).toBeDefined();
    expect(screen.queryByText(/2025-01-01/)).toBeNull();

    rerender(
      <TestFilters
        control={makeControl({
          filters: [{ field: "createdAt", operator: "gte", value: "2025-02-01" }],
        })}
        columns={[dateColumn]}
      />,
    );
    expect(screen.getByText("after")).toBeDefined();
    expect(screen.getByText("Feb 1, 2025")).toBeDefined();
    expect(screen.queryByText("greater than")).toBeNull();

    rerender(
      <TestFilters
        control={makeControl({
          filters: [{ field: "createdAt", operator: "lte", value: "2025-03-01" }],
        })}
        columns={[dateColumn]}
      />,
    );
    expect(screen.getByText("before")).toBeDefined();
    expect(screen.getByText("Mar 1, 2025")).toBeDefined();
  });

  it("preserves a legacy operator (e.g. gt) on Apply instead of coercing to eq", async () => {
    const user = userEvent.setup();
    // A saved view / useCollectionVariables config can hold a date filter on the
    // now-dropped `gt` operator. Opening + re-applying it must NOT silently flip
    // it to `eq` (which would turn "after X" into "on X").
    const control = makeControl({
      filters: [{ field: "createdAt", operator: "gt", value: "2025-01-01" }],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    // The chip's operator segment still renders the legacy operator's (generic) label.
    expect(screen.getByText("greater than")).toBeDefined();

    // Open the value editor (operator hidden there) and Apply without touching
    // anything → the operator is preserved.
    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("createdAt", "gt", "2025-01-01");
    expect(control.addFilter).not.toHaveBeenCalledWith("createdAt", "eq", expect.anything());
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

    await openValueEditor(user);

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

    await openValueEditor(user);

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

    await openValueEditor(user);

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
  it("shows the operator segment as 'is any of' and summarizes multiple selections", () => {
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active", "inactive"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, { wrapper });

    // enum has a single operator, so it renders as plain text, not a button.
    expect(screen.getByText("is any of")).toBeDefined();
    // >1 option selected is summarized as "N <pluralized label>".
    expect(screen.getByText("2 statuses")).toBeDefined();
  });

  it("toggling a checkbox calls addFilter immediately without an Apply button", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "status", operator: "in", value: ["active"] }],
    });
    render(<TestFilters control={control} columns={[enumColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    // Click the "Inactive" option (only appears in the opened value list).
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

    await openValueEditor(user);

    // Wait for the value list to open, then uncheck "Active" from within it.
    // ("Active" also appears in the chip's value segment, so scope to the list.)
    await screen.findByText("Inactive");
    const list = document.querySelector('[data-slot="data-table-filter-enum"]') as HTMLElement;
    await user.click(within(list).getByText("Active"));

    expect(control.removeFilter).toHaveBeenCalledWith("status");
  });
});

// ---------------------------------------------------------------------------
// BooleanFilterEditor — value select + Apply button (operator lives on the chip)
// ---------------------------------------------------------------------------

describe("BooleanFilterEditor", () => {
  it("shows an Apply button after opening the chip value popover", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "enabled", operator: "eq", value: true }],
    });
    render(<TestFilters control={control} columns={[booleanColumn]} />, {
      wrapper,
    });

    // Operator segment reflects the "is" (eq) operator; value segment shows "True".
    expect(screen.getByText("is")).toBeDefined();
    expect(screen.getByText("True")).toBeDefined();

    await openValueEditor(user);

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

    await openValueEditor(user);
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

    await openValueEditor(user);
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

    await openValueEditor(user);
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

    // Operator segment reflects "is not" (ne); the hidden editor operator is
    // seeded from the filter's operator, so Apply preserves ne.
    expect(screen.getByText("is not")).toBeDefined();

    await openValueEditor(user);
    await user.click(await screen.findByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("enabled", "ne", true);
  });
});

// ---------------------------------------------------------------------------
// NumericFilterEditor — between operator (two inputs)
// ---------------------------------------------------------------------------

describe("NumericFilterEditor (between)", () => {
  it("shows the between value summary and two number inputs when operator is between", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    // Chip: operator segment "is between", value segment "10 - 50".
    expect(screen.getByText("is between")).toBeDefined();
    expect(screen.getByText("10 - 50")).toBeDefined();

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).value).toBe("10");
    expect((inputs[1] as HTMLInputElement).value).toBe("50");
  });

  it("Apply button calls addFilter with min/max range object", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "5");
    await user.clear(inputs[1]);
    await user.type(inputs[1], "100");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("count", "between", {
      min: 5,
      max: 100,
    });
  });

  it("Apply button does not call addFilter when only min is set and max is empty", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    // min should already be "10", max should be empty
    expect((inputs[0] as HTMLInputElement).value).toBe("10");
    expect((inputs[1] as HTMLInputElement).value).toBe("");

    // A half-filled range is invalid, so Apply is disabled and commits nothing.
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).not.toHaveBeenCalled();
  });

  it("Apply button calls removeFilter when both inputs are empty", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [{ field: "count", operator: "between", value: { min: 10, max: 50 } }],
    });
    render(<TestFilters control={control} columns={[numberColumn]} />, {
      wrapper,
    });

    await openValueEditor(user);

    const inputs = await screen.findAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.clear(inputs[1]);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("count");
  });
});

// ---------------------------------------------------------------------------
// TemporalFilterEditor — between operator (two inputs)
// ---------------------------------------------------------------------------

describe("TemporalFilterEditor (between)", () => {
  it("shows a date range value (en dash, medium dates) and two date pickers", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [
        {
          field: "createdAt",
          operator: "between",
          value: { min: "2025-01-01", max: "2025-12-31" },
        },
      ],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    // The value segment renders "<min> – <max>" using medium dates (en dash).
    expect(
      screen.getByText(
        (content) => content.includes("Jan 1, 2025") && content.includes("Dec 31, 2025"),
      ),
    ).toBeDefined();

    await openValueEditor(user);

    await screen.findByRole("button", { name: "Apply" });
    expect(screen.getAllByRole("group")).toHaveLength(2);
  });

  it("Apply button calls addFilter with min/max range for date between", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [
        {
          field: "createdAt",
          operator: "between",
          value: { min: "2025-01-01", max: "2025-12-31" },
        },
      ],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });

    await typeDateInto(user, 0, "2026-03-01");
    await typeDateInto(user, 1, "2026-06-30");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("createdAt", "between", {
      min: "2026-03-01",
      max: "2026-06-30",
    });
  });

  it("Apply button calls removeFilter when both date pickers are cleared", async () => {
    const user = userEvent.setup();
    const control = makeControl({
      filters: [
        {
          field: "createdAt",
          operator: "between",
          value: { min: "2025-01-01", max: "2025-12-31" },
        },
      ],
    });
    render(<TestFilters control={control} columns={[dateColumn]} />, { wrapper });

    await openValueEditor(user);
    await screen.findByRole("button", { name: "Apply" });

    await clearDateIn(user, 0);
    await clearDateIn(user, 1);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.removeFilter).toHaveBeenCalledWith("createdAt");
  });
});
