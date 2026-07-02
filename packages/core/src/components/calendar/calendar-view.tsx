import * as React from "react";
import { cva } from "class-variance-authority";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarT } from "./i18n";
import type { CalendarDay, useCalendarState } from "./use-calendar-state";

/**
 * Calendar-grid presentation — the APG date-grid markup, driven by our own
 * `useCalendarState` engine. Shared by the standalone `Calendar` and the
 * `DatePicker` popover. Not exported from the package.
 *
 * Styling mirrors the rest of the library (`astw:` tokens, dark mode).
 */

// ─── Calendar cell styling ───────────────────────────────────────────────────
// Driven by boolean data-* attributes we set on each cell button (Tailwind v4
// arbitrary variants match attribute presence) — the same contract the
// react-aria implementation uses, so the visual identity is identical.
const calendarCellVariants = cva(
  "astw:flex astw:size-9 astw:cursor-pointer astw:items-center astw:justify-center astw:rounded-md astw:text-sm",
  {
    variants: {
      state: {
        base: [
          // Interaction states use native pseudo-classes (the cell is a real
          // <button>); the boolean data-* attributes below are the ones we set.
          "astw:hover:bg-accent astw:hover:text-accent-foreground",
          // Roving focus moves programmatically during keyboard nav, so key the
          // ring off :focus (not :focus-visible) so it shows on popover open too.
          // relative+z-10 lifts the ring above adjacent cells (no gap between).
          "astw:outline-none astw:focus:relative astw:focus:z-10 astw:focus:ring-ring/50 astw:focus:ring-[3px]",
          "astw:active:scale-95",
          "astw:data-[selected]:bg-primary astw:data-[selected]:text-primary-foreground",
          "astw:data-[selected]:hover:bg-primary/90",
          "astw:data-[outside-month]:pointer-events-none astw:data-[outside-month]:opacity-40",
          "astw:data-[unavailable]:pointer-events-none astw:data-[unavailable]:text-muted-foreground astw:data-[unavailable]:line-through",
          "astw:data-[disabled]:pointer-events-none astw:data-[disabled]:opacity-50",
          // Range states — wired now so a future DateRangePicker is purely additive
          "astw:data-[selection-start]:rounded-l-md astw:data-[selection-end]:rounded-r-md",
          "astw:data-[today]:font-semibold astw:data-[today]:underline astw:data-[today]:underline-offset-2",
        ],
      },
    },
    defaultVariants: { state: "base" },
  },
);

// Keyboard focus ring — the same `ring` treatment used by Button / inputs.
const navButtonClasses = cn(
  "astw:flex astw:size-7 astw:items-center astw:justify-center astw:rounded-sm astw:outline-none",
  "astw:text-muted-foreground",
  "astw:hover:bg-accent astw:hover:text-accent-foreground",
  "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  "astw:disabled:pointer-events-none astw:disabled:opacity-50",
);

type CalendarState = ReturnType<typeof useCalendarState>;

interface CalendarViewProps {
  state: CalendarState;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
  /**
   * Used when the calendar is opened in a popover: moves focus into the grid on
   * mount and contains Tab/Shift+Tab within the prev → next → grid loop (the
   * APG date-picker dialog pattern). Off for the inline standalone calendar,
   * which must let Tab pass through to the rest of the page.
   */
  inPopover?: boolean;
}

export function CalendarView({
  state,
  ariaLabel,
  ariaLabelledBy,
  className,
  inPopover,
}: CalendarViewProps) {
  const t = useCalendarT();
  const headingId = React.useId();
  const cellRefs = React.useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const prevBtnRef = React.useRef<HTMLButtonElement>(null);
  const nextBtnRef = React.useRef<HTMLButtonElement>(null);

  // Move DOM focus to the focused date only when keyboard grid navigation asked
  // for it (one-shot `moveFocusRef`). This deliberately does NOT fire for the
  // prev/next month buttons, so clicking those keeps focus on the button.
  React.useEffect(() => {
    if (!state.moveFocusRef.current) return;
    state.moveFocusRef.current = false;
    // preventScroll: focus is moved programmatically (popover open / roving
    // nav); letting the browser scroll the cell into view would jump the page
    // even when the field is already visible.
    cellRefs.current.get(state.focusedDate.toString())?.focus({ preventScroll: true });
  }, [state.focusedDate, state.moveFocusRef]);

  // When opened in a popover, move focus into the grid so arrow keys work
  // immediately (the APG pattern; Base UI's non-modal popover won't do this).
  React.useEffect(() => {
    if (!inPopover) return;
    state.isFocusedRef.current = true;
    // preventScroll — see the roving-focus effect above.
    cellRefs.current.get(state.focusedDate.toString())?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contain Tab within the prev → next → grid loop while in the popover.
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (!inPopover || e.key !== "Tab") return;
    const gridCell = cellRefs.current.get(state.focusedDate.toString()) ?? null;
    const stops = [
      state.prevDisabled ? null : prevBtnRef.current,
      state.nextDisabled ? null : nextBtnRef.current,
      gridCell,
    ].filter((el): el is HTMLButtonElement => el != null);
    if (stops.length === 0) return;
    const idx = stops.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    e.preventDefault();
    const dir = e.shiftKey ? -1 : 1;
    const next = stops[(idx + dir + stops.length) % stops.length];
    // Entering the grid stop should re-arm the roving-focus effect.
    if (next === gridCell) state.isFocusedRef.current = true;
    next.focus({ preventScroll: true });
  };

  return (
    <div
      data-slot="calendar"
      className={cn("astw:w-fit", className)}
      onKeyDown={handleContainerKeyDown}
    >
      <header className="astw:mb-2 astw:flex astw:items-center astw:justify-between">
        <button
          ref={prevBtnRef}
          type="button"
          data-slot="calendar-nav"
          aria-label={t("previousMonth")}
          disabled={state.prevDisabled}
          onClick={state.previousMonth}
          className={navButtonClasses}
        >
          <ChevronLeftIcon className="astw:size-4" />
        </button>
        <span
          id={headingId}
          aria-live="polite"
          className="astw:text-sm astw:font-medium astw:text-foreground"
        >
          {state.title}
        </span>
        <button
          ref={nextBtnRef}
          type="button"
          data-slot="calendar-nav"
          aria-label={t("nextMonth")}
          disabled={state.nextDisabled}
          onClick={state.nextMonth}
          className={navButtonClasses}
        >
          <ChevronRightIcon className="astw:size-4" />
        </button>
      </header>
      {/* APG calendar-grid pattern: role="grid" upgrades the table's cell/row
          semantics so arrow-key navigation is announced correctly. */}
      <table
        role="grid"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : headingId)}
        className="astw:border-collapse"
      >
        <thead>
          <tr>
            {state.weekDays.map((day, i) => (
              <th
                key={i}
                scope="col"
                aria-label={day.long}
                className="astw:w-9 astw:pb-1 astw:text-center astw:text-xs astw:font-normal astw:text-muted-foreground"
              >
                <span aria-hidden="true">{day.short}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day) => (
                <CalendarCell
                  key={day.date.toString()}
                  day={day}
                  label={state.cellLabel(day.date)}
                  onSelect={() => state.selectDate(day.date)}
                  onKeyDown={(e) => state.onCellKeyDown(e, day.date)}
                  registerRef={(el) => cellRefs.current.set(day.date.toString(), el)}
                  onFocus={() => {
                    state.isFocusedRef.current = true;
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CalendarCellProps {
  day: CalendarDay;
  label: string;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  registerRef: (el: HTMLButtonElement | null) => void;
  onFocus: () => void;
}

function CalendarCell({
  day,
  label,
  onSelect,
  onKeyDown,
  registerRef,
  onFocus,
}: CalendarCellProps) {
  // Selectable: a real, in-range, available day. Gates click + Enter/Space.
  const interactive = !day.isOutsideMonth && !day.isDisabled && !day.isUnavailable;
  // Reachable by roving keyboard focus: any in-month day, including disabled and
  // unavailable ones. Per APG, arrow keys traverse *through* disabled dates — they
  // just can't be selected — so the keydown handler must be attached to them too,
  // otherwise focus lands on a disabled day with no way to navigate away.
  const focusable = !day.isOutsideMonth;
  // `<td>` inside `role="grid"` is implicitly a gridcell — no explicit role needed.
  return (
    <td aria-selected={day.isSelected || undefined} className="astw:p-0">
      <button
        type="button"
        ref={registerRef}
        aria-label={label}
        aria-disabled={day.isDisabled || day.isUnavailable || undefined}
        tabIndex={day.isFocused && !day.isOutsideMonth ? 0 : -1}
        data-selected={day.isSelected || undefined}
        data-disabled={day.isDisabled || undefined}
        data-unavailable={day.isUnavailable || undefined}
        data-outside-month={day.isOutsideMonth || undefined}
        data-today={day.isToday || undefined}
        onClick={interactive ? onSelect : undefined}
        onKeyDown={focusable ? onKeyDown : undefined}
        onFocus={onFocus}
        className={calendarCellVariants()}
      >
        {day.date.day}
      </button>
    </td>
  );
}

export { calendarCellVariants };
