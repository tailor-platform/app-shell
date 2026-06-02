---
"@tailor-platform/app-shell": minor
---

Add `Alert` compound component with `default`, `success`, `error`, and `neutral` variants. Each variant renders a contextual icon automatically.

```tsx
import { Alert } from "@tailor-platform/app-shell";

<Alert.Root variant="success">
  <Alert.Title>Saved</Alert.Title>
  <Alert.Description>Your changes have been saved.</Alert.Description>
</Alert.Root>;
```
