---
"@tailor-platform/app-shell": patch
---

Fix `DataTable.Filters` datetime values to serialize as RFC 3339 instants and display existing instants in the configured timezone (or the user's local timezone when unset).

Document that apps should set `AppShell.timeZone` for shared business-day filtering; `locale` does not determine the timezone. Clarify date-only versus datetime fields and the handling of programmatic and persisted filter values.
