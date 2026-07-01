import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CalendarDate,
  parseDate,
  today,
  getLocalTimeZone,
  isSameDay,
} from "@internationalized/date";
import { DateField, DatePicker, Calendar } from "./date-field";

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

  it("Calendar — pre-selected", () => {
    const { container } = render(
      <Calendar aria-label="Select date" defaultValue={parseDate("2025-06-15") as CalendarDate} />,
    );
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
});

// ─── Calendar ─────────────────────────────────────────────────────────────────

describe("Calendar", () => {
  it("renders a calendar grid", () => {
    render(<Calendar aria-label="Select date" />);
    expect(screen.getByRole("grid")).toBeDefined();
  });

  it("renders navigation buttons", () => {
    render(<Calendar aria-label="Select date" />);
    const navButtons = screen.getAllByRole("button").filter((b) => !b.closest('[role="grid"]'));
    expect(navButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("fires onChange when a date cell is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Calendar aria-label="Select date" onChange={onChange} />);

    const enabled = getEnabledCalendarCells();
    if (enabled.length > 0) {
      await user.click(enabled[0]);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
      });
    }
  });

  it("renders selected cell with data-selected attribute", () => {
    const defaultValue = parseDate("2025-06-15") as CalendarDate;
    render(<Calendar aria-label="Select date" defaultValue={defaultValue} />);

    const selected = getCalendarCells().find((c) => c.hasAttribute("data-selected"));
    expect(selected).toBeDefined();
  });

  it("renders no disabled cells when minValue is not set", () => {
    render(<Calendar aria-label="Select date" />);
    const currentMonthCells = getCalendarCells().filter(
      (c) => !c.hasAttribute("data-outside-month"),
    );
    expect(currentMonthCells.length).toBeGreaterThan(0);
  });

  it("uses a roving tabindex anchored on the focused date", () => {
    render(
      <Calendar aria-label="Select date" defaultValue={parseDate("2025-06-15") as CalendarDate} />,
    );
    const tabbable = getCalendarCells().filter((c) => c.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].textContent).toBe("15");
  });

  it("carries a focus-ring utility class on day cells", () => {
    render(
      <Calendar aria-label="Select date" defaultValue={parseDate("2025-06-15") as CalendarDate} />,
    );
    const cell = getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;
    // Focus styling is the same `ring` utility used by Button/inputs.
    expect(cell.className).toMatch(/focus:ring/);
  });

  it("keeps focus on the month nav button when changing months", async () => {
    const user = userEvent.setup();
    render(<Calendar aria-label="Select date" />);
    const nextBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label") === "Next month")!;
    // Simulate the grid having been focused first (e.g. via keyboard nav).
    const cell = getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;
    cell.focus();
    await user.click(nextBtn);
    // Focus must remain on the nav button, not jump back into the grid.
    expect(document.activeElement).toBe(nextBtn);
    expect(document.activeElement?.closest('[role="grid"]')).toBeNull();
  });

  it("moves the roving focus with arrow keys (→ next day, ↓ next week)", async () => {
    const user = userEvent.setup();
    render(
      <Calendar aria-label="Select date" defaultValue={parseDate("2025-06-15") as CalendarDate} />,
    );
    const start = getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;
    start.focus();
    await user.keyboard("{ArrowRight}");
    expect(getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")?.textContent).toBe(
      "16",
    );
    await user.keyboard("{ArrowDown}");
    expect(getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")?.textContent).toBe(
      "23",
    );
  });

  it("lets arrow keys traverse through unavailable dates without getting stuck", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Mark the 16th unavailable — the day we'll land on mid-navigation.
    const unavailable = parseDate("2025-06-16") as CalendarDate;
    render(
      <Calendar
        aria-label="Select date"
        defaultValue={parseDate("2025-06-15") as CalendarDate}
        isDateUnavailable={(d) => isSameDay(d, unavailable)}
        onChange={onChange}
      />,
    );
    const tabbable = () => getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;

    tabbable().focus();
    await user.keyboard("{ArrowRight}"); // → 16 (unavailable, but focusable)
    const onSixteenth = tabbable();
    expect(onSixteenth.textContent).toBe("16");
    expect(onSixteenth.hasAttribute("data-unavailable")).toBe(true);

    // Selection is blocked on the unavailable day...
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();

    // ...but navigation continues right off it (this is the bug being fixed).
    await user.keyboard("{ArrowRight}");
    expect(tabbable().textContent).toBe("17");
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
});
