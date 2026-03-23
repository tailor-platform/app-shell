---
"@tailor-platform/app-shell": minor
---

Add `MetricCard` component for dashboard KPI summaries (title, value, optional trend and description).

```tsx
import { MetricCard } from "@tailor-platform/app-shell";

<MetricCard
  title="Net total payment"
  value="$1,500.00"
  trend={{ direction: "up", value: "+5%" }}
  description="vs last month"
/>;
```
