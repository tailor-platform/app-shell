---
title: DatePicker
description: Accessible date input components (@internationalized/date + Base UI)
---

# DatePicker

Three related components for date input — a segmented field, a field with a calendar popover, and a standalone calendar grid. Built on [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) (the value layer) and Base UI (`Popover`), with the segmented input and calendar grid implemented to the [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) date-picker/grid patterns. They integrate automatically with AppShell's locale and timezone context.

> **Implementation note.** This is the `@internationalized/date` + Base UI variant. The public API and accessibility contract are identical to the react-aria variant; only the internals differ.

[Live preview in the UI Catalogue →](https://ui.tailor.tech/components/date-picker)

## Import

```tsx
import {
  DateField,
  DatePicker,
  Calendar,
  // Date value helpers (re-exported from @internationalized/date)
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

Segment order, first-day-of-week, and month/weekday names all follow the resolved locale.

## Keyboard

- **Segments:** `↑`/`↓` increment/decrement, digits type-to-fill (auto-advance), `←`/`→` move between segments, `Backspace` clears, `/` commits the current segment and advances (so a single `1` means January, not the start of `1x`).
- **Whole-date shortcuts** (QuickBooks Online-style, case-insensitive): `t` today · `m`/`h` start/end of the entered month (current month when empty) · `y`/`r` start/end of the year · `w`/`k` start/end of the week (locale-aware) · `-` previous day · `=`/`+` next day (both step across month **and** year boundaries; `+` needs no Shift). A 1–2 digit year expands to the 2000s on blur (`26` → `2026`). These work **from a focused date segment** (they set the field value, clamped to `minValue`/`maxValue`) **and while the calendar popover is open** (they move the highlighted day like the arrow keys — press `Enter` to confirm; `minValue`/`maxValue` clamp and unavailable days can't be confirmed).
- **Calendar grid:** arrows move by day/week, `Home`/`End` to week start/end, `PageUp`/`PageDown` by month, `Shift`+`PageUp`/`PageDown` by year, `Enter`/`Space` selects. `Alt`+`↓` opens the calendar from the field (`DatePicker`).

## Accessibility

- The segmented field is a labelled `role="group"` of `role="spinbutton"` segments with `aria-valuemin`/`max`/`now`/`text`.
- The calendar is a `role="grid"`; each day is a button with a full-date `aria-label`; disabled/unavailable days are announced via `aria-disabled`.
- The popover is a labelled `role="dialog"`.

> **Known limitations (this variant).** The segments are `<div role="spinbutton">` that aren't `contentEditable`, so a touch device's on-screen keyboard doesn't open for typing — on mobile, use the calendar popover to pick a date (desktop keyboard entry and the calendar both work fully). The APG patterns are implemented and unit-tested but **not yet screen-reader-audited**, and RTL arrow-key flipping isn't handled.

## Props

The tables below list props this variant **actually implements** for v1 (date granularity). A few props are part of the type surface — kept identical to the react-aria variant so a later swap is source-compatible — but aren't acted on yet; those are called out under [Proposed / not yet implemented](#proposed--not-yet-implemented).

### DateFieldProps

| Prop                                      | Type                                                          | Description                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `label`                                   | `LocalizedString`                                             | Field label                                                                                    |
| `description`                             | `LocalizedString`                                             | Helper text below the field                                                                    |
| `errorMessage`                            | `LocalizedString`                                             | Error text; also sets the invalid state                                                        |
| `value` / `defaultValue`                  | `DateValue \| null`                                           | Controlled / uncontrolled value (`CalendarDate` at date granularity)                           |
| `onChange`                                | `(v: DateValue \| null) => void`                              | Fires on a complete, valid value; `null` when cleared                                          |
| `isDisabled` / `isReadOnly` / `isInvalid` | `boolean`                                                     | State flags                                                                                    |
| `isRequired`                              | `boolean`                                                     | Sets `aria-required` on the segments (no visual required indicator yet)                        |
| `placeholderValue`                        | `DateValue`                                                   | Seeds unset segments (increment start + segment order)                                         |
| `autoFocus`                               | `boolean`                                                     | Focus the first segment on mount                                                               |
| `locale`                                  | `string`                                                      | BCP-47 locale override (defaults to the AppShell formatting locale)                            |
| `name`                                    | `string`                                                      | Emits a hidden `<input>` with the ISO value for form submission                                |
| `firstDayOfWeek`                          | `"sun" \| "mon" \| "tue" \| "wed" \| "thu" \| "fri" \| "sat"` | Override the locale's week start for the `w`/`k` keyboard shortcuts; omit to follow the locale |
| `aria-label`                              | `string`                                                      | Accessible name when there's no visible `label` (e.g. compact filters)                         |
| `className`                               | `string`                                                      | Root element class                                                                             |

> `DateField` has no calendar, so `minValue` / `maxValue` / `isDateUnavailable` don't apply to it — they're honoured by `DatePicker` and `Calendar` below.

### DatePickerProps

All `DateFieldProps`, plus:

| Prop                    | Type                                                          | Description                                                          |
| ----------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `minValue` / `maxValue` | `DateValue`                                                   | Earliest / latest selectable date in the calendar                    |
| `isDateUnavailable`     | `(date: DateValue) => boolean`                                | Mark individual dates unselectable (still keyboard-navigable)        |
| `firstDayOfWeek`        | `"sun" \| "mon" \| "tue" \| "wed" \| "thu" \| "fri" \| "sat"` | Force the calendar's first column; omit to follow the locale         |
| `timeZone`              | `string`                                                      | IANA timezone for resolving "today"; defaults to AppShell `timeZone` |

### CalendarProps

The standalone calendar grid. It has no segmented input, so its surface is listed in full:

| Prop                                   | Type                           | Description                                                   |
| -------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `value` / `defaultValue`               | `DateValue \| null`            | Controlled / uncontrolled selected date                       |
| `onChange`                             | `(v: DateValue) => void`       | Fires when a date is selected                                 |
| `minValue` / `maxValue`                | `DateValue`                    | Earliest / latest selectable date                             |
| `isDateUnavailable`                    | `(date: DateValue) => boolean` | Mark individual dates unselectable (still keyboard-navigable) |
| `focusedValue` / `defaultFocusedValue` | `DateValue`                    | Controlled / initial focused (visible) date                   |
| `onFocusChange`                        | `(date: CalendarDate) => void` | Fires when the focused date changes (arrows, month paging)    |
| `firstDayOfWeek`                       | `"sun" \| "mon" \| …`          | Force the first column; omit to follow the locale             |
| `isDisabled` / `isReadOnly`            | `boolean`                      | Disable the grid / prevent selection changes                  |
| `timeZone`                             | `string`                       | IANA timezone for "today"; defaults to AppShell `timeZone`    |
| `locale`                               | `string`                       | BCP-47 locale override                                        |
| `aria-label` / `aria-labelledby`       | `string`                       | Accessible name for the grid                                  |
| `className`                            | `string`                       | Root element class                                            |

### Proposed / not yet implemented

Accepted by the prop types (for parity with the react-aria variant) but **not acted on** in this variant yet:

| Prop           | Type                                      | Status                                                                                                                                                                                                             |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `granularity`  | `"day" \| "hour" \| "minute" \| "second"` | Only `"day"` is supported (the default). Time granularities — and the `CalendarDateTime` / `ZonedDateTime` values they produce — are the tracked **DateTime fast-follow**; the calendar has no time selection yet. |
| `hourCycle`    | `12 \| 24`                                | No effect until time granularity lands (12h/24h only matters with an hour segment).                                                                                                                                |
| `hideTimeZone` | `boolean`                                 | Unused; only relevant to `ZonedDateTime` display (time granularity).                                                                                                                                               |

Only date granularity is supported in v1; DateTime support is planned for a later release.

## Related

- [Form](./form.md) — wrap date fields with validation
- [Input](./input.md) — plain text input
- [useTimeZone](../api/use-time-zone.md) — access the configured timezone consumed automatically by these components
- [useResolvedLocale](../api/use-resolved-locale.md) — access the locale used for segment order and month names
