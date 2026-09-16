---
"@tailor-platform/app-shell": minor
---

Add a reusable `Spinner` component and use it for built-in loading indicators such as `ActionPanel`, command palette search, and CSV import progress.

```tsx
import { Spinner } from "@tailor-platform/app-shell";

<Spinner className="astw:size-3" aria-label="Loading" />;
```
