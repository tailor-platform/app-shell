---
"@tailor-platform/app-shell": minor
---

Add `DateRangePicker` and `RangeCalendar` components with a `{ start, end }` range value (exported as `DateRange`). Selection follows the react-aria model: the first calendar pick anchors the range and keeps the popover open, the highlight live-extends to the hovered/focused day, and the second pick completes it — picking backwards swaps the endpoints, while a range typed in reverse is flagged invalid instead of swapped.

Like `DateField` / `DatePicker`, they are standalone composite controls that also compose inside `Field.Root` (label / description / error / form validation). A single combined proxy input is registered as the one Field control (empty until both ends are complete, so `isRequired` blocks a partial range); `name` gives that combined input a name for native POST (`start/end`, with a wrapping `Field.Root` name taking precedence), while `startName` / `endName` emit two plain hidden inputs for classic form POST.

```tsx
import { DateRangePicker, Field, type DateRange } from "@tailor-platform/app-shell";

const [range, setRange] = useState<DateRange | null>(null);

// standalone
<DateRangePicker aria-label="Billing period" value={range} onChange={setRange} />;

// composed
<Field.Root name="period">
  <Field.Label>Billing period</Field.Label>
  <DateRangePicker />
  <Field.Error match="customError" />
</Field.Root>;
```
