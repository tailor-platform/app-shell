---
"@tailor-platform/app-shell": minor
---

Add a reusable `Spinner` component and use it for built-in loading indicators such as `ActionPanel`, command palette search, and CSV import progress. Size it with the `size` prop (`xs`, `sm`, `default`, `lg`).

```tsx
import { Spinner } from "@tailor-platform/app-shell";

<Spinner size="xs" aria-label="Loading" />;
```
