import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDate, parseDate, isSameDay } from "@internationalized/date";
import { RangeCalendar } from "./range-calendar";

// Behaviour + DOM a11y contract for the standalone RangeCalendar grid — the
// react-aria two-click selection model (anchor → live highlight → commit),
// endpoint swap, hover preview, and the range data-* styling contract. The
// field/popover coverage lives in ../date-field/date-range-picker.test.tsx.

afterEach(() => {
  cleanup();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const d = (iso: string) => parseDate(iso) as CalendarDate;

function getCalendarCells() {
  return screen.getAllByRole("button", { hidden: true }).filter((c) => c.closest('[role="grid"]'));
}

/** In-month cell button for a given day number. */
function cell(day: number) {
  return getCalendarCells().find(
    (c) => c.textContent === String(day) && !c.hasAttribute("data-outside-month"),
  )!;
}

function inRangeDays() {
  return getCalendarCells()
    .filter((c) => c.hasAttribute("data-in-range"))
    .map((c) => c.textContent);
}

const tabbable = () => getCalendarCells().find((c) => c.getAttribute("tabindex") === "0")!;

// ─── Snapshot ─────────────────────────────────────────────────────────────────
// Pinned input (fixed `defaultValue`, no live "today") so output is stable.

describe("snapshots", () => {
  it("RangeCalendar — pre-selected range", () => {
    const { container } = render(
      <RangeCalendar
        aria-label="Select range"
        defaultValue={{ start: d("2025-06-10"), end: d("2025-06-15") }}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ─── RangeCalendar ────────────────────────────────────────────────────────────

describe("RangeCalendar", () => {
  it("renders a multiselectable calendar grid", () => {
    render(<RangeCalendar aria-label="Select range" />);
    expect(screen.getByRole("grid").getAttribute("aria-multiselectable")).toBe("true");
  });

  it("marks a committed range: endpoints + the band between", () => {
    render(
      <RangeCalendar
        aria-label="Select range"
        value={{ start: d("2025-06-10"), end: d("2025-06-15") }}
      />,
    );
    expect(cell(10).hasAttribute("data-selection-start")).toBe(true);
    expect(cell(15).hasAttribute("data-selection-end")).toBe(true);
    expect(cell(10).hasAttribute("data-selected")).toBe(true);
    expect(cell(15).hasAttribute("data-selected")).toBe(true);
    // Days in between carry the band, not the selected pill.
    expect(cell(12).hasAttribute("data-in-range")).toBe(true);
    expect(cell(12).hasAttribute("data-selected")).toBe(false);
    expect(inRangeDays()).toEqual(["10", "11", "12", "13", "14", "15"]);
    // Every day of the range is an aria-selected gridcell.
    expect(cell(12).closest("td")?.getAttribute("aria-selected")).toBe("true");
  });

  it("selects a range with two clicks, firing onChange once on completion", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-01")}
        onChange={onChange}
      />,
    );

    await user.click(cell(10));
    // First click only anchors the selection.
    expect(onChange).not.toHaveBeenCalled();

    await user.click(cell(15));
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-15"))).toBe(true);
  });

  it("swaps the endpoints when the second pick is before the anchor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-01")}
        onChange={onChange}
      />,
    );

    await user.click(cell(15));
    await user.click(cell(10));
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-15"))).toBe(true);
  });

  it("commits a single-day range when the same day is picked twice", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-01")}
        onChange={onChange}
      />,
    );

    await user.click(cell(10));
    await user.click(cell(10));
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, range.end)).toBe(true);
    // Both endpoint attributes land on the one cell (fully rounded pill).
    expect(cell(10).hasAttribute("data-selection-start")).toBe(true);
    expect(cell(10).hasAttribute("data-selection-end")).toBe(true);
  });

  it("live-previews the range on hover while anchored", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar aria-label="Select range" defaultFocusedValue={d("2025-06-01")} />);

    // No preview before anchoring.
    await user.hover(cell(13));
    expect(inRangeDays()).toEqual([]);

    await user.click(cell(10));
    await user.hover(cell(13));
    expect(inRangeDays()).toEqual(["10", "11", "12", "13"]);
    expect(cell(13).hasAttribute("data-selection-end")).toBe(true);

    // Hovering before the anchor flips which endpoint is the start.
    await user.hover(cell(8));
    expect(inRangeDays()).toEqual(["8", "9", "10"]);
    expect(cell(8).hasAttribute("data-selection-start")).toBe(true);
    expect(cell(10).hasAttribute("data-selection-end")).toBe(true);
  });

  it("anchors with Enter, extends with plain arrows, and commits with Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-15")}
        onChange={onChange}
      />,
    );

    tabbable().focus();
    await user.keyboard("{Enter}");
    // A keyboard-set anchor advances focus one day to signal range mode.
    expect(tabbable().textContent).toBe("16");
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{ArrowRight}");
    expect(inRangeDays()).toEqual(["15", "16", "17"]);

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-15"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-17"))).toBe(true);
  });

  it("cancels an in-progress selection with Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-15")}
        onChange={onChange}
      />,
    );

    tabbable().focus();
    await user.keyboard("{Enter}");
    expect(inRangeDays()).toEqual(["15", "16"]);

    await user.keyboard("{Escape}");
    expect(inRangeDays()).toEqual([]);

    // The next confirm starts a fresh selection instead of completing the old one.
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("prevents a range from crossing an unavailable date while anchored", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const unavailable = d("2025-06-13");
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-01")}
        isDateUnavailable={(date) => isSameDay(date, unavailable)}
        onChange={onChange}
      />,
    );

    await user.click(cell(10));
    // Days past the unavailable 13th are out of reach for this selection.
    expect(cell(14).hasAttribute("data-disabled")).toBe(true);
    expect(cell(12).hasAttribute("data-disabled")).toBe(false);

    await user.click(cell(14));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(cell(12));
    expect(onChange).toHaveBeenCalledTimes(1);
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-12"))).toBe(true);
  });

  it("commits the hovered day when Enter follows a hover (focus follows the highlight)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-01")}
        onChange={onChange}
      />,
    );

    await user.click(cell(10));
    await user.hover(cell(13));
    // The hover highlight is the focus while selecting — Enter must commit
    // the visible 10–13 range, not the anchor cell that was clicked.
    expect(document.activeElement).toBe(cell(13));
    await user.keyboard("{Enter}");

    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-10"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-13"))).toBe(true);
  });

  it("extends the preview across month paging, preserving the day of month", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar aria-label="Select range" defaultFocusedValue={d("2025-06-10")} />);

    await user.click(cell(10));
    await user.click(screen.getByRole("button", { name: "Next month" }));

    // Focus pages to July 10 (not July 1), so the preview spans Jun 10 – Jul 10.
    expect(tabbable().textContent).toBe("10");
    expect(inRangeDays()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(cell(10).hasAttribute("data-selection-end")).toBe(true);
  });

  it("keeps range marks off the grayed outside-month duplicate cells", () => {
    render(
      <RangeCalendar
        aria-label="Select range"
        value={{ start: d("2025-06-28"), end: d("2025-07-03") }}
        defaultFocusedValue={d("2025-06-28")}
      />,
    );

    // June's trailing grid shows grayed July 1–3 duplicates — they must not
    // carry the band or read as selected.
    const outsideMarked = getCalendarCells().filter(
      (c) =>
        c.hasAttribute("data-outside-month") &&
        (c.hasAttribute("data-in-range") || c.hasAttribute("data-selected")),
    );
    expect(outsideMarked).toEqual([]);
    expect(inRangeDays()).toEqual(["28", "29", "30"]);
  });

  it("does not advance a keyboard anchor onto an adjacent unavailable date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const unavailable = d("2025-06-13");
    render(
      <RangeCalendar
        aria-label="Select range"
        defaultFocusedValue={d("2025-06-12")}
        isDateUnavailable={(date) => isSameDay(date, unavailable)}
        onChange={onChange}
      />,
    );

    tabbable().focus();
    await user.keyboard("{Enter}");
    // The 13th is unavailable, so focus stays put instead of stranding the
    // preview on a day the contiguous-range rule forbids.
    expect(tabbable().textContent).toBe("12");

    await user.keyboard("{Enter}");
    const range = onChange.mock.calls[0][0];
    expect(isSameDay(range.start, d("2025-06-12"))).toBe(true);
    expect(isSameDay(range.end, d("2025-06-12"))).toBe(true);
  });

  it("announces the range-selection prompt from the focused cell", async () => {
    const user = userEvent.setup();
    render(<RangeCalendar aria-label="Select range" defaultFocusedValue={d("2025-06-15")} />);

    const describedBy = () => tabbable().getAttribute("aria-describedby");
    const promptText = () => document.getElementById(describedBy()!)?.textContent;

    expect(promptText()).toBe("Click to start selecting a date range");
    await user.click(cell(15));
    expect(promptText()).toBe("Click to finish selecting the date range");
  });
});
