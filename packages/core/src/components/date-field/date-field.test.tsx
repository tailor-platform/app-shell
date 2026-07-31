import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CalendarDate,
  endOfWeek,
  isSameDay,
  parseDate,
  startOfWeek,
  today,
} from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DateField, DatePicker } from "./date-field";

afterEach(() => {
  cleanup();
});

function getCalendarCells() {
  return screen.getAllByRole("button", { hidden: true }).filter((c) => c.closest('[role="grid"]'));
}

function getEnabledCalendarCells() {
  return getCalendarCells().filter(
    (c) => !c.hasAttribute("data-disabled") && !c.hasAttribute("data-outside-month"),
  );
}

async function expectLastEmit(onChange: ReturnType<typeof vi.fn>, expected: string) {
  await waitFor(() => {
    expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe(expected);
  });
}

function ControlledField({ onChange }: { onChange: (v: unknown) => void }) {
  const [value, setValue] = useState<CalendarDate | null>(null);

  return (
    <>
      <DateField
        aria-label="Date"
        value={value}
        onChange={(nextValue) => {
          setValue(nextValue as CalendarDate | null);
          onChange(nextValue);
        }}
      />
      <button type="button">elsewhere</button>
    </>
  );
}

describe("snapshots", () => {
  it("DateField", () => {
    const { container } = render(<DateField aria-label="Invoice date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DateField — manually labelled + described", () => {
    const { container } = render(
      <>
        <label id="date-label" htmlFor="date-input">
          Date
        </label>
        <DateField
          id="date-input"
          aria-labelledby="date-label"
          aria-describedby="date-help date-error"
          isInvalid
        />
        <p id="date-help">Pick a date</p>
        <p id="date-error">Required</p>
      </>,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DatePicker — closed", () => {
    const { container } = render(<DatePicker aria-label="Ship date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("DateField", () => {
  it("renders standalone with an aria-label", () => {
    render(<DateField aria-label="Invoice date" />);
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(0);
  });

  it("focuses the first segment when a linked external label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label id="date-label" htmlFor="date-input">
          Date
        </label>
        <DateField id="date-input" aria-labelledby="date-label" />
      </>,
    );

    await user.click(screen.getByText("Date"));
    expect(document.activeElement?.getAttribute("role")).toBe("spinbutton");
  });

  it("supports manual aria-describedby and invalid state", () => {
    render(
      <>
        <span id="date-label">Date</span>
        <DateField aria-labelledby="date-label" aria-describedby="date-help date-error" isInvalid />
        <p id="date-help">Pick a date</p>
        <p id="date-error">Required</p>
      </>,
    );

    const group = screen.getByRole("group");
    expect(group.getAttribute("aria-describedby")).toBe("date-help date-error");
    expect(group.hasAttribute("data-invalid")).toBe(true);
    expect(screen.getByText("Required")).toBeDefined();
  });

  it("fires onChange once a complete date is typed across the segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await expectLastEmit(onChange, "2025-06-15");
  });

  it("auto-advances across segments as a full date is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02152025");

    await expectLastEmit(onChange, "2025-02-15");
  });

  it("accumulates a non-leading-zero entry (2 then 9 → 29, not 9)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("12");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await expectLastEmit(onChange, "2025-12-29");
  });

  it("accepts day 31 typed before a month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("31");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("12");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await expectLastEmit(onChange, "2025-12-31");
  });

  it("clamps an impossible day to the month's length on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("30");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, "2026-02-28");
  });

  it("keeps 29 Feb in a leap year (no over-clamp)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, "2024-02-29");
  });

  it("clamps an impossible day on blur even when controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledField onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, "2026-02-28");
  });

  it("re-clamps when editing the year turns a valid leap day invalid", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledField onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024");
    await expectLastEmit(onChange, "2024-02-29");

    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, "2026-02-28");
  });

  it("auto-corrects an impossible day as soon as the year is complete", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");

    await expectLastEmit(onChange, "2026-02-28");
  });

  it("re-corrects on year completion when a leap day turns invalid", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024");
    await expectLastEmit(onChange, "2024-02-29");

    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");

    await expectLastEmit(onChange, "2026-02-28");
  });

  it("backfills the current month + year when only the day is entered, on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("2");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, today("UTC").set({ day: 2 }).toString());
  });

  it("backfills the current year when day + month are entered, on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("08");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, today("UTC").set({ month: 8, day: 2 }).toString());
  });

  it("never backfills the day for a lone year entry", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(onChange.mock.calls.some(([value]) => value != null)).toBe(false);
  });

  it("calls onBlur once when focus leaves the whole group", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onBlur={onBlur} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("clears a controlled DateField when the value is reset to null", () => {
    const { rerender } = render(
      <DateField
        aria-label="Date"
        value={parseDate("2025-06-15") as CalendarDate}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "day" }).textContent).toBe("15");

    rerender(<DateField aria-label="Date" value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-valuetext")).toBe(
      "Empty",
    );
  });

  it("marks the segments required when isRequired is set", () => {
    render(<DateField aria-label="Date" isRequired />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-required")).toBe(
      "true",
    );
  });

  it("flags a typed date before minValue invalid, but still emits it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField aria-label="Date" minValue={new CalendarDate(2025, 6, 10)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06052025");

    await expectLastEmit(onChange, "2025-06-05");
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("flags a typed date invalid when isDateUnavailable rejects it", async () => {
    const user = userEvent.setup();
    render(
      <DateField aria-label="Date" isDateUnavailable={(d) => d.toString() === "2025-06-12"} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06122025");

    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("honours firstDayOfWeek for 'w' in a standalone DateField", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        locale="en-US"
        firstDayOfWeek="mon"
        defaultValue={new CalendarDate(2025, 6, 18)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w");

    await expectLastEmit(onChange, "2025-06-16");
  });
});

describe("DateField keyboard shortcuts", () => {
  it("'t' jumps to today (case-insensitive)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("T");

    await expectLastEmit(onChange, today("UTC").toString());
  });

  it("'m' goes to the start of the entered month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("m");

    await expectLastEmit(onChange, "2025-06-01");
  });

  it("'m' falls back to the start of the current month when no date is entered", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("m");

    await expectLastEmit(onChange, today("UTC").set({ day: 1 }).toString());
  });

  it("'h' goes to the end of the entered month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("h");

    await expectLastEmit(onChange, "2025-06-30");
  });

  it("'y' and 'r' jump to the start / end of the entered year", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");
    await expectLastEmit(onChange, "2025-01-01");

    await user.keyboard("r");
    await expectLastEmit(onChange, "2025-12-31");
  });

  it("'w' and 'k' jump to the start / end of the week (locale-aware)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const start = new CalendarDate(2025, 6, 18);
    render(<DateField aria-label="Date" locale="en-US" defaultValue={start} onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w");
    await expectLastEmit(onChange, startOfWeek(start, "en-US").toString());

    await user.keyboard("k");
    await expectLastEmit(onChange, endOfWeek(start, "en-US").toString());
  });

  it("'-' decrements a day and rolls back over the month boundary", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 3, 1)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("-");

    await expectLastEmit(onChange, "2025-02-28");
  });

  it("'-' rolls back over the year boundary", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 1, 1)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("-");

    await expectLastEmit(onChange, "2024-12-31");
  });

  it("'=' and '+' both increment a day and roll over the year boundary", async () => {
    const user = userEvent.setup();

    const onChangeEq = vi.fn();
    const { unmount } = render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 12, 31)}
        onChange={onChangeEq}
      />,
    );
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("=");
    await expectLastEmit(onChangeEq, "2026-01-01");
    unmount();

    const onChangePlus = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 12, 31)}
        onChange={onChangePlus}
      />,
    );
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("+");
    await expectLastEmit(onChangePlus, "2026-01-01");
  });

  it("'-' / '+' step from today when the field is empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("+");

    await expectLastEmit(onChange, today("UTC").add({ days: 1 }).toString());
  });

  it("expands a 2-digit year to the 2000s on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField aria-label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("26");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await expectLastEmit(onChange, "2026-06-15");
  });

  it("expands a 2-digit year as soon as the year segment is left", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("26");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));

    await expectLastEmit(onChange, "2026-06-15");
  });

  it("flags a shortcut target invalid when it lands outside minValue / maxValue", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        maxValue={new CalendarDate(2025, 6, 20)}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("group");

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");
    await expectLastEmit(onChange, "2025-01-01");
    expect(group.hasAttribute("data-invalid")).toBe(true);

    await user.keyboard("r");
    await expectLastEmit(onChange, "2025-12-31");
    expect(group.hasAttribute("data-invalid")).toBe(true);
  });

  it("clears the invalid flag once the typed date is back within range", async () => {
    const user = userEvent.setup();
    render(<DateField aria-label="Date" minValue={new CalendarDate(2025, 6, 10)} />);
    const group = screen.getByRole("group");

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06052025");
    expect(group.hasAttribute("data-invalid")).toBe(true);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");

    await waitFor(() => {
      expect(group.hasAttribute("data-invalid")).toBe(false);
    });
  });

  it("'/' commits the current segment and advances to the next", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("1/15");
    await user.keyboard("2025");

    await expectLastEmit(onChange, "2025-01-15");
  });
});

describe("DatePicker", () => {
  it("renders standalone with an aria-label", () => {
    render(<DatePicker aria-label="Ship date" />);
    expect(screen.getByRole("button", { name: "Open calendar" })).toBeDefined();
  });

  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  it("fires onChange when a calendar date cell is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker aria-label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    const enabled = getEnabledCalendarCells();
    await user.click(enabled[0]);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0]).not.toBeNull();
    });
  });

  it("renders cells with data-disabled when minValue is set", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Date"
        minValue={new CalendarDate(2025, 6, 10)}
        defaultValue={new CalendarDate(2025, 6, 15)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    expect(getCalendarCells().some((cell) => cell.hasAttribute("data-disabled"))).toBe(true);
  });

  it("renders cells with data-unavailable when isDateUnavailable returns true", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        isDateUnavailable={(date) => isSameDay(date, new CalendarDate(2025, 6, 12))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    expect(getCalendarCells().some((cell) => cell.hasAttribute("data-unavailable"))).toBe(true);
  });

  it("clears a controlled DatePicker when the value is reset to null", () => {
    const { rerender } = render(
      <DatePicker
        aria-label="Date"
        value={parseDate("2025-06-15") as CalendarDate}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "day" }).textContent).toBe("15");

    rerender(<DatePicker aria-label="Date" value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-valuetext")).toBe(
      "Empty",
    );
  });

  it("honours firstDayOfWeek for 'w' in the field path when the popover is closed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        locale="en-US"
        firstDayOfWeek="mon"
        defaultValue={new CalendarDate(2025, 6, 18)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w");

    await expectLastEmit(onChange, "2025-06-16");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("flags a field shortcut invalid when it lands before minValue (popover closed)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");

    await expectLastEmit(onChange, "2025-01-01");
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("supports manual invalid state", () => {
    render(<DatePicker aria-label="Date" isInvalid />);
    expect(screen.getByRole("group").hasAttribute("data-invalid")).toBe(true);
  });

  it("localizes segment names and chrome from the AppShell locale (ja)", () => {
    render(<DatePicker aria-label="日付" />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("spinbutton", { name: "月" })).toBeDefined();
    expect(screen.getByRole("button", { name: "カレンダーを開く" })).toBeDefined();
    expect(screen.getByRole("spinbutton", { name: "月" }).getAttribute("aria-valuetext")).toBe(
      "未入力",
    );
  });
});

describe("DatePicker keyboard", () => {
  it("moves focus into the calendar grid when the popover opens", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />);

    await user.click(screen.getByRole("button", { name: "Open calendar" }));

    await waitFor(() => {
      expect(document.activeElement?.closest('[role="grid"]')).not.toBeNull();
    });
  });

  it("opens the calendar with Alt+↓ from a focused segment", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  it("a shortcut moves the calendar highlight while the popover is open", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    await user.keyboard("m");
    await user.keyboard("{Enter}");

    await expectLastEmit(onChange, "2025-06-01");
  });

  it("clamps an open-popover shortcut to minValue", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        aria-label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    await user.keyboard("y");
    await user.keyboard("{Enter}");

    await expectLastEmit(onChange, "2025-06-10");
  });
});
