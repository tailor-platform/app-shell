---
"@tailor-platform/app-shell": patch
---

Clarify date filter labels in operator lists and filter chips: English uses "on or after" / "on or before", and Japanese uses "以降（当日を含む）" / "以前（当日を含む）".
Both locales now explicitly state that `gte` / `lte` include the selected date; filter semantics are unchanged.
