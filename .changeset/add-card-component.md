---
"@tailor-platform/app-shell": minor
---

Add `Card` compound component (`Card.Root`, `Card.Header`, `Card.Content`) as a general-purpose container with consistent styling. Existing card-style components (`DescriptionCard`, `MetricCard`, `ActionPanel`) now use `Card` internally.

```tsx
import { Card } from "@tailor-platform/app-shell";

<Card.Root>
  <Card.Header title="Order Details" description="Summary of order #1234" />
  <Card.Content>
    <p>Content goes here</p>
  </Card.Content>
</Card.Root>;
```
