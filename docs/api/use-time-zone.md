---
title: useTimeZone
description: Hook to access the configured IANA timezone from AppShell context
---

# useTimeZone

React hook that returns a `TimeZone` object for the timezone configured on `AppShell`. Falls back to the user's local timezone when no timezone is configured.

Date/time components (`DateField`, `DatePicker`, `Calendar`) consume this hook automatically — use it when you need the same timezone in custom components.

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

```typescript
import { useTimeZone } from "@tailor-platform/app-shell";

function TodayDisplay() {
  const timeZone = useTimeZone();
  const todayDate = timeZone.today();

  return <span>Today: {todayDate.toString()}</span>;
}
```

### Current timestamp

```typescript
import { useTimeZone } from "@tailor-platform/app-shell";

function CurrentTimestamp() {
  const timeZone = useTimeZone();

  return <span>{timeZone.now().toString()}</span>;
}
```

### Accessing the raw IANA string

```typescript
import { useTimeZone } from "@tailor-platform/app-shell";

function TimeZoneLabel() {
  const { value } = useTimeZone();

  return <span>Timezone: {value}</span>;
}
```

## Related

- [AppShell](../components/app-shell.md) — configure timezone via the `timeZone` prop
- [useResolvedLocale](./use-resolved-locale.md) — access the locale for formatting
- [DatePicker](../components/date-picker.md) — date input components that consume this timezone automatically
