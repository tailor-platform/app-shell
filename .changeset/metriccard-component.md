---
"@tailor-platform/app-shell": minor
---

Add `MetricCard` component for dashboard KPI summaries (label, value, optional trend and comparison).

```tsx
import { MetricCard } from "@tailor-platform/app-shell";

<MetricCard
  label="Net total payment"
  value="$1,500.00"
  trend={{ direction: "up", value: "+5%" }}
  comparison="vs last month"
/>
```
