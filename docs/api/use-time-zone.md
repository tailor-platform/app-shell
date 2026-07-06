---
title: useTimeZone
description: Hook to access the configured IANA timezone from AppShell context
---

# useTimeZone

React hook that returns the IANA timezone string configured on `AppShell` (e.g. `"America/Los_Angeles"`). Falls back to the user's local timezone when no timezone is configured.

Date/time components (`DateField`, `DatePicker`, `Calendar`) consume this hook automatically — use it when you need the same timezone in custom components.

## Signature

```typescript
const useTimeZone: () => string;
```

## Return Value

- **Type:** `string`
- **Description:** IANA timezone identifier. Returns the value of AppShell's `timeZone` prop when configured, or the result of `getLocalTimeZone()` (the user's local timezone) when not.

## Usage

```typescript
import { useTimeZone, today } from "@tailor-platform/app-shell";

function TodayDisplay() {
  const timeZone = useTimeZone();
  const todayDate = today(timeZone);

  return <span>Today: {todayDate.toString()}</span>;
}
```

### Passing timezone to date helpers

```typescript
import { useTimeZone, now, getLocalTimeZone } from "@tailor-platform/app-shell";

function CurrentTimestamp() {
  const timeZone = useTimeZone();

  return <span>{now(timeZone).toString()}</span>;
}
```

## Related

- [AppShell](../components/app-shell.md) — configure timezone via the `timeZone` prop
- [useResolvedLocale](./use-resolved-locale.md) — access the locale for formatting
- [DatePicker](../components/date-picker.md) — date input components that consume this timezone automatically
