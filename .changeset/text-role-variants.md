---
"@tailor-platform/app-shell": minor
---

Add the `Text` component. It applies a typography role with the `variant` prop and does not set a color. Heading roles render `h2`, body roles render `p`, and label and code roles render `span`. Use the `render` prop to choose a different element, such as the heading level.

```tsx
import { Text } from "@tailor-platform/app-shell";

<Text variant="heading-md" render={<h3 />}>Line items</Text>
<Text variant="body-md" className="text-muted-foreground">Orders sent this month.</Text>
```
