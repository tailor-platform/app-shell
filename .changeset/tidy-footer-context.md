---
"@tailor-platform/app-shell": patch
---

Expose `FooterRenderContext<TRow>` for column footer renderers, matching the named `HeaderRenderContext` API. The context still contains the current page's read-only `rows`; existing callbacks remain compatible.

```tsx
import type { FooterRenderContext } from "@tailor-platform/app-shell";

type Line = { quantity: number };
const renderTotal = ({ rows }: FooterRenderContext<Line>) =>
  rows.reduce((sum, row) => sum + row.quantity, 0);
```
