import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import { toCalendarDate, type DateValue } from "@internationalized/date";
import { cn } from "@/lib/utils";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import {
  useDateFieldState,
  type DateFieldInvalidReason,
  type DateFieldStateChangeSource,
  type Granularity,
  type HourCycle,
} from "./use-date-field-state";
import { useRangeCalendarState, type DateRange } from "../calendar/use-range-calendar-state";
import type { FirstDayOfWeek } from "../calendar/use-calendar-base-state";
import { CalendarView } from "../calendar/calendar-view";
import { DatePopover, DatePickerPopoverTrigger } from "./date-input-group";
import { DateRangeInputGroup } from "./date-range-input-group";
import { useDateFieldT } from "./i18n";
import {
  invalidMessageKey,
  isTargetWithin,
  useDateFieldFieldBridge,
} from "./use-date-field-bridge";

/**
 * Public date-range control — the @internationalized/date + Base UI
 * implementation, mirroring react-aria's `DateRangePicker` interaction spec.
 *
 * Like `DateField`/`DatePicker`, it is a standalone composite widget that also
 * composes inside `Field.Root` (label / description / error / form validation).
 * A single combined proxy input is registered as the one Field control (its
 * value is empty until BOTH ends are complete, so `required` blocks a partial
 * range); two optional plain hidden inputs (`startName` / `endName`) provide
 * classic form-POST parity. A range typed in reverse is flagged invalid rather
 * than swapped — only the calendar normalizes endpoint order.
 */
export type DateRangePickerProps<T extends DateValue = DateValue> = {
  value?: DateRange<T> | null;
  defaultValue?: DateRange<T> | null;
  /**
   * Fired with a complete `{ start, end }` range, or `null` when the range is
   * cleared or becomes incomplete. Never fired for half-typed intermediates.
   */
  onChange?: (value: DateRange<T> | null) => void;
  onBlur?: () => void;
  granularity?: Granularity;
  minValue?: DateValue;
  maxValue?: DateValue;
  isDateUnavailable?: (date: DateValue) => boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  hourCycle?: HourCycle;
  placeholderValue?: DateValue;
  firstDayOfWeek?: FirstDayOfWeek;
  /**
   * Name for the combined hidden proxy input — a single `name=start/end` field
   * for native form POST, mirroring `DateField` / `DatePicker`. Inside
   * `Field.Root`, the Field's `name` takes precedence. For two separate fields,
   * use `startName` / `endName` instead.
   */
  name?: string;
  /** Names for the two plain hidden start/end inputs (classic form POST). */
  startName?: string;
  endName?: string;
  className?: string;
  id?: string;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** ID of the element(s) that label the control. */
  "aria-labelledby"?: string;
  /** ID of the element(s) that describe the control. */
  "aria-describedby"?: string;
  /** BCP-47 locale override; defaults to the AppShell formatting locale. */
  locale?: string;
  /** IANA timezone; defaults to the AppShell `timeZone`. */
  timeZone?: string;
};

/** One-end snapshot the combined funnel reads to synthesize the range state. */
interface EndSnapshot {
  fieldValue: DateValue | null;
  hasInput: boolean;
  invalidReason: DateFieldInvalidReason | null;
}

/** Combined proxy value: empty until BOTH ends are complete. */
function serializeRange(start: DateValue | null, end: DateValue | null): string {
  return start != null && end != null ? `${start.toString()}/${end.toString()}` : "";
}

function rangesEqual(a: DateRange | null, b: DateRange | null): boolean {
  if (a == null || b == null) return a == null && b == null;
  return a.start.compare(b.start as never) === 0 && a.end.compare(b.end as never) === 0;
}

const DateRangePicker = forwardRef(function DateRangePicker<T extends DateValue = DateValue>(
  {
    id,
    className,
    locale: localeProp,
    timeZone: timeZoneProp,
    value,
    defaultValue,
    onChange,
    onBlur,
    granularity,
    hourCycle,
    placeholderValue,
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    autoFocus,
    firstDayOfWeek,
    name,
    startName,
    endName,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  }: DateRangePickerProps<T>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const fieldRoot = useFieldRootContext();
  const { locale: shellLocale } = useResolvedLocale();
  const shellTz = useTimeZone();
  const resolvedLocale = localeProp ?? shellLocale;
  const resolvedTz = timeZoneProp ?? shellTz.value;
  const resolvedDisabled = fieldRoot.disabled || !!isDisabled;
  const resolvedReadOnly = !!isReadOnly;
  const t = useDateFieldT();

  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hasFocusWithinRef = useRef(false);
  const emitCombinedRef = useRef<
    (which: "start" | "end", source: DateFieldStateChangeSource) => void
  >(() => {});

  // Each end is staged separately so editing one field never clobbers the
  // other; `onChange` only ever sees a complete range (or null). `null` is a
  // controlled-empty value and stays distinct from `undefined` (uncontrolled) —
  // same contract as the single-date components.
  const isControlled = value !== undefined;
  const [startVal, setStartVal] = useState<DateValue | null>(
    () => (value ?? defaultValue)?.start ?? null,
  );
  const [endVal, setEndVal] = useState<DateValue | null>(
    () => (value ?? defaultValue)?.end ?? null,
  );
  const lastEmitted = useRef<DateRange | null>(value ?? defaultValue ?? null);

  // Sync staged ends when a *controlled* value changes externally, without
  // clobbering an in-progress edit or looping on our own onChange.
  useEffect(() => {
    if (!isControlled) return;
    const cv = value ?? null;
    if (!rangesEqual(cv, lastEmitted.current)) {
      lastEmitted.current = cv;
      setStartVal(cv?.start ?? null);
      setEndVal(cv?.end ?? null);
    }
  }, [value, isControlled]);

  const emit = useCallback(
    (start: DateValue | null, end: DateValue | null) => {
      const next: DateRange | null = start != null && end != null ? { start, end } : null;
      if (!rangesEqual(next, lastEmitted.current)) {
        lastEmitted.current = next;
        onChange?.(next as DateRange<T> | null);
      }
    },
    [onChange],
  );

  const setStart = useCallback(
    (v: DateValue | null) => {
      setStartVal(v);
      emit(v, endVal);
    },
    [emit, endVal],
  );
  const setEnd = useCallback(
    (v: DateValue | null) => {
      setEndVal(v);
      emit(startVal, v);
    },
    [emit, startVal],
  );

  const fieldShared = {
    granularity,
    locale: resolvedLocale,
    // Resolved timezone for both fields and the calendar, so "today"/anchors
    // agree (see DatePicker).
    timeZone: resolvedTz,
    hourCycle,
    placeholderValue,
    // Each end validates against these (flagged invalid, not clamped) — the same
    // bounds the calendar enforces on selection. The cross-field constraint
    // (end >= start) is handled separately via `isReversed` below.
    minValue,
    maxValue,
    isDateUnavailable,
    isReadOnly: resolvedReadOnly,
  };
  const startField = useDateFieldState({
    ...fieldShared,
    value: startVal,
    onChange: setStart,
    onStateChange: (change) => emitCombinedRef.current("start", change.source),
  });
  const endField = useDateFieldState({
    ...fieldShared,
    value: endVal,
    onChange: setEnd,
    onStateChange: (change) => emitCombinedRef.current("end", change.source),
  });

  // Latest per-end state, read for the *other* end at event time (the changed
  // end's own state is already reflected here on the next render, so reading the
  // rendered value is correct once both engines settle).
  const endsStateRef = useRef<{ start: EndSnapshot; end: EndSnapshot }>({
    start: startField,
    end: endField,
  });
  endsStateRef.current = { start: startField, end: endField };

  const calendarState = useRangeCalendarState({
    value: startVal != null && endVal != null ? { start: startVal, end: endVal } : null,
    onChange: (range) => {
      setStartVal(range.start);
      setEndVal(range.end);
      emit(range.start, range.end);
      // Close only on completion — the range hook fires onChange once, when
      // the second pick lands (shouldCloseOnSelect=true in react-aria terms).
      setOpen(false);
    },
    minValue,
    maxValue,
    isDateUnavailable,
    isDisabled: resolvedDisabled,
    isReadOnly: resolvedReadOnly,
    firstDayOfWeek,
    locale: resolvedLocale,
    timeZone: resolvedTz,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      // Land the roving focus on the range start (react-aria's autofocus target).
      if (startVal != null) calendarState.setFocusedDate(toCalendarDate(startVal as never));
    } else {
      // Dismissed mid-selection — drop the dangling anchor.
      calendarState.cancelSelection();
    }
  };

  // ── Combined render-time state (fed to the bridge as a single control) ──────
  const combinedInputValue = serializeRange(startField.fieldValue, endField.fieldValue);
  const combinedHasInput = startField.hasInput || endField.hasInput;
  const isReversed = startVal != null && endVal != null && endVal.compare(startVal as never) < 0;
  // Message precedence: reversed range (cross-field) → an end's out-of-range /
  // unavailable message. A consumer `errorMessage` is composed via Field.Error.
  const combinedMessage = useMemo(() => {
    if (isReversed) return t("rangeReversed");
    const key = invalidMessageKey(startField.invalidReason ?? endField.invalidReason);
    return key ? t(key) : undefined;
  }, [isReversed, startField.invalidReason, endField.invalidReason, t]);

  const bindings = useDateFieldFieldBridge({
    id,
    // Standalone: the combined proxy carries `name` (one `start/end` field);
    // inside Field.Root the Field's name wins. Split POST uses startName/endName.
    name,
    inputValue: combinedInputValue,
    hasInput: combinedHasInput,
    localValidationMessage: combinedMessage,
    isDisabled: resolvedDisabled,
    isReadOnly: resolvedReadOnly,
    isRequired,
    isInvalid,
    labelledBy: ariaLabelledby,
    describedBy: ariaDescribedby,
    ariaLabel,
    onBlur,
    groupRef: fieldRef,
    forwardedRef: ref,
  });

  // Event-time funnel: synthesize a combined change from both ends and drive the
  // single bridge. The changed end's fresh state is read from the rendered
  // engine (it settles this render); we read the sibling from the same ref.
  emitCombinedRef.current = (_which, source) => {
    const { start, end } = endsStateRef.current;
    const reversed =
      start.fieldValue != null &&
      end.fieldValue != null &&
      end.fieldValue.compare(start.fieldValue as never) < 0;
    const key = invalidMessageKey(start.invalidReason ?? end.invalidReason);
    let message: string | undefined;
    if (reversed) message = t("rangeReversed");
    else if (key) message = t(key);
    bindings.handleStateChange({
      source,
      fieldValue: null,
      inputValue: serializeRange(start.fieldValue, end.fieldValue),
      hasInput: start.hasInput || end.hasInput,
      invalidReason: null,
      localValidationMessage: message,
    });
  };

  // ── Popover-aware focus/blur containment (mirrors DatePicker) ────────────────
  const handleCompositeFocus = useCallback(() => {
    hasFocusWithinRef.current = true;
    bindings.handleGroupFocus();
  }, [bindings]);

  const handleCompositeBlur = useCallback(() => {
    if (!hasFocusWithinRef.current) return;
    hasFocusWithinRef.current = false;
    bindings.handleGroupBlur();
  }, [bindings]);

  const handleGroupBlur = useCallback(
    (nextFocused: EventTarget | null) => {
      if (isTargetWithin(nextFocused, popupRef)) return;
      handleCompositeBlur();
    },
    [handleCompositeBlur],
  );

  const handlePopupBlur = useCallback(
    (nextFocused: EventTarget | null) => {
      if (isTargetWithin(nextFocused, fieldRef) || isTargetWithin(nextFocused, popupRef)) return;
      handleCompositeBlur();
    },
    [handleCompositeBlur],
  );

  let popoverAriaLabel: string | undefined;
  if (bindings.labelledBy == null) {
    popoverAriaLabel = ariaLabel
      ? t("chooseDateRangeFor", { name: ariaLabel })
      : t("chooseDateRange");
  }

  return (
    <div data-slot="date-range-picker" className={cn("astw:relative", className)}>
      <input
        ref={bindings.proxyRef}
        id={bindings.controlId}
        name={bindings.name}
        tabIndex={-1}
        aria-hidden="true"
        disabled={bindings.isDisabled}
        readOnly={bindings.isReadOnly}
        required={bindings.isRequired}
        value={combinedInputValue}
        onChange={() => {}}
        onFocus={bindings.focusFirstSegment}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      <DatePopover
        open={open}
        onOpenChange={handleOpenChange}
        ariaLabel={popoverAriaLabel}
        ariaLabelledby={bindings.labelledBy}
        popupRef={popupRef}
        onPopupBlur={handlePopupBlur}
        anchor={fieldRef}
        field={
          <DateRangeInputGroup
            start={startField}
            end={endField}
            onOpenCalendar={() => handleOpenChange(true)}
            isDisabled={bindings.isDisabled}
            isReadOnly={bindings.isReadOnly}
            isInvalid={bindings.isInvalid}
            isRequired={bindings.isRequired}
            autoFocus={autoFocus}
            ariaLabelledby={bindings.labelledBy}
            ariaLabel={bindings.ariaLabel}
            describedById={bindings.describedBy}
            groupRef={fieldRef}
            trigger={<DatePickerPopoverTrigger disabled={bindings.isDisabled} />}
            onGroupFocus={handleCompositeFocus}
            onGroupBlur={handleGroupBlur}
          />
        }
      >
        <CalendarView
          state={calendarState}
          ariaLabel={bindings.labelledBy ? undefined : (ariaLabel ?? t("calendar"))}
          ariaLabelledBy={bindings.labelledBy}
          inPopover
        />
      </DatePopover>
      {startName && (
        <input type="hidden" name={startName} value={startField.fieldValue?.toString() ?? ""} />
      )}
      {endName && (
        <input type="hidden" name={endName} value={endField.fieldValue?.toString() ?? ""} />
      )}
    </div>
  );
}) as <T extends DateValue = DateValue>(
  props: DateRangePickerProps<T> & { ref?: Ref<HTMLInputElement> },
) => ReactElement;

export { DateRangePicker };
