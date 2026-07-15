import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CalendarDate,
  parseDate,
  today,
  getLocalTimeZone,
  startOfWeek,
  endOfWeek,
} from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DateField, DatePicker } from "./date-field";

// This suite is the parity contract shared with the react-aria implementation:
// it asserts public behaviour + the DOM accessibility contract (spinbutton
// segments, role="grid" cells with data-* state attributes, role="dialog"
// popover), not implementation details.

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find <div role="button"> day cells inside a calendar grid (not nav buttons). */
function getCalendarCells() {
  return screen.getAllByRole("button", { hidden: true }).filter((c) => c.closest('[role="grid"]'));
}

function getEnabledCalendarCells() {
  return getCalendarCells().filter(
    (c) => !c.hasAttribute("data-disabled") && !c.hasAttribute("data-outside-month"),
  );
}

// ─── Snapshots ──────────────────────────────────────────────────────────────
// Visual-structure snapshots per the add-component convention. Inputs are
// pinned (fixed `defaultValue`, no live "today" in view) so output is stable.

describe("snapshots", () => {
  it("DateField", () => {
    const { container } = render(<DateField label="Invoice date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DateField — invalid with error", () => {
    const { container } = render(
      <DateField label="Date" errorMessage="Required" description="Pick a date" />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("DatePicker — closed", () => {
    const { container } = render(<DatePicker label="Ship date" />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ─── DateField ─────────────────────────────────────────────────────────────────

describe("DateField", () => {
  it("renders with a label", () => {
    render(<DateField label="Invoice date" />);
    expect(screen.getByText("Invoice date")).toBeDefined();
  });

  it("renders date segments", () => {
    render(<DateField label="Date" />);
    // segments are exposed as spinbuttons for day, month, year
    const segments = screen.getAllByRole("spinbutton");
    expect(segments.length).toBeGreaterThan(0);
  });

  it("renders with description", () => {
    render(<DateField label="Date" description="Pick any date" />);
    expect(screen.getByText("Pick any date")).toBeDefined();
  });

  it("renders error message when isInvalid", () => {
    render(<DateField label="Date" errorMessage="Required" />);
    expect(screen.getByText("Required")).toBeDefined();
  });

  it("renders as disabled", () => {
    render(<DateField label="Date" isDisabled />);
    const groups = screen.getAllByRole("group");
    const disabledGroup = groups.find((g) => g.getAttribute("aria-disabled") === "true");
    expect(disabledGroup).toBeDefined();
  });

  it("resolves LocalizedString label with language fallback", () => {
    render(<DateField label={(locale) => (locale === "ja" ? "日付" : "Date")} />);
    // default locale resolves to english
    expect(screen.getByText("Date")).toBeDefined();
  });

  it("fires onChange once a complete date is typed across the segments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    // Fill every segment by aria-label (order-independent across locales).
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const last = onChange.mock.calls.at(-1)?.[0];
      expect(last?.toString()).toBe("2025-06-15");
    });
  });

  it("auto-advances across segments as a full date is typed (no explicit tabbing)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    // Locale here is "en" → MM/DD/YYYY. Typing carries across segments:
    // "02" fills+advances month, "15" fills+advances day, "2025" fills year.
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02152025");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-02-15");
    });
  });

  it("accumulates a non-leading-zero entry (2 then 9 → 29, not 9)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("12");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-12-29");
    });
  });

  it("accepts day 31 typed before a month (day max isn't tied to the current month)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    // Type the day first — "31" must not collapse to "1" just because the
    // current (anchor) month happens to have 30/28 days.
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("31");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("12");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-12-31");
    });
  });

  it("clamps an impossible day to the month's length on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    // Enter 30 / 02 / 2026 (Feb 2026 has 28 days) — invalid until blur.
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("30");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    // Blur the field.
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2026-02-28");
    });
  });

  it("keeps 29 Feb in a leap year (no over-clamp)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024"); // leap year
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2024-02-29");
    });
  });

  // A controlled field round-trips every emit through the parent's `value`, so
  // these guard the clamp against external-sync interference (the uncontrolled
  // cases above don't exercise that path).
  function ControlledField({ onChange }: { onChange: (v: unknown) => void }) {
    const [v, setV] = useState<CalendarDate | null>(null);
    return (
      <>
        <DateField
          label="Date"
          value={v}
          onChange={(nv) => {
            setV(nv as CalendarDate | null);
            onChange(nv);
          }}
        />
        <button type="button">elsewhere</button>
      </>
    );
  }

  it("clamps an impossible day on blur even when controlled (29/02/2026)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledField onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026"); // not a leap year → Feb has 28 days
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2026-02-28");
    });
  });

  it("re-clamps when editing the year turns a valid leap day invalid (29 Feb 2024 → 2026)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledField onChange={onChange} />);

    // First enter a genuinely valid leap-year date.
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024");
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2024-02-29");
    });

    // Now change the year to a non-leap year — 29 Feb no longer exists.
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2026-02-28");
    });
  });

  it("auto-corrects an impossible day as soon as the year is complete (no blur)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    // 29 typed before the month (allowed), then Feb 2026 (28 days). The moment
    // the 4-digit year lands, the day self-corrects — without leaving the field.
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2026-02-28");
    });
  });

  it("re-corrects on year completion when a leap day turns invalid (no blur)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("29");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2024");
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2024-02-29");
    });

    // Retype the year to a non-leap year — corrects on completion, no blur.
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2026");
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2026-02-28");
    });
  });

  // On-blur backfill: a provided day (finest unit) lets the coarser fields
  // default to the current month/year. The anchor for a bare DateField is
  // today("UTC"), so expectations are derived from that same basis.
  it("backfills the current month + year when only the day is entered, on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("2");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    const expected = today("UTC").set({ day: 2 });
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe(expected.toString());
    });
  });

  it("backfills the current year when day + month are entered, on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("02");
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("08");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    const expected = today("UTC").set({ month: 8, day: 2 });
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe(expected.toString());
    });
  });

  it("never backfills the day — a lone year entry emits nothing on blur", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
        <button type="button">elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("2025");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));

    // The day is the trigger for backfill; without it we never guess a value.
    expect(onChange.mock.calls.some(([v]) => v != null)).toBe(false);
  });

  it("clears a controlled DateField when the value is reset to null", () => {
    const { rerender } = render(
      <DateField
        label="Date"
        value={parseDate("2025-06-15") as CalendarDate}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "day" }).textContent).toBe("15");

    // Parent clears the field: value={null} is controlled-empty, not uncontrolled.
    rerender(<DateField label="Date" value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-valuetext")).toBe(
      "Empty",
    );
  });

  it("sets aria-required on the segments when isRequired", () => {
    render(<DateField label="Date" isRequired />);
    const day = screen.getByRole("spinbutton", { name: "day" });
    expect(day.getAttribute("aria-required")).toBe("true");
  });
});

// ─── Keyboard: whole-date shortcuts (QBO-style) ──────────────────────────────
// These fire from any focused date segment and set the entire date in one go.
// A bare DateField anchors on today("UTC"), so "today"/empty-field expectations
// derive from that same basis. Locale here is "en" (weeks start Sunday).

describe("DateField keyboard shortcuts", () => {
  async function lastEmit(onChange: ReturnType<typeof vi.fn>, expected: string) {
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe(expected);
    });
  }

  it("'t' jumps to today (case-insensitive)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("T"); // upper-case → same as "t"

    await lastEmit(onChange, today("UTC").toString());
  });

  it("'m' goes to the start of the entered month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField label="Date" defaultValue={new CalendarDate(2025, 6, 15)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("m");

    await lastEmit(onChange, "2025-06-01");
  });

  it("'m' falls back to the start of the current month when no date is entered", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("m");

    await lastEmit(onChange, today("UTC").set({ day: 1 }).toString());
  });

  it("'h' goes to the end of the entered month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField label="Date" defaultValue={new CalendarDate(2025, 6, 15)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("h");

    await lastEmit(onChange, "2025-06-30");
  });

  it("'y' and 'r' jump to the start / end of the entered year", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField label="Date" defaultValue={new CalendarDate(2025, 6, 15)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");
    await lastEmit(onChange, "2025-01-01");

    await user.keyboard("r");
    await lastEmit(onChange, "2025-12-31");
  });

  it("'w' and 'k' jump to the start / end of the week (locale-aware)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const start = new CalendarDate(2025, 6, 18); // a Wednesday
    render(<DateField label="Date" defaultValue={start} onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w");
    await lastEmit(onChange, startOfWeek(start, "en").toString());

    await user.keyboard("k");
    await lastEmit(onChange, endOfWeek(start, "en").toString());
  });

  it("'-' decrements a day and rolls back over the month boundary", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField label="Date" defaultValue={new CalendarDate(2025, 3, 1)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("-");

    await lastEmit(onChange, "2025-02-28");
  });

  it("'-' rolls back over the year boundary (1 Jan → 31 Dec of the prior year)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField label="Date" defaultValue={new CalendarDate(2025, 1, 1)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("-");

    await lastEmit(onChange, "2024-12-31");
  });

  it("'=' and '+' both increment a day and roll over the year boundary", async () => {
    const user = userEvent.setup();

    const onChangeEq = vi.fn();
    const { unmount } = render(
      <DateField
        label="Date"
        defaultValue={new CalendarDate(2025, 12, 31)}
        onChange={onChangeEq}
      />,
    );
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("="); // unshifted plus
    await lastEmit(onChangeEq, "2026-01-01");
    unmount();

    const onChangePlus = vi.fn();
    render(
      <DateField
        label="Date"
        defaultValue={new CalendarDate(2025, 12, 31)}
        onChange={onChangePlus}
      />,
    );
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("+"); // shifted plus
    await lastEmit(onChangePlus, "2026-01-01");
  });

  it("'-' / '+' step from today when the field is empty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("+");

    await lastEmit(onChange, today("UTC").add({ days: 1 }).toString());
  });

  it("expands a 2-digit year to the 2000s on blur ('26' → 2026)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <DateField label="Date" onChange={onChange} />
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

    await lastEmit(onChange, "2026-06-15");
  });

  it("expands a 2-digit year as soon as the year segment is left (still inside the field)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("06");
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("15");
    await user.click(screen.getByRole("spinbutton", { name: "year" }));
    await user.keyboard("26");
    // Move focus back to a sibling segment — never leaving the field/group. The
    // year should still expand (mirrors tabbing to the calendar icon).
    await user.click(screen.getByRole("spinbutton", { name: "month" }));

    await lastEmit(onChange, "2026-06-15");
  });

  // Regression: the field path must honour DatePicker's firstDayOfWeek for w/k,
  // not silently fall back to the locale default (which would disagree with the
  // calendar path). en-US defaults to Sunday; firstDayOfWeek="mon" forces Monday.
  it("honours firstDayOfWeek for 'w' in the field path (popover closed)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Date"
        locale="en-US"
        firstDayOfWeek="mon"
        defaultValue={new CalendarDate(2025, 6, 18)} // a Wednesday
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w"); // Monday-start week → 16 Jun (not 15 Jun, the Sunday)

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-16");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // The standalone DateField (no calendar) also exposes firstDayOfWeek so a
  // consumer in a non-default-week-start locale can steer the w/k shortcuts.
  it("honours firstDayOfWeek for 'w' in a standalone DateField", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        label="Date"
        locale="en-US"
        firstDayOfWeek="mon"
        defaultValue={new CalendarDate(2025, 6, 18)} // a Wednesday
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("w"); // Monday-start week → 16 Jun (not 15 Jun, the Sunday)

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-16");
    });
  });

  it("clamps a shortcut target to minValue / maxValue", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateField
        label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        maxValue={new CalendarDate(2025, 6, 20)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y"); // year start (1 Jan) < min → clamps to 10 Jun
    await lastEmit(onChange, "2025-06-10");

    await user.keyboard("r"); // year end (31 Dec) > max → clamps to 20 Jun
    await lastEmit(onChange, "2025-06-20");
  });

  it("'/' commits the current segment and advances to the next ('1/' ⇒ month 01)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField label="Date" onChange={onChange} />);

    // en order: month / day / year. Type a single "1" into the month, then "/"
    // to declare "that's the whole month" and move on to the day.
    await user.click(screen.getByRole("spinbutton", { name: "month" }));
    await user.keyboard("1/15");
    await user.keyboard("2025");

    await lastEmit(onChange, "2025-01-15");
  });
});

// ─── DatePicker ───────────────────────────────────────────────────────────────

describe("DatePicker", () => {
  it("renders with a label", () => {
    render(<DatePicker label="Ship date" />);
    expect(screen.getByText("Ship date")).toBeDefined();
  });

  it("renders the calendar trigger button", () => {
    render(<DatePicker label="Date" />);
    const btn = screen.getAllByRole("button").find((b) => !b.closest('[role="grid"]'));
    expect(btn).toBeDefined();
  });

  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Date" />);

    const triggerBtn = screen.getAllByRole("button")[0];
    await user.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  it("shows a calendar grid in the popover", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Date" />);

    await user.click(screen.getAllByRole("button")[0]);

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeDefined();
    });
  });

  it("fires onChange when a calendar date cell is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker label="Date" onChange={onChange} />);

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    const enabled = getEnabledCalendarCells();
    if (enabled.length > 0) {
      await user.click(enabled[0]);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls[0][0]).not.toBeNull();
      });
    }
  });

  it("renders cells with data-disabled when minValue is set", async () => {
    const user = userEvent.setup();
    const tomorrow = today(getLocalTimeZone()).add({ days: 1 });
    render(<DatePicker label="Date" minValue={tomorrow} />);

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    const disabled = getCalendarCells().filter((c) => c.hasAttribute("data-disabled"));
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("renders cells with data-unavailable when isDateUnavailable returns true", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Date" isDateUnavailable={() => true} />);

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    const unavailable = getCalendarCells().filter((c) => c.hasAttribute("data-unavailable"));
    expect(unavailable.length).toBeGreaterThan(0);
  });

  it("renders error message when errorMessage is set", () => {
    render(<DatePicker label="Date" errorMessage="Date is required" />);
    expect(screen.getByText("Date is required")).toBeDefined();
  });

  it("clears a controlled DatePicker when the value is reset to null", () => {
    const { rerender } = render(
      <DatePicker
        label="Date"
        value={parseDate("2025-06-15") as CalendarDate}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "day" }).textContent).toBe("15");

    rerender(<DatePicker label="Date" value={null} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton", { name: "day" }).getAttribute("aria-valuetext")).toBe(
      "Empty",
    );
  });

  it("localizes segment names and chrome from the AppShell locale (ja)", () => {
    render(<DatePicker label="日付" />, { wrapper: createAppShellWrapper("ja") });
    // Segment accessible name: month → 月.
    expect(screen.getByRole("spinbutton", { name: "月" })).toBeDefined();
    // Popover trigger aria-label is localized too.
    expect(screen.getByRole("button", { name: "カレンダーを開く" })).toBeDefined();
    // Empty segments announce the localized placeholder.
    expect(screen.getByRole("spinbutton", { name: "月" }).getAttribute("aria-valuetext")).toBe(
      "未入力",
    );
  });
});

// ─── Keyboard: popover focus ─────────────────────────────────────────────────

describe("DatePicker keyboard", () => {
  it("moves focus into the calendar grid when the popover opens", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Date" />);
    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => {
      expect(document.activeElement?.closest('[role="grid"]')).not.toBeNull();
    });
  });

  it("opens the calendar with Alt+↓ from a focused segment", async () => {
    const user = userEvent.setup();
    render(<DatePicker label="Date" />);

    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
    });
  });

  // While the popover is open, focus is in the grid — the shortcuts move the
  // highlight (like the arrows), and Enter confirms. This is the calendar path,
  // not the segment path.
  it("a shortcut moves the calendar highlight while the popover is open", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker label="Date" defaultValue={new CalendarDate(2025, 6, 15)} onChange={onChange} />,
    );

    await user.click(screen.getAllByRole("button")[0]); // open (focus → 15 Jun)
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    await user.keyboard("m"); // month start → 1 Jun
    await user.keyboard("{Enter}"); // confirm

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-01");
    });
  });

  it("clamps an open-popover shortcut to minValue (can't highlight before the min)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        onChange={onChange}
      />,
    );

    await user.click(screen.getAllByRole("button")[0]);
    await waitFor(() => expect(screen.getByRole("grid")).toBeDefined());

    await user.keyboard("y"); // year start (1 Jan) is before min → clamps to 10 Jun
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-10");
    });
  });

  it("clamps a field shortcut to minValue while the popover is closed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        label="Date"
        defaultValue={new CalendarDate(2025, 6, 15)}
        minValue={new CalendarDate(2025, 6, 10)}
        onChange={onChange}
      />,
    );

    // Focus a segment (not the trigger) — the popover stays closed, so this is
    // the field path. "y" targets 1 Jan, which is clamped up to the min.
    await user.click(screen.getByRole("spinbutton", { name: "day" }));
    await user.keyboard("y");

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]?.toString()).toBe("2025-06-10");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
