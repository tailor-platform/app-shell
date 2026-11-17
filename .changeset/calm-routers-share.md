---
"@tailor-platform/app-shell": minor
---

Add `AppShellTestingProvider` for memory-routing tests of applications using the recommended file-based routing API. Render the existing application, with its pages configured by the Vite plugin, inside the provider instead of rebuilding its route tree as test modules.
The provider requires `initialEntries: string[]`, leaves the browser URL unchanged, and lets tests use the application's main-entry `AppShell`, `AppShellProps`, and `AppShellRegister` augmentation.

For example, when `src/App.tsx` is the configured entrypoint:

```tsx
import { render } from "@testing-library/react";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";
import App from "../src/App";

render(
  <AppShellTestingProvider initialEntries={["/dashboard"]}>
    <App />
  </AppShellTestingProvider>,
);
```

Keep `appShellRoutes()` active in Vitest by reusing the application's Vite config, with `root`, `pagesDir`, and `entrypoint` pointing to the same application files. The provider selects memory routing only; it does not discover or register pages. With `entrypoint: "src/App.tsx"`, importing a new `AppShell` directly in a test file does not inject the application's pages. See the [Testing guide](https://github.com/tailor-platform/app-shell/blob/main/docs/concepts/testing.md#file-based-routing-integration-tests) for the full setup.

For new application tests, prefer the provider-based setup above. When migrating tests that construct AppShell props, use `AppShellProps` from the main entry, move `initialEntries` into the provider, and remove `memory` from AppShell. `TestRouter` and `TestRouterProps` are unchanged and remain supported for focused component unit tests.

`AppShell` and `TestAppShellProps` from `@tailor-platform/app-shell/testing` are now deprecated but remain available for compatibility.
