---
"@tailor-platform/app-shell": patch
---

`DatePicker` and `DateRangePicker` now open their calendar on the current field value. Previously a date typed into the segments (or set from outside while closed) was ignored, so the popover opened on today's month — or on whatever month was last viewed — and arrow-key + Enter selected relative to that. The calendar now focuses the selected/typed date on every open (the range start, else a typed end), falling back to today when empty.
