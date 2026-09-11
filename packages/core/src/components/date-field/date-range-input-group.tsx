import * as React from "react";
import { cn } from "@/lib/utils";
import { useDateFieldT } from "./i18n";
import type { useDateFieldState, EditableSegmentType } from "./use-date-field-state";
import { DateFieldRow, groupClasses, type DateFieldRowHandle } from "./date-input-group";

/**
 * Field presentation for `DateRangePicker` — one labelled group holding the
 * start and end segment runs separated by an en dash, with a single popover
 * trigger (the react-aria DateRangePicker anatomy). ARIA labeling + focus/blur
 * mirroring match the single `DateInputGroup` (the `Field.Root` bridge model);
 * per-row value normalization (year expansion + backfill/clamp) runs at row
 * granularity. Not exported from the package.
 */

type DateFieldState = ReturnType<typeof useDateFieldState>;

interface DateRangeInputGroupProps {
  start: DateFieldState;
  end: DateFieldState;
  /** Open the calendar popover (Alt+↓ from either field). */
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
  trigger?: React.ReactNode;
  /** Ref to the group element — used to anchor the popover to the whole field. */
  groupRef?: React.Ref<HTMLDivElement>;
  /** Called once when focus enters the group from outside. */
  onGroupFocus?: () => void;
  /** Called once when focus leaves the group entirely. */
  onGroupBlur?: (nextFocused: EventTarget | null) => void;
}

export function DateRangeInputGroup({
  start,
  end,
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
}: DateRangeInputGroupProps) {
  const t = useDateFieldT();
  const startRowRef = React.useRef<HTMLDivElement | null>(null);
  const endRowRef = React.useRef<HTMLDivElement | null>(null);
  const startHandle = React.useRef<DateFieldRowHandle | null>(null);
  const endHandle = React.useRef<DateFieldRowHandle | null>(null);

  const rowShared = {
    onOpenCalendar,
    isDisabled,
    isReadOnly,
    isInvalid,
    isRequired,
  };

  const segmentLabel = (field: string) => (type: EditableSegmentType) =>
    t("rangeSegmentLabel", { field, segment: t(type) });

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const inStart = !!startRowRef.current?.contains(target);
    const inEnd = !!endRowRef.current?.contains(target);
    // Per-row normalization: only when a *segment* blurs (not the trigger). A
    // year segment expands on any blur; the row's field normalizes (backfill +
    // day clamp) when focus leaves that row — moving between fields counts.
    if (inStart || inEnd) {
      const rowEl = inStart ? startRowRef.current : endRowRef.current;
      const rowState = inStart ? start : end;
      if (target.dataset?.type === "year") rowState.expandShortYear();
      if (rowEl && !rowEl.contains(e.relatedTarget as Node | null)) rowState.commitOnBlur();
    }
    // Whole-group blur → the Field bridge (touched / validation).
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onGroupBlur?.(e.relatedTarget);
  };

  return (
    // One labelled group for the whole range — the two segment runs inside are
    // plain rows, mirroring react-aria's flattened DateRangePicker group.
    <div
      ref={groupRef}
      role="group"
      data-slot="date-range-picker-group"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-describedby={describedById}
      aria-disabled={isDisabled || undefined}
      data-disabled={isDisabled || undefined}
      data-invalid={isInvalid || undefined}
      className={cn(groupClasses, "astw:min-w-[272px]", className)}
      onFocus={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onGroupFocus?.();
      }}
      onBlur={handleBlur}
    >
      <DateFieldRow
        {...rowShared}
        segments={start.segments}
        cycle={start.cycle}
        setDigit={start.setDigit}
        setDayPeriod={start.setDayPeriod}
        clearSegment={start.clearSegment}
        applyShortcut={start.applyShortcut}
        autoFocus={autoFocus}
        segmentLabel={segmentLabel(t("startDate"))}
        onNavigateOut={(edge) => {
          if (edge === "next") endHandle.current?.focusFirst();
        }}
        rowRef={startRowRef}
        handleRef={(h) => {
          startHandle.current = h;
        }}
      />
      <span
        aria-hidden="true"
        data-slot="date-range-separator"
        className="astw:select-none astw:px-1 astw:text-muted-foreground"
      >
        –
      </span>
      <DateFieldRow
        {...rowShared}
        segments={end.segments}
        cycle={end.cycle}
        setDigit={end.setDigit}
        setDayPeriod={end.setDayPeriod}
        clearSegment={end.clearSegment}
        applyShortcut={end.applyShortcut}
        segmentLabel={segmentLabel(t("endDate"))}
        onNavigateOut={(edge) => {
          if (edge === "prev") startHandle.current?.focusLast();
        }}
        rowRef={endRowRef}
        handleRef={(h) => {
          endHandle.current = h;
        }}
        className="astw:flex-1"
      />
      {trigger}
    </div>
  );
}
