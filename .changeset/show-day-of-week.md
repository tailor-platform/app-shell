---
"@tailor-platform/app-shell": minor
---

Add `showDayOfWeek` to `DateField`, `DatePicker`, and `DateRangePicker`. It appends the locale's short day of the week where the locale places it (`2025/12/19(金)`, `Fri, 12/19/2025`). It is read-only and derived from the entered date. While a date segment is mid-entry it keeps showing the previous day of the week, so typing `25` never flashes the 2nd's. Screen readers hear the full day name with each date segment's value.

```tsx
<DatePicker aria-label="Closing date" showDayOfWeek />
```
