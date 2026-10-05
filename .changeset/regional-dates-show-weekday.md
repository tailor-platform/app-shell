---
"@tailor-platform/app-shell": minor
---

Add `dateFormat` and `showWeekday` to `DateField`, `DatePicker`, and `DateRangePicker`, plus an app-wide default on `AppShell` via `dateInputDateFormat`.

- `dateFormat="regional"` lays the segments out in the locale's written business form wherever that form keeps the month numeric — `2025年12月19日` for ja / zh, `2025년 12월 19일` for ko. Locales whose written form spells the month as a word (en, de, fr, …) stay numeric, so a single app-wide setting is safe for multi-locale apps. The default remains `"numeric"`, so existing screens are unchanged. The default is planned to become `"regional"` in a future major release; set `"numeric"` explicitly to keep the numeric layout across that upgrade.
- `showWeekday` appends the locale's short weekday (`2025年12月19日(金)`, `Fri, 12/19/2025`). It is read-only, derived from the entered date, holds the previous weekday while a date segment is mid-entry (so typing `25` never flashes the 2nd's), and is announced to screen readers with each date segment's value.

```tsx
<AppShell dateInputDateFormat="regional" modules={modules} />

<DatePicker aria-label="Closing date" showWeekday />
```
