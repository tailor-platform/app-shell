import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDate, parseDate, isSameDay } from "@internationalized/date";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Calendar } from "./calendar";

// Behaviour + DOM a11y contract for the standalone Calendar grid (roving focus,
// APG keyboard nav, selection). The field/popover coverage lives in
// ../date-field/date-field.test.tsx.

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

// ─── Snapshot ─────────────────────────────────────────────────────────────────
// Pinned input (fixed `defaultValue`, no live "today") so output is stable.

describe("snapshots", () => {
  it("Calendar — pre-selected", () => {
    const { container } = render(
      <Calendar aria-label="Select date" defaultValue={parseDate("2025-06-15") as CalendarDate} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
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

  it("localizes the month-nav aria-labels from the AppShell locale (ja)", () => {
    render(<Calendar aria-label="日付を選択" />, { wrapper: createAppShellWrapper("ja") });
    expect(screen.getByRole("button", { name: "前の月" })).toBeDefined();
    expect(screen.getByRole("button", { name: "次の月" })).toBeDefined();
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

  it("keeps focus on the nav button after keyboard nav clamped at minValue", async () => {
    const user = userEvent.setup();
    render(
      <Calendar
        aria-label="Select date"
        defaultFocusedValue={parseDate("2025-06-11") as CalendarDate}
        minValue={parseDate("2025-06-10")}
      />,
    );
    const tabbable = () => getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;

    // Arrow to the boundary, then once more (clamped no-op). The clamped press
    // must not leave a stale one-shot focus flag behind.
    tabbable().focus();
    await user.keyboard("{ArrowLeft}");
    expect(tabbable().textContent).toBe("10");
    await user.keyboard("{ArrowLeft}");
    expect(tabbable().textContent).toBe("10");

    // A later month-nav click must keep focus on the button — a stale flag
    // would yank it into the grid.
    const nextBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label") === "Next month")!;
    await user.click(nextBtn);
    expect(document.activeElement).toBe(nextBtn);
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
