---
title: DatePicker
description: Accessible date input components (@internationalized/date + Base UI)
---

# DatePicker

Three related components for date input — a segmented field, a field with a calendar popover, and a standalone calendar grid. Built on [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) and Base UI.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/components/date-picker)

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
  today,
  type CalendarDate,
  type DateValue,
} from "@tailor-platform/app-shell";
```

## API shape

`DateField` and `DatePicker` are standalone composite controls.

- They own date entry, keyboard behavior, constraints, locale/timezone handling, and form value serialization.
- They expose standard labeling hooks: `id`, `aria-label`, `aria-labelledby`, `aria-describedby`, and `isInvalid`.
- They also auto-wire into `Field.Root`, so `Field.Label`, `Field.Description`, `Field.Error`, and form validation state work the same way as the other AppShell form controls.

## DateField

Standalone usage with an accessible name:

```tsx
<DateField aria-label="Invoice date" />
```

With a visible label + description:

```tsx
<label id="invoice-date-label" htmlFor="invoice-date">
  Invoice date
</label>
<DateField
  id="invoice-date"
  aria-labelledby="invoice-date-label"
  aria-describedby="invoice-date-help"
/>
<p id="invoice-date-help">Format follows your locale</p>
```

Inside `Field.Root`:

```tsx
<Field.Root name="invoiceDate">
  <Field.Label>Invoice date</Field.Label>
  <DateField />
  <Field.Description>Format follows your locale</Field.Description>
</Field.Root>
```

Controlled:

```tsx
const [date, setDate] = useState<CalendarDate | null>(null);

<DateField aria-label="Invoice date" value={date} onChange={setDate} />;
```

## DatePicker

A `DateField` with a calendar popover.

```tsx
<DatePicker aria-label="Ship date" />
```

Constrained + unavailable dates:

```tsx
<label id="delivery-date-label" htmlFor="delivery-date">
  Delivery date
</label>
<DatePicker
  id="delivery-date"
  aria-labelledby="delivery-date-label"
  minValue={today(getLocalTimeZone())}
  isDateUnavailable={(date) => {
    const dow = date.toDate(getLocalTimeZone()).getDay();
    return dow === 0 || dow === 6; // weekends
  }}
/>
```

Week start:

```tsx
<DatePicker aria-label="Date" firstDayOfWeek="mon" />
```

## Validation and errors

Use standard HTML + ARIA when rendering the field standalone:

```tsx
<label id="delivery-date-label" htmlFor="delivery-date">
  Delivery date
</label>
<DatePicker
  id="delivery-date"
  aria-labelledby="delivery-date-label"
  aria-describedby={error ? "delivery-date-error" : undefined}
  isInvalid={!!error}
  value={value}
  onChange={setValue}
/>
{error && <p id="delivery-date-error">{error}</p>}
```

Or let `Field.Root` wire the label, description, and error elements:

```tsx
<Field.Root name="deliveryDate" error={error ? { message: error } : undefined}>
  <Field.Label>Delivery date</Field.Label>
  <DatePicker value={value} onChange={setValue} />
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

| Prop                             | Type                                                          | Description                                                |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `value` / `defaultValue`         | `DateValue \| null`                                           | Controlled / uncontrolled value                            |
| `onChange`                       | `(v: DateValue \| null) => void`                              | Fires when the value changes                               |
| `onBlur`                         | `() => void`                                                  | Fires when focus leaves the whole segmented control        |
| `minValue` / `maxValue`          | `DateValue`                                                   | Inclusive date range bounds                                |
| `isDateUnavailable`              | `(date: DateValue) => boolean`                                | Marks specific dates unavailable                           |
| `isDisabled`                     | `boolean`                                                     | Disables interaction and form submission                   |
| `isReadOnly`                     | `boolean`                                                     | Allows focus/navigation without editing                    |
| `isRequired`                     | `boolean`                                                     | Marks the control required                                 |
| `isInvalid`                      | `boolean`                                                     | Adds invalid styling / `aria-invalid` to the segmented UI  |
| `placeholderValue`               | `DateValue`                                                   | Seeds unset segments                                       |
| `autoFocus`                      | `boolean`                                                     | Focus the first segment on mount                           |
| `locale`                         | `string`                                                      | BCP-47 locale override                                     |
| `name`                           | `string`                                                      | Emits a form value through the proxy input                 |
| `id`                             | `string`                                                      | Proxy input id (use with external `<label htmlFor>`).      |
| `firstDayOfWeek`                 | `"sun" \| "mon" \| "tue" \| "wed" \| "thu" \| "fri" \| "sat"` | Override the locale week start used by `w` / `k` shortcuts |
| `aria-label` / `aria-labelledby` | `string`                                                      | Accessible name                                            |
| `aria-describedby`               | `string`                                                      | IDs of description / error elements                        |
| `className`                      | `string`                                                      | Root element class                                         |

### DatePickerProps

All `DateFieldProps`, plus:

| Prop             | Type                    | Description                         |
| ---------------- | ----------------------- | ----------------------------------- |
| `timeZone`       | `string`                | IANA timezone for resolving "today" |
| `firstDayOfWeek` | `"sun" \| "mon" \| ...` | Force the calendar's first column   |

### CalendarProps

See the calendar docs in-code: controlled/uncontrolled value, min/max, unavailable dates, focused date, locale, timezone, accessible naming, and className.

## Related

- [useTimeZone](../api/use-time-zone.md)
- [useResolvedLocale](../api/use-resolved-locale.md)
