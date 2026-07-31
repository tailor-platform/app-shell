---
"@tailor-platform/app-shell": major
---

Upgrade AppShell to React Router v8 and raise the minimum supported `react` / `react-dom` version to `19.2.7`.

If your app uses router primitives alongside AppShell, import them from `@tailor-platform/app-shell` so they share the same router context.

Before:

```tsx
import { Link, useNavigate } from "react-router";
```

After:

```tsx
import { Link, useNavigate } from "@tailor-platform/app-shell";
```
