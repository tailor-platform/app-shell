---
title: DatePicker
description: Accessible date input components (@internationalized/date + Base UI)
---

# DatePicker

Three related components for date input — a segmented field, a field with a calendar popover, and a standalone calendar grid. Built on [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) (the value layer) and Base UI (`Popover`), with the segmented input and calendar grid implemented to the [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) date-picker/grid patterns. They integrate automatically with AppShell's locale and timezone context.

> **Implementation note.** This is the `@internationalized/date` + Base UI variant. The public API and accessibility contract are identical to the react-aria variant; only the internals differ. See `docs/proposals/date-picker-impl-comparison.md`.

## Import

```tsx
import {
  DateField,
  DatePicker,
  Calendar,
  // Date value helpers (re-exported from @internationalized/date)
  today,
  parseDate,
  getLocalTimeZone,
  type CalendarDate,
  type DateValue,
} from "@tailor-platform/app-shell";
```

No separate `@internationalized/date` install needed — the value types and helpers are re-exported from `@tailor-platform/app-shell`.

## DateField

A segmented input that lets users type dates digit-by-digit, with per-segment Up/Down, type-to-fill auto-advance, and full keyboard support.

```tsx
<DateField label="Invoice date" />
```

### With description and error

```tsx
<DateField
  label="Start date"
  description="Format follows your locale"
  errorMessage="A start date is required"
/>
```

### Controlled

```tsx
const [date, setDate] = useState<CalendarDate | null>(null);
<DateField label="Invoice date" value={date} onChange={setDate} />;
```

## DatePicker

A `DateField` with a calendar popover.

```tsx
<DatePicker label="Ship date" />
```

### Constrained + unavailable dates

```tsx
<DatePicker
  label="Delivery date"
  minValue={today(getLocalTimeZone())}
  isDateUnavailable={(date) => {
    const dow = date.toDate(getLocalTimeZone()).getDay();
    return dow === 0 || dow === 6; // weekends
  }}
/>
```

### Week start

```tsx
<DatePicker label="Date" firstDayOfWeek="mon" />
```

## Calendar

A standalone calendar grid for custom date-selection UIs (e.g. reporting filters).

```tsx
<Calendar aria-label="Select date" onChange={(date) => console.log(date)} />
```

## Localization

Locale and timezone come from AppShell automatically. Override per field with `locale` / `timeZone`:

```tsx
<DatePicker label="Date" locale="ja-JP" />
```

Segment order, first-day-of-week, month/weekday names, and 12/24-hour display all follow the resolved locale.

## Keyboard

- **Segments:** `↑`/`↓` increment/decrement, digits type-to-fill (auto-advance), `←`/`→` move between segments, `Backspace` clears.
- **Calendar grid:** arrows move by day/week, `Home`/`End` to week start/end, `PageUp`/`PageDown` by month, `Shift`+`PageUp`/`PageDown` by year, `Enter`/`Space` selects.

## Accessibility

- The segmented field is a labelled `role="group"` of `role="spinbutton"` segments with `aria-valuemin`/`max`/`now`/`text`.
- The calendar is a `role="grid"`; each day is a button with a full-date `aria-label`; disabled/unavailable days are announced via `aria-disabled`.
- The popover is a labelled `role="dialog"`.

## Props

### DateFieldProps

| Prop                                                     | Type                                      | Description                                                          |
| -------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `label`                                                  | `LocalizedString`                         | Field label                                                          |
| `description`                                            | `LocalizedString`                         | Helper text                                                          |
| `errorMessage`                                           | `LocalizedString`                         | Error text; also sets the invalid state                              |
| `value` / `defaultValue`                                 | `DateValue \| null`                       | Controlled / uncontrolled value                                      |
| `onChange`                                               | `(v: DateValue \| null) => void`          | Called on change; `null` when cleared                                |
| `granularity`                                            | `"day" \| "hour" \| "minute" \| "second"` | Drives the value type                                                |
| `minValue` / `maxValue`                                  | `DateValue`                               | Bounds                                                               |
| `isDateUnavailable`                                      | `(date: DateValue) => boolean`            | Mark dates unavailable                                               |
| `isDisabled` / `isReadOnly` / `isRequired` / `isInvalid` | `boolean`                                 | State flags                                                          |
| `hourCycle`                                              | `12 \| 24`                                | Override AM/PM vs 24-hour                                            |
| `placeholderValue`                                       | `DateValue`                               | Seeds unset segments                                                 |
| `autoFocus`                                              | `boolean`                                 | Focus first segment on mount                                         |
| `locale`                                                 | `string`                                  | BCP-47 locale override                                               |
| `name`                                                   | `string`                                  | Hidden input for form submission                                     |
| `aria-label`                                             | `string`                                  | Accessible name when no visible `label` (e.g. compact filter inputs) |
| `className`                                              | `string`                                  | Root element class                                                   |

### DatePickerProps

All `DateFieldProps` plus `firstDayOfWeek` (`"sun" | "mon" | …`) and `timeZone` (IANA; defaults to AppShell `timeZone`).

### CalendarProps

`value` / `defaultValue` / `onChange` / `minValue` / `maxValue` / `isDateUnavailable` / `isDisabled` / `isReadOnly` / `focusedValue` / `defaultFocusedValue` / `onFocusChange` / `firstDayOfWeek` / `aria-label` / `aria-labelledby` / `timeZone` / `locale` / `className`.

## Related

- [Form](./form.md) — wrap date fields with validation
- [Input](./input.md) — plain text input
