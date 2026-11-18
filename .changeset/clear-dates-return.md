---
"@tailor-platform/app-shell": patch
---

Fix the missing `today` re-export so consumers can obtain today's date directly from AppShell as documented, without installing another date package.

```tsx
import { getLocalTimeZone, today } from "@tailor-platform/app-shell";

const minimumDate = today(getLocalTimeZone());
```
