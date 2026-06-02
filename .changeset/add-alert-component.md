---
"@tailor-platform/app-shell": minor
---

Add `Alert` component with `default`, `success`, `error`, and `neutral` variants. Each variant renders a contextual icon automatically.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@tailor-platform/app-shell";

<Alert variant="success">
  <AlertTitle>Saved</AlertTitle>
  <AlertDescription>Your changes have been saved.</AlertDescription>
</Alert>;
```
