---
title: DatePicker
description: Accessible date input components (@internationalized/date + Base UI)
---

# DatePicker

Three related components for date input — a segmented field, a field with a calendar popover, and a standalone calendar grid. Built on [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) and Base UI.

## Import

```tsx
import {
  DateField,
  DatePicker,
  Calendar,
  Field,
  // Date value helpers (re-exported from @internationalized/date)
  parseDate,
  getLocalTimeZone,
  type CalendarDate,
  type DateValue,
} from "@tailor-platform/app-shell";
```

## API shape

`DateField` and `DatePicker` are **control-first** components.

- They own date entry, keyboard behavior, constraints, locale/timezone handling, and form value serialization.
- `Field.Root` owns label, description, invalid presentation, and error rendering.

That matches the rest of the form stack (`Field`, `Select`, `Combobox`, `Autocomplete`).

## DateField

Standalone usage with an accessible name:

```tsx
<DateField aria-label="Invoice date" />
```

With `Field.Root` composition:

```tsx
<Field.Root>
  <Field.Label>Invoice date</Field.Label>
  <DateField aria-label="Invoice date" />
  <Field.Description>Format follows your locale</Field.Description>
</Field.Root>
```

Controlled:

```tsx
const [date, setDate] = useState<CalendarDate | null>(null);

<Field.Root>
  <Field.Label>Invoice date</Field.Label>
  <DateField aria-label="Invoice date" value={date} onChange={setDate} />
</Field.Root>;
```

## DatePicker

A `DateField` with a calendar popover.

```tsx
<DatePicker aria-label="Ship date" />
```

Constrained + unavailable dates:

```tsx
<Field.Root>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker
    aria-label="Delivery date"
    constraints={{
      min: today(getLocalTimeZone()),
      unavailable: (date) => {
        const dow = date.toDate(getLocalTimeZone()).getDay();
        return dow === 0 || dow === 6; // weekends
      },
    }}
  />
</Field.Root>
```

Week start:

```tsx
<DatePicker aria-label="Date" firstDayOfWeek="mon" />
```

## Validation with Field.Root

Use the field shell for labels and external errors:

```tsx
<Field.Root invalid={!!error}>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker aria-label="Delivery date" value={value} onChange={setValue} />
  <Field.Error match={!!error}>{error}</Field.Error>
</Field.Root>
```

## Calendar

A standalone calendar grid for custom date-selection UIs.

```tsx
<Calendar aria-label="Select date" onChange={(date) => console.log(date)} />
```

## Localization

Locale and timezone come from AppShell automatically. Override per field with `locale` / `timeZone`:

```tsx
<DatePicker aria-label="Date" locale="ja-JP" />
```

## Keyboard

- **Segments:** `↑`/`↓` increment/decrement, digits type-to-fill (auto-advance), `←`/`→` move between segments, `Backspace` clears, `/` commits the current segment and advances.
- **Whole-date shortcuts:** `t` today · `m`/`h` start/end of the entered month · `y`/`r` start/end of the year · `w`/`k` start/end of the week · `-` previous day · `=`/`+` next day.
- **Calendar grid:** arrows move by day/week, `Home`/`End` to week start/end, `PageUp`/`PageDown` by month, `Shift`+`PageUp`/`PageDown` by year, `Enter`/`Space` selects. `Alt`+`↓` opens the calendar from the field.

## Props

### DateFieldProps

| Prop                             | Type                                                          | Description                                         |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| `value` / `defaultValue`         | `DateValue \| null`                                          | Controlled / uncontrolled value                     |
| `onChange`                       | `(v: DateValue \| null) => void`                             | Fires when the value changes                        |
| `onBlur`                         | `() => void`                                                  | Fires when focus leaves the whole segmented control |
| `constraints`                    | `{ required?, min?, max?, unavailable? }`                     | Date constraints and required flag                  |
| `mode`                           | `"editable" \| "readonly" \| "disabled"`               | Control mode                                        |
| `placeholderValue`               | `DateValue`                                                   | Seeds unset segments                                |
| `autoFocus`                      | `boolean`                                                     | Focus the first segment on mount                    |
| `locale`                         | `string`                                                      | BCP-47 locale override                              |
| `name`                           | `string`                                                      | Emits a form value through the hidden proxy input   |
| `id`                             | `string`                                                      | Control id                                          |
| `firstDayOfWeek`                 | `"sun" \| "mon" \| "tue" \| "wed" \| "thu" \| "fri" \| "sat"` | Override the locale week start used by `w` / `k` shortcuts |
| `aria-label` / `aria-labelledby` | `string`                                                      | Accessible name                                     |
| `className`                      | `string`                                                      | Root element class                                  |

### DatePickerProps

All `DateFieldProps`, plus:

| Prop             | Type                    | Description                         |
| ---------------- | ----------------------- | ----------------------------------- |
| `timeZone`       | `string`                | IANA timezone for resolving "today" |
| `firstDayOfWeek` | `"sun" \| "mon" \| ...` | Force the calendar's first column   |

### CalendarProps

See the calendar docs in-code: controlled/uncontrolled value, min/max, unavailable dates, focused date, locale, timezone, accessible naming, and className.

## Related

- [Field](./form.md) — field shell for labels, descriptions, and errors
- [useTimeZone](../api/use-time-zone.md)
- [useResolvedLocale](../api/use-resolved-locale.md)
