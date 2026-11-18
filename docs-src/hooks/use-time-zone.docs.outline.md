---
kind: prose
group: use-time-zone
title: useTimeZone
description: Hook to access the configured IANA timezone from AppShell context
---

# useTimeZone

React hook that returns a `TimeZone` object for the timezone configured on `AppShell`. Falls back to the user's local timezone when no timezone is configured.

Date/time components (`DateField`, `DatePicker`, `Calendar`) consume this hook automatically — use it when you need the same timezone in custom components.

For the current date or time in React components, use `timeZone.today()` or `timeZone.now()` rather than importing standalone `today` or `now` helpers from AppShell. These methods respect AppShell's `timeZone` setting; calculating against the browser's timezone directly can produce a different date.

Both methods read the current clock when called. They do not schedule re-renders when the date or time changes.

## Signature

```typescript
const useTimeZone: () => TimeZone;
```

## Return Value

A `TimeZone` object with the following properties:

### `value`

- **Type:** `string`
- **Description:** Raw IANA timezone identifier (e.g. `"America/Los_Angeles"`). Returns the value of AppShell's `timeZone` prop when configured, or the result of `getLocalTimeZone()` (the user's local timezone) when not.

### `today()`

- **Type:** `() => CalendarDate`
- **Description:** Returns today's date in this timezone.

### `now()`

- **Type:** `() => ZonedDateTime`
- **Description:** Returns the current instant in this timezone.

## Usage

Import `Text` and `useTimeZone` from `@tailor-platform/app-shell`.

<!-- example: today-display -->

### Current timestamp

The timestamp is read when the component renders; this is not an automatically updating clock.

<!-- example: current-timestamp -->

### Accessing the raw IANA string

<!-- example: time-zone-label -->

## Related

- [AppShell](../components/app-shell.md) — configure timezone via the `timeZone` prop
- [useResolvedLocale](./use-resolved-locale.md) — access the locale for formatting
- [DatePicker](../components/date-picker.md) — date input components that consume this timezone automatically
