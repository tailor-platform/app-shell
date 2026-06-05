---
"@tailor-platform/app-shell": minor
---

Add `Alert` compound component with `neutral`, `success`, `warning`, `error`, and `info` variants. Each variant renders a contextual icon automatically.

```tsx
import { Alert } from "@tailor-platform/app-shell";

<Alert.Root variant="success">
  <Alert.Title>Saved</Alert.Title>
  <Alert.Description>Your changes have been saved.</Alert.Description>
</Alert.Root>;
```
