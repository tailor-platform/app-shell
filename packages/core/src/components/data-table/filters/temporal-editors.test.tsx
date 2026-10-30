import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  TestFilters,
  dateColumn,
  datetimeColumn,
  makeControl,
  openValueEditor,
  timeColumn,
  timeZoneWrapper,
  wrapper,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

// DatePicker segments are re-queried by index to survive controlled re-renders.
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

describe("TemporalFilterEditor", () => {
  it("hydrates the date picker + time box from an RFC 3339 datetime", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const value = "2025-01-01T10:30:00Z";
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await openValueEditor(user);

    // Date part is a segmented picker (a group), time part a native time box
    // seeded from the RFC 3339 instant in the configured AppShell timezone.
    expect(await screen.findByRole("group")).toBeDefined();
    expect(screen.getByDisplayValue("02:30")).toBeDefined();
  });

  it("serializes the selected local datetime as an RFC 3339 instant on Apply", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await openValueEditor(user);

    fireEvent.change(await screen.findByDisplayValue("10:30"), { target: { value: "08:45" } });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("publishedAt", "eq", "2025-01-01T16:45:00.000Z");
  });

  it("serializes both datetime between bounds as RFC 3339 instants", async () => {
    const user = userEvent.setup();
    vi.stubEnv("TZ", "UTC");
    const control = makeControl({
      filters: [
        {
          field: "publishedAt",
          operator: "between",
          value: { min: "2025-01-01T10:30:00", max: "2025-01-02T11:30:00" },
        },
      ],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    await openValueEditor(user);

    fireEvent.change(await screen.findByDisplayValue("10:30"), { target: { value: "08:45" } });
    fireEvent.change(screen.getByDisplayValue("11:30"), { target: { value: "09:15" } });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(control.addFilter).toHaveBeenCalledWith("publishedAt", "between", {
      min: "2025-01-01T16:45:00.000Z",
      max: "2025-01-02T17:15:00.000Z",
    });
  });

  it("formats datetime chip values in the configured AppShell timezone", () => {
    vi.stubEnv("TZ", "UTC");
    const expected = new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format(new Date("2025-01-01T10:30:00Z"));
    const control = makeControl({
      filters: [{ field: "publishedAt", operator: "eq", value: "2025-01-01T10:30:00Z" }],
    });
    render(<TestFilters control={control} columns={[datetimeColumn]} />, {
      wrapper: timeZoneWrapper,
    });

    expect(screen.getByText(expected)).toBeDefined();
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
