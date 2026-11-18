---
"@tailor-platform/app-shell": patch
---

Correct the DatePicker documentation and migration examples to use `useTimeZone().today()` instead of a standalone `today` import.
Keep date constraints aligned with AppShell's configured timezone, and clarify how to obtain the current date and time without adding public exports.
