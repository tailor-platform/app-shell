import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { cva } from "class-variance-authority";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";
import type { Segment } from "./use-date-field-state";
import type { CalendarDay, useCalendarState } from "./use-calendar-state";

/**
 * Internal presentation layer for the date components — built on Base UI
 * primitives (`Popover`) + plain accessible markup, driven by our own
 * `useDateFieldState` / `useCalendarState` engines. Not exported from the
 * package; the public API lives in `date-picker-standalone.tsx`.
 *
 * Styling mirrors the rest of the library (`astw:` tokens, dark mode, the same
 * popover token set as our other Base UI popovers).
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

// ─── Field labels / description / error ───────────────────────────────────────

// A composite spinbutton group can't be labelled by a native <label htmlFor>,
// so the label is a <span> referenced via the group's `aria-labelledby` (the
// APG date-field pattern).
export function DatePickerLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="date-picker-label"
      className={cn("astw:text-sm astw:font-medium astw:text-foreground", className)}
      {...props}
    />
  );
}

export function DatePickerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="date-picker-description"
      className={cn("astw:text-sm astw:text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DatePickerError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="date-picker-error"
      role="alert"
      className={cn("astw:text-sm astw:font-medium astw:text-destructive", className)}
      {...props}
    />
  );
}

// ─── Segmented input group ────────────────────────────────────────────────────

const groupClasses = cn(
  inputBaseClasses,
  "astw:flex astw:h-9 astw:items-center astw:gap-0 astw:py-0",
  "astw:focus-within:border-ring astw:focus-within:ring-[3px] astw:focus-within:ring-ring/50",
  "astw:data-[invalid]:border-destructive astw:data-[invalid]:ring-destructive/20",
  "astw:data-[disabled]:cursor-not-allowed astw:data-[disabled]:opacity-50",
);

interface DateInputGroupProps {
  segments: Segment[];
  cycle: (type: Exclude<Segment["type"], "literal">, delta: number) => void;
  setDigit: (
    type: Exclude<Segment["type"], "literal">,
    digit: number,
    replace?: boolean,
    digitCount?: number,
  ) => { advance: boolean };
  setDayPeriod: (pm: boolean) => void;
  clearSegment: (type: Exclude<Segment["type"], "literal">) => void;
  /** Correct an impossible day (e.g. 30 Feb) — called when focus leaves the group. */
  clampDate: () => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  labelId?: string;
  /** Accessible name when there is no visible label (e.g. a compact filter input). */
  ariaLabel?: string;
  describedById?: string;
  className?: string;
  trigger?: React.ReactNode;
  /** Ref to the group element — used to anchor the popover to the whole field. */
  groupRef?: React.Ref<HTMLDivElement>;
}

export function DateInputGroup({
  segments,
  cycle,
  setDigit,
  setDayPeriod,
  clearSegment,
  clampDate,
  isDisabled,
  isReadOnly,
  isInvalid,
  autoFocus,
  labelId,
  ariaLabel,
  describedById,
  className,
  trigger,
  groupRef,
}: DateInputGroupProps) {
  const editableRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  // Digits typed into the currently-focused segment this session. Reset on
  // focus; the first digit (count 0) replaces, and the count decides when the
  // segment is "full" and should auto-advance.
  const typedCountRef = React.useRef(0);

  React.useEffect(() => {
    if (autoFocus && !isDisabled) editableRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Index editable segments for left/right focus movement.
  const editableIndexById = React.useMemo(() => {
    const map = new Map<number, number>();
    let i = 0;
    segments.forEach((s, idx) => {
      if (s.isEditable) map.set(idx, i++);
    });
    return map;
  }, [segments]);

  const focusEditable = (editableIndex: number) => {
    const el = editableRefs.current[editableIndex];
    el?.focus();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    segment: Segment,
    editableIndex: number,
  ) => {
    if (segment.type === "literal") return;
    const type = segment.type;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        cycle(type, 1);
        return;
      case "ArrowDown":
        e.preventDefault();
        cycle(type, -1);
        return;
      case "ArrowLeft":
        e.preventDefault();
        focusEditable(editableIndex - 1);
        return;
      case "ArrowRight":
        e.preventDefault();
        focusEditable(editableIndex + 1);
        return;
      case "Home":
        e.preventDefault();
        focusEditable(0);
        return;
      case "End":
        e.preventDefault();
        focusEditable(editableRefs.current.length - 1);
        return;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        clearSegment(type);
        return;
    }

    if (type === "dayPeriod") {
      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        setDayPeriod(false);
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setDayPeriod(true);
      }
      return;
    }

    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const count = typedCountRef.current;
      typedCountRef.current = count + 1;
      const { advance } = setDigit(type, Number(e.key), count === 0, count + 1);
      if (advance) focusEditable(editableIndex + 1);
    }
  };

  return (
    // Deliberate APG date-field pattern: a labelled group wrapping spinbutton segments.
    <div
      ref={groupRef}
      role="group"
      data-slot="date-picker-group"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : ariaLabel}
      aria-describedby={describedById}
      aria-disabled={isDisabled || undefined}
      data-disabled={isDisabled || undefined}
      data-invalid={isInvalid || undefined}
      className={cn(groupClasses, className)}
      onBlur={(e) => {
        // Focus left the whole group (not just moved between segments) → correct
        // an impossible day for the entered month/year.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) clampDate();
      }}
    >
      <div data-slot="date-input" className="astw:flex astw:flex-1 astw:items-center astw:gap-px">
        {segments.map((segment, idx) => {
          if (segment.type === "literal") {
            return (
              <span
                key={idx}
                aria-hidden="true"
                data-slot="date-segment"
                data-type="literal"
                className="astw:select-none astw:px-px astw:text-muted-foreground/60"
              >
                {segment.text}
              </span>
            );
          }
          const editableIndex = editableIndexById.get(idx)!;
          return (
            // Editable date segment: the APG spinbutton pattern. A <div role="spinbutton">
            // (not an <input>) so we render locale-formatted text with no caret.
            <div
              key={idx}
              ref={(el) => {
                editableRefs.current[editableIndex] = el;
              }}
              role="spinbutton"
              data-slot="date-segment"
              data-type={segment.type}
              data-placeholder={segment.isPlaceholder || undefined}
              contentEditable={false}
              suppressContentEditableWarning
              tabIndex={isDisabled ? -1 : 0}
              aria-label={segment.label}
              aria-disabled={isDisabled || undefined}
              aria-readonly={isReadOnly || undefined}
              aria-invalid={isInvalid || undefined}
              aria-valuemin={segment.minValue}
              aria-valuemax={segment.maxValue}
              aria-valuenow={segment.value}
              aria-valuetext={segment.isPlaceholder ? "Empty" : segment.text}
              onFocus={() => {
                typedCountRef.current = 0;
              }}
              onKeyDown={(e) => handleKeyDown(e, segment, editableIndex)}
              className={cn(
                "astw:rounded astw:px-0.5 astw:tabular-nums astw:caret-transparent astw:outline-none",
                "astw:focus:bg-primary astw:focus:text-primary-foreground",
                "astw:data-[placeholder]:text-muted-foreground",
              )}
            >
              {segment.text}
            </div>
          );
        })}
      </div>
      {trigger}
    </div>
  );
}

const triggerClasses = cn(
  "astw:ml-1 astw:flex astw:size-7 astw:items-center astw:justify-center astw:rounded-sm astw:outline-none",
  "astw:text-muted-foreground",
  "astw:hover:text-foreground",
  "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
  "astw:disabled:pointer-events-none astw:disabled:opacity-50",
);

/**
 * The calendar-icon button that opens the popover. Renders a Base UI
 * `Popover.Trigger` (a real <button>), so it must live inside a `Popover.Root`.
 */
export function DatePickerPopoverTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Popover.Trigger>) {
  return (
    <Popover.Trigger
      data-slot="date-picker-button"
      aria-label="Open calendar"
      className={cn(triggerClasses, className)}
      {...props}
    >
      <CalendarIcon className="astw:size-4" />
    </Popover.Trigger>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

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
          aria-label="Previous month"
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
          aria-label="Next month"
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

// ─── Popover ──────────────────────────────────────────────────────────────────
// Same token set + animation classes as our other Base UI popovers
// (see badge-list.tsx): data-open / data-ending-style animation attributes.

interface DatePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The field group — must contain a `DatePickerPopoverTrigger`. */
  field: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
  /**
   * Element to position the calendar against. Defaults to the trigger; pass the
   * field group so the calendar aligns to the field's edge (not the icon),
   * overlapping it horizontally and shifting inward near the viewport edge.
   */
  anchor?: React.RefObject<HTMLElement | null>;
}

export function DatePopover({
  open,
  onOpenChange,
  field,
  children,
  ariaLabel,
  anchor,
}: DatePopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {field}
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} sideOffset={4} side="bottom" align="start">
          {/* APG date-picker dialog pattern — the popup is a labelled dialog. */}
          <Popover.Popup
            role="dialog"
            aria-label={ariaLabel ?? "Choose date"}
            data-slot="date-picker-popover"
            className={cn(
              "astw:z-(--z-popup) astw:origin-(--transform-origin) astw:rounded-md astw:border astw:border-border astw:bg-popover astw:p-3 astw:text-popover-foreground astw:shadow-md",
              "astw:animate-in astw:fade-in-0 astw:zoom-in-95",
              "astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            )}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { calendarCellVariants };
