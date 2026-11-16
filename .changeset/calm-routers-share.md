---
"@tailor-platform/app-shell": minor
---

Add `AppShellTestingProvider` so tests can use the main entry's `AppShell` and `AppShellProps`, keeping module definitions, guards, and `AppShellRegister` augmentation on the same public types.
The provider requires `initialEntries: string[]` and selects memory routing for enclosed AppShells, including shells pre-configured through `AppShell.WithPages()`. Without it, the main AppShell uses browser routing.
Keep the existing `/testing` exports `AppShell` and `TestAppShellProps` available with `@deprecated` annotations. Existing tests remain supported; prefer this provider-based setup for new page and integration tests. `TestRouter` and `TestRouterProps` are unchanged and remain supported for focused component unit tests.

Before:

```tsx
import { AppShell } from "@tailor-platform/app-shell/testing";

render(<AppShell memory initialEntries={["/orders/A42"]} modules={modules} />);
```

Recommended:

```tsx
import { AppShell } from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

render(
  <AppShellTestingProvider initialEntries={["/orders/A42"]}>
    <AppShell modules={modules} />
  </AppShellTestingProvider>,
);
```

When migrating, replace `TestAppShellProps` imports with `AppShellProps` from the main entry and move `initialEntries` into the provider. Remove the `memory` prop; neither the main AppShell nor the provider accepts it. The deprecated testing AppShell continues to accept its existing routing props.
