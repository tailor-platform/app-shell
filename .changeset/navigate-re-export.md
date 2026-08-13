---
"@tailor-platform/app-shell": minor
---

Re-export react-router's `Navigate`, so apps no longer need `react-router` as a direct dependency for declarative redirects.

```tsx
import { Navigate } from "@tailor-platform/app-shell";

if (!allowed) return <Navigate to="/dashboard" replace />;
```

See [Declarative Redirects](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/routing-navigation.md#declarative-redirects) for when to prefer the route-level `redirectTo()` guard instead.
