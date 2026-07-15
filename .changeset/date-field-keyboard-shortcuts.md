---
"@tailor-platform/app-shell": minor
---

Add QuickBooks-style keyboard shortcuts to `DateField` / `DatePicker`

When any date segment is focused, the field now supports whole-date navigation (all case-insensitive):

- `t` — today
- `m` / `h` — first / last day of the entered month (or the current month when no date is entered)
- `y` / `r` — first / last day of the entered year
- `w` / `k` — first / last day of the week (locale-aware week start)
- `-` — previous day; `=` / `+` — next day. Both step across month **and** year boundaries (e.g. 1 Jan − 1 day → 31 Dec of the prior year). `+` works whether or not Shift is held.
- `/` — commit the current segment as-is and advance to the next (e.g. typing `1` then `/` means "January", not the start of `1x`)
- `Alt+↓` — open the calendar popover (`DatePicker` only)

A 1–2 digit year is also expanded to the 2000s on blur (`26` → `2026`).

Both `DateField` and `DatePicker` now accept an optional `firstDayOfWeek` prop to override the locale's week start for the `w`/`k` shortcuts (previously `DatePicker`-only).

The shortcuts also work **while the calendar popover is open** — there they move the highlighted day (like the arrow keys), and `Enter` confirms. Targets are clamped to `minValue`/`maxValue` in both the field and the calendar, so a shortcut can't jump to an out-of-range date; unavailable days can be highlighted but not confirmed.
