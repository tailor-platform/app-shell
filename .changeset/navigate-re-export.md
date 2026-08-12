---
"@tailor-platform/app-shell": minor
---

Re-export react-router's `Navigate` component for declarative redirects, so apps no longer need `react-router` as a direct dependency to redirect from a component's render.

```tsx
import { Navigate, useAppShellData } from "@tailor-platform/app-shell";

const AdminPage = () => {
  const { currentUser } = useAppShellData();

  if (currentUser?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminDashboard />;
};
```

Importing `Navigate` from `react-router` directly risks resolving a second react-router instance, which reads a different router context and throws `useNavigate() may be used only in the context of a <Router>` at runtime. Prefer the route-level `redirectTo()` guard where the decision does not depend on component state.
