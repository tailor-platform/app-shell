import {
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/lib/input-classes";
import { useDateFieldT } from "./i18n";
import { DATE_SHORTCUT_KEYS, type DateShortcut } from "@/lib/date-shortcuts";
import type { Segment } from "./use-date-field-state";

/**
 * Field presentation for the date components — the segmented spinbutton group
 * and the popover wrapper used by `DatePicker`. Built on Base UI primitives
 * (`Popover`) + plain accessible markup, driven by
 * our own `useDateFieldState` engine. Not exported from the package.
 *
 * Styling mirrors the rest of the library (`astw:` tokens, dark mode, the same
 * popover token set as our other Base UI popovers).
 */

// ─── Segmented input group ────────────────────────────────────────────────────

const groupClasses = cn(
  inputBaseClasses,
  // Floor the width to comfortably fit "dd / mm / yyyy" + the trigger icon plus
  // padding (142px) so the field doesn't collapse in a narrow/flex container.
  // Overrides inputBaseClasses' `min-w-0`; wider locales (e.g. ja-JP) still grow.
  "astw:flex astw:h-9 astw:min-w-[142px] astw:items-center astw:gap-0 astw:py-0",
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
  /** Apply a whole-date keyboard shortcut (today, month/year/week jumps, ±day). */
  applyShortcut: (cmd: DateShortcut) => void;
  /**
   * Normalize the value when focus leaves the group: backfill the current
   * month/year when only finer fields are set, and clamp an impossible day.
   */
  commitOnBlur: () => void;
  /** Expand a 1–2 digit year to the 2000s when the year segment loses focus. */
  expandShortYear: () => void;
  /** Open the calendar popover (Alt+↓). Omitted for the popover-less `DateField`. */
  onOpenCalendar?: () => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  autoFocus?: boolean;
  /** ID of the element(s) that label the group. */
  ariaLabelledby?: string;
  /** Accessible name when there is no visible label (e.g. a compact filter input). */
  ariaLabel?: string;
  describedById?: string;
  className?: string;
  trigger?: ReactNode;
  /** Ref to the group element — used to anchor the popover to the whole field. */
  groupRef?: Ref<HTMLDivElement>;
  /** Called once when focus enters the group from outside. */
  onGroupFocus?: () => void;
  /** Called once when focus leaves the group entirely. */
  onGroupBlur?: (nextFocused: EventTarget | null) => void;
}

export function DateInputGroup({
  segments,
  cycle,
  setDigit,
  setDayPeriod,
  clearSegment,
  applyShortcut,
  commitOnBlur,
  expandShortYear,
  onOpenCalendar,
  isDisabled,
  isReadOnly,
  isInvalid,
  isRequired,
  autoFocus,
  ariaLabelledby,
  ariaLabel,
  describedById,
  className,
  trigger,
  groupRef,
  onGroupFocus,
  onGroupBlur,
}: DateInputGroupProps) {
  const t = useDateFieldT();
  const editableRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Digits typed into the currently-focused segment this session. Reset on
  // focus; the first digit (count 0) replaces, and the count decides when the
  // segment is "full" and should auto-advance.
  const typedCountRef = useRef(0);

  useEffect(() => {
    if (autoFocus && !isDisabled) editableRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Index editable segments for left/right focus movement.
  const editableIndexById = useMemo(() => {
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
    e: KeyboardEvent<HTMLDivElement>,
    segment: Segment,
    editableIndex: number,
  ) => {
    if (segment.type === "literal") return;
    const type = segment.type;

    // Alt+↓ opens the calendar popover (APG date-picker pattern + QBO). No-op on
    // the popover-less DateField. Checked before the plain ArrowDown case below.
    if (e.altKey && e.key === "ArrowDown") {
      if (onOpenCalendar) {
        e.preventDefault();
        onOpenCalendar();
      }
      return;
    }

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

    // Whole-date shortcuts (QBO-style). Only from a date segment — time segments
    // keep their own semantics (e.g. "a"/"p" for AM/PM). Bare keypress only; a
    // modifier (Ctrl/Cmd) is left for the browser/OS.
    const isDateSegment = type === "year" || type === "month" || type === "day";
    if (isDateSegment && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // "/" commits the current partial as-is and advances — a way to say
      // "I meant '1' as the whole day, not the start of '1x'".
      if (e.key === "/") {
        e.preventDefault();
        focusEditable(editableIndex + 1);
        return;
      }
      const cmd = DATE_SHORTCUT_KEYS[e.key.toLowerCase()];
      if (cmd) {
        e.preventDefault();
        applyShortcut(cmd);
        return;
      }
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
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-describedby={describedById}
      aria-disabled={isDisabled || undefined}
      data-disabled={isDisabled || undefined}
      data-invalid={isInvalid || undefined}
      className={cn(groupClasses, className)}
      onFocus={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onGroupFocus?.();
      }}
      onBlur={(e) => {
        // Leaving the year segment (to a sibling, the calendar icon, or out of
        // the field) expands a 1–2 digit year to the 2000s right away — the icon
        // is inside the group, so waiting for whole-group blur would leave "26"
        // showing after a Tab. `focusout` bubbles, so `e.target` is the segment.
        if ((e.target as HTMLElement).dataset?.type === "year") expandShortYear();
        // Focus left the whole group (not just moved between segments) →
        // backfill the current month/year for a partial entry and clamp an
        // impossible day.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          commitOnBlur();
          onGroupBlur?.(e.relatedTarget);
        }
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
              aria-label={t(segment.type)}
              aria-disabled={isDisabled || undefined}
              aria-readonly={isReadOnly || undefined}
              aria-invalid={isInvalid || undefined}
              // aria-required lives on the spinbutton segments, not the role="group"
              // wrapper — ARIA only supports it on widget roles (spinbutton), not group.
              aria-required={isRequired || undefined}
              aria-valuemin={segment.minValue}
              aria-valuemax={segment.maxValue}
              aria-valuenow={segment.value}
              aria-valuetext={segment.isPlaceholder ? t("empty") : segment.text}
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
}: ComponentProps<typeof Popover.Trigger>) {
  const t = useDateFieldT();
  return (
    <Popover.Trigger
      data-slot="date-picker-button"
      aria-label={t("openCalendar")}
      className={cn(triggerClasses, className)}
      {...props}
    >
      <CalendarIcon className="astw:size-4" />
    </Popover.Trigger>
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────
// Same token set + animation classes as our other Base UI popovers
// (see badge-list.tsx): data-open / data-ending-style animation attributes.

interface DatePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The field group — must contain a `DatePickerPopoverTrigger`. */
  field: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledby?: string;
  popupRef?: Ref<HTMLDivElement>;
  onPopupBlur?: (nextFocused: EventTarget | null) => void;
  /**
   * Element to position the calendar against. Defaults to the trigger; pass the
   * field group so the calendar aligns to the field's edge (not the icon),
   * overlapping it horizontally and shifting inward near the viewport edge.
   */
  anchor?: RefObject<HTMLElement | null>;
}

export function DatePopover({
  open,
  onOpenChange,
  field,
  children,
  ariaLabel,
  ariaLabelledby,
  popupRef,
  onPopupBlur,
  anchor,
}: DatePopoverProps) {
  const t = useDateFieldT();
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {field}
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} sideOffset={4} side="bottom" align="start">
          {/* APG date-picker dialog pattern — the popup is a labelled dialog. */}
          <Popover.Popup
            ref={popupRef}
            role="dialog"
            aria-labelledby={ariaLabelledby}
            aria-label={ariaLabelledby ? undefined : (ariaLabel ?? t("chooseDate"))}
            data-slot="date-picker-popover"
            className={cn(
              "astw:z-(--z-popup) astw:origin-(--transform-origin) astw:rounded-md astw:border astw:border-border astw:bg-popover astw:p-3 astw:text-popover-foreground astw:shadow-md",
              "astw:animate-in astw:fade-in-0 astw:zoom-in-95",
              "astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            )}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                onPopupBlur?.(e.relatedTarget);
              }
            }}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
