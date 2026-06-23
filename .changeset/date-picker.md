---
"@tailor-platform/app-shell": minor
---

Add DateField, DatePicker, and Calendar components (@internationalized/date + Base UI implementation)

Introduces three accessible date-input components, implemented on `@internationalized/date` (value layer) and Base UI (`Popover`) with hand-rolled segmented-input and calendar-grid behaviour:

- `DateField` — segmented date/time input with label, description, and error message
- `DatePicker` — date field with a popover calendar
- `Calendar` — standalone calendar grid

All three accept `LocalizedString` labels/descriptions and resolve locale + timezone from the AppShell context. The `@internationalized/date` value types (`CalendarDate`, `CalendarDateTime`, `ZonedDateTime`, …) and helpers (`today`, `parseDate`, `getLocalTimeZone`, …) are re-exported from `@tailor-platform/app-shell`.

New AppShell context hooks:

- `useResolvedLocale()` — full BCP-47 locale (e.g. `"en-GB"`) plus the language code
- `useTimeZone()` — the configured IANA timezone, falling back to the user's local timezone

AppShell now accepts an optional `timeZone` prop.

> This is the **`@internationalized/date` + Base UI** variant — the lighter foundation tracked in the design proposal (§9). Net-new dependency is just `@internationalized/date` (~11 KB gz); Base UI is already in the bundle. Public API and accessibility contract are identical to the react-aria variant.
