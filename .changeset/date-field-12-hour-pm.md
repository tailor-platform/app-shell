---
"@tailor-platform/app-shell": patch
---

Fix 12-hour time display in `DateField`, `DatePicker` and `DateRangePicker`. With `granularity` set to `hour`, `minute` or `second` and a 12-hour cycle (`hourCycle={12}`, or a 12-hour locale such as `en-US`), afternoon values showed as e.g. "18:00 AM", and editing any segment saved them 12 hours early (06:xx). PM values now show as "06:00 PM", midnight and noon as 12 AM / 12 PM, and edits keep the correct hour. Changing `hourCycle` (or a locale change that flips the default cycle) on a mounted field now re-encodes the time segments instead of misreading them. Refs tailor-inc/platform-planning#2039.
