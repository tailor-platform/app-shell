---
"@tailor-platform/app-shell": patch
---

Use a two-click range calendar with highlighted dates for date and datetime "between" filters in the Add filter panel.
Remove redundant From/To date summaries while keeping separate start/end time inputs, timezone conversion, and reversed-range validation.
Preserve unchanged datetime bounds' seconds and fractions, block applying unfinished selections, and reset drafts on Clear all. Add `RangeCalendar.onSelectionStateChange` events for selection start, completed ranges, and cancellation.
