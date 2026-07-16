---
"@tailor-platform/app-shell": patch
---

Fix `DateField` / `DatePicker` not validating typed input against `minValue`, `maxValue`, or `isDateUnavailable`. A date entered by typing (or via a keyboard shortcut) that fell outside the allowed range was silently accepted. It's now flagged invalid (`aria-invalid` + a built-in message) while the value still flows through `onChange` — matching how the calendar already behaves and the react-aria validation contract.

- Keyboard shortcuts (`t`, `m`, `y`, …) no longer clamp their target to the boundary; like typing, an out-of-range result is surfaced as invalid instead of being silently coerced.
- `isDateUnavailable` now also drives field validation (e.g. weekends or specific blackout dates typed into the field are flagged), not just calendar selection.
- Consumer `errorMessage` still takes precedence over the built-in messages.
