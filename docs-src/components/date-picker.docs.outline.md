---
kind: code-backed
group: date-picker
title: DatePicker
description: Accessible date input components (@internationalized/date + Base UI)
sources:
  - packages/core/src/components/date-field/**
  - packages/core/src/components/calendar/**
---

# DatePicker

Three related components for date input — a segmented field, a field with a calendar popover, and a standalone calendar grid. Built on [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) and Base UI.

## Import

```tsx
import {
  DateField,
  DatePicker,
  DateRangePicker,
  Calendar,
  RangeCalendar,
  Field,
  useTimeZone,
  // Date value helpers (re-exported from @internationalized/date)
  parseDate,
  type CalendarDate,
  type DateValue,
  type DateRange,
} from "@tailor-platform/app-shell";
```

The examples below also import `Button`, `Form`, and `Text` from `@tailor-platform/app-shell`, and `useId` and `useState` from `react`.

## API shape

`DateField` and `DatePicker` are standalone composite controls.

- They own date entry, keyboard behavior, constraints, locale/timezone handling, and form value serialization.
- They expose standard labeling hooks: `id`, `aria-label`, `aria-labelledby`, `aria-describedby`, and `isInvalid`.
- They also auto-wire into `Field.Root`, so `Field.Label`, `Field.Description`, `Field.Error`, and form validation state work the same way as the other AppShell form controls.

## DateField

Standalone usage with an accessible name:

<!-- example: standalone-date-field -->

With a visible label + description:

<!-- example: labeled-date-field -->

Inside `Field.Root`:

<!-- example: date-field-with-field -->

Controlled:

```tsx
const [date, setDate] = useState<CalendarDate | null>(null);

<DateField aria-label="Invoice date" value={date} onChange={setDate} />;
```

## DatePicker

A `DateField` with a calendar popover.

<!-- example: standalone-date-picker -->

Constrained + unavailable dates:

Use [`useTimeZone()`](../api/use-time-zone.md) to obtain today's date in AppShell's configured timezone, rather than calculating against the browser's timezone directly.

<!-- example: constrained-dates -->

Week start:

<!-- example: week-start -->

## Validation and errors

Use standard HTML + ARIA when rendering the field standalone:

Click **Check delivery date** while empty to show a consumer-owned error, then choose a date to clear it. `isInvalid` and `aria-describedby` connect the standalone control to the visible message; `useId` keeps the association unique.

<!-- example: standalone-validation -->

Or let `Field.Root` wire the label, description, and error elements:

Submit the empty field to see its required error. A date before April 1, 2026 can be typed, but the control's `minValue` validation blocks submission and surfaces through `Field.Error match="customError"`. A valid date is submitted as an ISO date string; the result stays local.

<!-- example: field-validation -->

## Calendar

A standalone calendar grid for custom date-selection UIs.

<!-- example: standalone-calendar -->

## DateRangePicker

Start and end segmented inputs sharing one calendar popover, with a `{ start, end }` value (`DateRange`) — a **separate component** from `DatePicker`, not a mode. Same composition model as the other controls: standalone with `aria-*`, or inside `Field.Root`. Selection follows the react-aria model — the first calendar pick anchors the range and keeps the popover open, the highlight follows the pointer/arrows, and the second pick completes it; picking backwards swaps the endpoints, while a range **typed** in reverse is flagged invalid (`Field.Error match="customError"`) rather than swapped.

The standalone controlled example keeps real `DateRange` values (`DateValue` endpoints), not strings. Choose two calendar days or edit the segments to see the complete range. **Clear range** resets both ends; a half-entered range reports `null` until both ends are complete. The clear action remounts the picker so incomplete drafts are reset even when the external value is already `null`.

<!-- example: standalone-date-range -->

Inside `Form`, the field owns the input value. Try submitting an empty range or only its start, then type an end date earlier than the start to see the built-in reversed-range error. Calendar selections normalize the endpoint order instead. Complete an ordered range to submit successfully.

`onChange` exposes a `DateRange`, while `Form.onFormSubmit` receives the combined serialized string, for example `{ "period": "2026-04-09/2026-04-12" }`. The example displays that actual form payload without duplicating the input in string state.

<!-- example: date-range-with-field -->

A single combined proxy input is registered as the one Field control — its value is empty until **both** ends are complete, so `isRequired` blocks a partial range. Give that combined input a `name` for a single `start/end` native-POST field (a wrapping `Field.Root` name wins), or use `startName` / `endName` to emit two plain hidden inputs for classic form-POST.

## RangeCalendar

The standalone inline range calendar (the grid inside `DateRangePicker`), for custom layouts.

<!-- example: standalone-range-calendar -->

## Localization

Locale and timezone come from AppShell automatically. Override per field with `locale` / `timeZone`:

<!-- example: localized-picker -->

### Day of the week

`showDayOfWeek` adds the locale's short day of the week where the locale places it — `2025/12/19(金)` for ja-JP, `Fri, 12/19/2025` for en-US. It is read-only and derived from the entered date: it shows a placeholder until the date is complete, and while a date segment is mid-entry it keeps the previous day of the week (muted), so typing `25` into the day never flashes the 2nd's. Screen readers hear the full day name with each date segment's value.

<!-- example: weekday -->

## Keyboard

- **Segments:** `↑`/`↓` increment/decrement, digits type-to-fill (auto-advance), `←`/`→` move between segments, `Backspace` clears, `/` commits the current segment and advances.
- **Whole-date shortcuts:** `t` today · `m`/`h` start/end of the entered month · `y`/`r` start/end of the year · `w`/`k` start/end of the week · `-` previous day · `=`/`+` next day.
- **Calendar grid:** arrows move by day/week, `Home`/`End` to week start/end, `PageUp`/`PageDown` by month, `Shift`+`PageUp`/`PageDown` by year, `Enter`/`Space` selects. `Alt`+`↓` opens the calendar from the field.

## Props

### DateFieldProps

| Prop                             | Type                                                          | Description                                                  |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `value` / `defaultValue`         | `DateValue \| null`                                           | Controlled / uncontrolled value                              |
| `onChange`                       | `(v: DateValue \| null) => void`                              | Fires when the value changes                                 |
| `onBlur`                         | `() => void`                                                  | Fires when focus leaves the whole segmented control          |
| `minValue` / `maxValue`          | `DateValue`                                                   | Inclusive date range bounds                                  |
| `isDateUnavailable`              | `(date: DateValue) => boolean`                                | Marks specific dates unavailable                             |
| `isDisabled`                     | `boolean`                                                     | Disables interaction and form submission                     |
| `isReadOnly`                     | `boolean`                                                     | Allows focus/navigation without editing                      |
| `isRequired`                     | `boolean`                                                     | Marks the control required                                   |
| `isInvalid`                      | `boolean`                                                     | Adds invalid styling / `aria-invalid` to the segmented UI    |
| `placeholderValue`               | `DateValue`                                                   | Seeds unset segments                                         |
| `granularity`                    | `"day" \| "hour" \| "minute" \| "second"`                     | Smallest editable unit; time granularities add time segments |
| `hourCycle`                      | `12 \| 24`                                                    | Force 12- or 24-hour time; defaults to the locale            |
| `autoFocus`                      | `boolean`                                                     | Focus the first segment on mount                             |
| `locale`                         | `string`                                                      | BCP-47 locale override                                       |
| `showDayOfWeek`                  | `boolean`                                                     | Show the locale's short day of the week next to the date     |
| `name`                           | `string`                                                      | Emits a form value through the proxy input                   |
| `id`                             | `string`                                                      | Proxy input id (use with external `<label htmlFor>`).        |
| `firstDayOfWeek`                 | `"sun" \| "mon" \| "tue" \| "wed" \| "thu" \| "fri" \| "sat"` | Override the locale week start used by `w` / `k` shortcuts   |
| `aria-label` / `aria-labelledby` | `string`                                                      | Accessible name                                              |
| `aria-describedby`               | `string`                                                      | IDs of description / error elements                          |
| `className`                      | `string`                                                      | Root element class                                           |

### DatePickerProps

All `DateFieldProps`, plus:

| Prop             | Type                    | Description                         |
| ---------------- | ----------------------- | ----------------------------------- |
| `timeZone`       | `string`                | IANA timezone for resolving "today" |
| `firstDayOfWeek` | `"sun" \| "mon" \| ...` | Force the calendar's first column   |

### CalendarProps

See the calendar docs in-code: controlled/uncontrolled value, min/max, unavailable dates, focused date, locale, timezone, accessible naming, and className.

### DateRangePickerProps

The `DatePickerProps` surface (labeling, `isInvalid`, `min/maxValue`, `isDateUnavailable`, `granularity`, `hourCycle`, `firstDayOfWeek`, `timeZone`, `locale`, `showDayOfWeek`, `autoFocus`, `isDisabled/ReadOnly/Required`), with the range-specific differences:

| Prop                     | Type                             | Description                                                                     |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| `value` / `defaultValue` | `DateRange \| null`              | Controlled / uncontrolled `{ start, end }` range                                |
| `onChange`               | `(v: DateRange \| null) => void` | Fires with a complete range, or `null` when cleared/incomplete                  |
| `name`                   | `string`                         | One combined hidden input (`start/end`) for native POST; `Field.Root` name wins |
| `startName` / `endName`  | `string`                         | Emit two plain hidden inputs with the ISO start/end (classic POST)              |

A typed range with `end` before `start` sets the invalid state and reports a built-in `customError` message (`Field.Error match="customError"`); the calendar always commits ordered endpoints.

### RangeCalendarProps

Same surface as `CalendarProps`, with `value` / `defaultValue`: `DateRange | null` and `onChange`: `(v: DateRange) => void` (fired once per selection, when the second date completes the range).

The optional `onSelectionStateChange` receives a discriminated event for each selection transition:

| `event.type`       | Additional payload | Meaning                                    |
| ------------------ | ------------------ | ------------------------------------------ |
| `selection-start`  | —                  | The first pick anchors an unfinished range |
| `range-complete`   | `value: DateRange` | The second pick completes an ordered range |
| `selection-cancel` | —                  | Escape cancels an unfinished selection     |

Use these events to disable external Apply actions until selection completes or is cancelled. Only `range-complete` carries a value; it contains the same range passed to the existing `onChange`, so event-only consumers do not need to subscribe to both callbacks. Events report interactions only, not initial render or unmount; when resetting or remounting the calendar, reset any parent-owned selection state too.

## Related

- [useTimeZone](../api/use-time-zone.md)
- [useResolvedLocale](../api/use-resolved-locale.md)
