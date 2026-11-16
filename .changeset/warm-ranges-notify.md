---
"@tailor-platform/app-shell": minor
---

Add the optional `RangeCalendar.onSelectionStateChange` callback with `selection-start`, `range-complete`, and `selection-cancel` events.
Only `range-complete` carries the selected `DateRange`; the existing `onChange` callback remains unchanged.
Export `RangeCalendarSelectionEvent` for explicitly typed selection event handlers.

```tsx
import { RangeCalendar } from "@tailor-platform/app-shell";

<RangeCalendar
  aria-label="Date range"
  onSelectionStateChange={(event) => {
    if (event.type === "range-complete") {
      console.log(event.value);
    }
  }}
/>;
```
