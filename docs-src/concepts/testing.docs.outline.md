---
kind: prose
group: testing
title: Testing
description: Test AppShell forms and pages through accessible controls, public test helpers, and application-owned mocks
---

# Testing

Test what a user can do and what your application does in response. Import controls from `@tailor-platform/app-shell` and test helpers from `@tailor-platform/app-shell/testing`.

AppShell uses Base UI internally, but consumer tests do not need Base UI imports, providers, or mocks. Accessible roles, labels, and public callbacks are the interaction boundary; nested elements, generated IDs, CSS classes, `data-slot` attributes, and hidden form inputs are not.

## Test setup

The examples use Vitest, Testing Library, and `user-event` in a DOM environment:

```sh
pnpm add -D vitest happy-dom @testing-library/react @testing-library/user-event
```

Keep your application's existing React/Vite configuration. For example, a Vitest config for a Vite React application can look like this:

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

For file-based routing, preserve `appShellRoutes()` as well: use the application's Vite config as shown in [File-based routing integration tests](#file-based-routing-integration-tests), rather than replacing its plugins with the React-only setup above.

Clean up rendered components between tests, including popup portals:

```ts
// src/test/setup.ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

Create `userEvent.setup()` inside each test and await interactions. Use `findByRole` / `findByText` for UI that appears asynchronously and `waitFor` for callback assertions, rather than fixed sleeps. The assertions below use Vitest's built-in matchers; `jest-dom` is optional.

DOM environments are useful for component behavior, but do not verify popup positioning, clipping, or actual browser focus behavior. Use browser tests for those contracts.

## Choose the smallest test wrapper

| What the component needs                                                           | What to render                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Only form controls and local state                                                 | The component itself; no `AppShell` required                           |
| Router hooks such as `useNavigate`, `useParams`, or `Link`                         | `TestRouter` from `/testing`                                           |
| AppShell configuration, `contextData`, shell features, or page/routing integration | Main-entry `AppShell` inside `AppShellTestingProvider` from `/testing` |
| Authentication hooks or an authentication guard                                    | `MemoryAuthProvider` from `/testing`                                   |

`TestRouter` supplies router context only. It does not supply AppShell configuration, theme, authentication, or command-palette state. Features requiring a data router, such as `useBlocker`, need `AppShell` inside `AppShellTestingProvider`, not `TestRouter`.

## Find form controls by role and accessible name

Use the label a user sees. Import `Field` from `@tailor-platform/app-shell`:

<!-- example: labeled-email -->

This control is found with `screen.getByRole("textbox", { name: "Email" })`:

- `Field.Label` supplies the accessible name.
- `Field.Description` and visible `Field.Error` messages are associated with the control through `aria-describedby`. Assert the text or accessible description, not the generated ID string.
- `Field.Root name="email"` identifies the submitted value and error key. It is **not** the accessible name.
- A placeholder is not a replacement for a label. Standalone controls can use an explicit linked label, `aria-label`, or `aria-labelledby`; `Checkbox` also accepts `label`.

For text inputs inside a field, use `Field.Control`. Plain `Input` does not automatically connect to `Field.Root`; give a standalone `Input` an explicit label. `Textarea`, `Select`, `Combobox`, `Autocomplete`, `Checkbox`, and date controls connect themselves: place them directly under `Field.Root`, not inside `Field.Control render={...}`. See [Form, Field, and Fieldset](../components/form.md#using-another-appshell-component-as-the-control).

| Control                                               | Query                                                          | User operation                                              |
| ----------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `Field.Control`, `Input`, `Textarea`                  | `getByRole("textbox", { name })` for text/email/textarea       | `user.clear`, then `user.type`                              |
| Password input                                        | `getByLabelText(name)` (password inputs have no implicit role) | `user.clear`, then `user.type`                              |
| `Input type="number"` / `Field.Control type="number"` | `getByRole("spinbutton", { name })`                            | `user.clear`, then `user.type`                              |
| `Select` / `Select.Async`                             | `getByRole("combobox", { name })`                              | Click the trigger, then click an `option`                   |
| `Combobox` / `Combobox.Async`                         | `getByRole("combobox", { name })`                              | Type a search query, then click an `option`                 |
| `Autocomplete` / `Autocomplete.Async`                 | `getByRole("combobox", { name })`                              | Type free text; optionally choose an `option`               |
| `Checkbox`                                            | `getByRole("checkbox", { name })`                              | `user.click`; assert checked state                          |
| `DateField` / `DatePicker`                            | Named `group`, containing `spinbutton` segments                | Scope with `within`, then enter digits with `user.keyboard` |

### Submit a form through its controls

This example tests the submitted values, not the widgets' internal storage. The form needs no AppShell wrapper:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Button, Checkbox, Combobox, Field, Form, Select } from "@tailor-platform/app-shell";

it("submits the values chosen by the user", async () => {
  const user = userEvent.setup();
  const save = vi.fn();

  render(
    <Form noValidate onFormSubmit={save}>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" required />
      </Field.Root>
      <Field.Root name="country">
        <Field.Label>Country</Field.Label>
        <Select items={["Japan", "United States"]} />
      </Field.Root>
      <Field.Root name="fruit">
        <Field.Label>Fruit</Field.Label>
        <Combobox items={["Apple", "Banana"]} />
      </Field.Root>
      <Field.Root name="updates">
        <Checkbox label="Receive updates" />
      </Field.Root>
      <Button type="submit">Save</Button>
    </Form>,
  );

  await user.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
  await user.click(screen.getByRole("combobox", { name: "Country" }));
  await user.click(await screen.findByRole("option", { name: "Japan" }));

  const fruit = screen.getByRole("combobox", { name: "Fruit" });
  await user.click(fruit);
  await user.type(fruit, "Ban");
  await user.click(await screen.findByRole("option", { name: "Banana" }));

  const updates = screen.getByRole("checkbox", { name: "Receive updates" });
  await user.click(updates);
  expect(updates.getAttribute("aria-checked")).toBe("true");
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => {
    expect(save).toHaveBeenCalledWith(
      { email: "ada@example.com", country: "Japan", fruit: "Banana", updates: true },
      expect.anything(),
    );
  });
});
```

`Select` is not a native `<select>`: do not use `user.selectOptions`. Although Select and Combobox both have the `combobox` role, only Combobox has an editable search input. Typing a Combobox query does not select a value; choose the resulting option before submitting. Autocomplete, in contrast, accepts free text.

Popup options may render in a portal outside the container returned by `render`. Use `screen.findByRole("option", ...)` rather than searching only within that container. If multiple widgets are open, scope to the relevant `listbox` with `within`.

For async controls, stub the public `fetcher` or mock your application's HTTP boundary. Wait for the resulting options, error, or retry UI; do not test the implementation's debounce duration. For controlled fields, render the real stateful form: a fixed `value` or `checked` with a spy callback does not update the UI.

### Validate through the configured trigger

Click Submit for `validationMode="onSubmit"`, tab out of the control for `"onBlur"`, or edit it for `"onChange"`. Assert the message and that invalid data was not submitted:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Button, Field, Form } from "@tailor-platform/app-shell";

it("shows an error instead of saving an empty email", async () => {
  const user = userEvent.setup();
  const save = vi.fn();

  render(
    <Form noValidate validationMode="onSubmit" onFormSubmit={save}>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" required />
        <Field.Error match="valueMissing">Email is required.</Field.Error>
      </Field.Root>
      <Button type="submit">Save</Button>
    </Form>,
  );

  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Email is required.")).toBeDefined();
  expect(screen.getByRole("textbox", { name: "Email" }).getAttribute("aria-invalid")).toBe("true");
  expect(save).not.toHaveBeenCalled();
});
```

`noValidate` disables the browser's native validation bubble; AppShell still runs field validation. Test server errors by returning an error from your application's save boundary and letting the form pass it to `Form errors`, rather than manipulating field internals.

### Segmented date inputs

Date controls are not a single native date textbox. Query their visible segments, not a hidden input:

```tsx
const date = within(screen.getByRole("group", { name: "Invoice date" }));
await user.click(date.getByRole("spinbutton", { name: "month" }));
await user.keyboard("06");
await user.click(date.getByRole("spinbutton", { name: "day" }));
await user.keyboard("15");
await user.click(date.getByRole("spinbutton", { name: "year" }));
await user.keyboard("2025");
```

Import `within` from Testing Library. This recipe assumes an English UI and a date-only control. Pin the AppShell `locale="en-US"` (or use the standalone English defaults) and the date control's formatting `locale="en-US"`; segment names are localized UI labels, not inferred from the formatting locale alone. Set `timeZone` and freeze the clock when the result depends on “today.”

For DatePicker's calendar, click its “Open calendar” button, await the `dialog`, then interact with the calendar `grid`. See [DatePicker](../components/date-picker.md) for composition and labels.

## Supply AppShell provider state without mocking internals

Import `AppShell` from the main entry and `AppShellTestingProvider` from `/testing`. The testing provider selects memory routing; it does not supply AppShell state by itself. AppShell mounts the real providers. Use its normal props for configuration and pass test doubles through `contextData`. Authentication is separate: use [`MemoryAuthProvider`](#supply-authentication-state) when the subject consumes authentication. Do not import internal contexts, mock Base UI, or replace the entire AppShell package with an empty module.

### Use a Testing Library wrapper

Compose both components in React Testing Library's `wrapper` option. This Vitest example supplies provider state without any routed pages or layout. The `AppShellRegister` declaration represents the example application's context type; in your project, reuse your existing declaration and supply fixtures matching it rather than declaring a second incompatible type.

```tsx
import type { PropsWithChildren } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AppShell, Button, useAppShellData, type AppShellProps } from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: { name: string };
      save: () => Promise<void>;
    };
  }
}

function ProfileActions() {
  const { contextData } = useAppShellData();

  return (
    <>
      <p>Signed in as {contextData.currentUser.name}</p>
      <Button onClick={() => void contextData.save()}>Save</Button>
    </>
  );
}

it("supplies test context data and a fake save function", async () => {
  const user = userEvent.setup();
  const save = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

  const initialEntries = ["/"];
  const shellProps: AppShellProps = {
    modules: [],
    locale: "en-US",
    timeZone: "UTC",
    defaultColorTheme: "light",
    contextData: { currentUser: { name: "Ada" }, save },
  };

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <AppShellTestingProvider initialEntries={initialEntries}>
        <AppShell {...shellProps}>{children}</AppShell>
      </AppShellTestingProvider>
    );
  }

  render(<ProfileActions />, { wrapper: Wrapper });

  expect(await screen.findByText("Signed in as Ada")).toBeDefined();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(save).toHaveBeenCalledOnce();
});
```

This also supplies `useAppShell()` and `useAppShellConfig()` with real provider values; you do not need to fabricate each hook's return shape. Create fresh fixtures and mocks per test. Keep the wrapper component, `initialEntries` array, and modules stable across Testing Library `rerender` calls so rerenders retain the mounted shell's memory history.

The provider requires `initialEntries: string[]`, the initial history stack — the last entry is the current location. Each mounted AppShell owns its history. Nested providers use the nearest provider's settings. Neither the provider nor the main AppShell accepts a `memory` prop; `initialEntries` belongs to the provider, not AppShell. `modules: []` is sufficient for this provider-state test.

### Pages and integration tests

Because AppShell owns the router, a page test mounts AppShell rather than building a router. Pass your typed modules to AppShell and render a layout such as `SidebarLayout`. Wrap it in `AppShellTestingProvider` to start at a known URL without touching `window.location`:

Mock only the application boundary being exercised: callbacks, clients in `contextData`, or your data library's provider. `AppShell` does not automatically mount `AuthProvider`; add [`MemoryAuthProvider`](#supply-authentication-state) around the shell when the page consumes authentication, and add your application's data wrappers separately. App-specific user and permission fixtures remain in `contextData`, not in the authentication state. See [Authentication](./authentication.md) for production setup.

```tsx
import { render, screen } from "@testing-library/react";
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";

render(
  <AppShellTestingProvider initialEntries={["/orders/A42"]}>
    <AppShell modules={modules}>
      <SidebarLayout />
    </AppShell>
  </AppShellTestingProvider>,
);

expect(await screen.findByText("Order A42")).toBeDefined();
```

Here `modules` is your test fixture with an `/orders/:id` page rendering `Order A42`. Tests use the main entry's `AppShellProps`, modules, and guards, so the `AppShellRegister` augmentation described in [useAppShell](../api/use-app-shell.md) applies without a separate testing props type.

### File-based routing integration tests

**Important: `AppShellTestingProvider` selects memory routing only. It does not discover page files or register routes.** File-based application tests must still run `appShellRoutes()` through Vite, with the same page discovery and entrypoint configuration as the application.

When `appShellRoutes({ entrypoint: "src/App.tsx" })` is configured, only the AppShell import inside `src/App.tsx` receives the discovered pages. Importing and rendering a new `AppShell` directly in a test file does not trigger that injection, even inside `AppShellTestingProvider`.

Reuse the application's Vite config so Vitest runs the same plugins. For an object-style `vite.config.ts` beside the test config:

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: import.meta.dirname,
    test: {
      environment: "happy-dom",
      setupFiles: ["./src/test/setup.ts"],
    },
  }),
);
```

Keep `root` at the application directory: the plugin resolves `entrypoint` and `pagesDir` relative to it; `pagesDir` defaults to `src/pages`, with routes discovered from `page.tsx` files. A separate `vitest.config.ts` does not automatically inherit the plugins from `vite.config.ts`.

Render the real application component from the configured entrypoint, not a replacement AppShell in the test. The test file does not need to be the entrypoint or live beside it. For example, with `src/App.tsx` as the entrypoint and a Dashboard heading in `src/pages/dashboard/page.tsx`:

```tsx
// tests/app.test.tsx
import { render, screen } from "@testing-library/react";
import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";
import { expect, it } from "vitest";
import App from "../src/App";

it("opens a file-based page without changing the browser URL", async () => {
  const before = window.location.href;

  render(
    <AppShellTestingProvider initialEntries={["/dashboard"]}>
      <App />
    </AppShellTestingProvider>,
  );

  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeDefined();
  expect(window.location.href).toBe(before);
});
```

Do not change `entrypoint` to the test file just to inject pages there. Keep the production configuration and import the configured application. For focused page tests that should not load the real page tree, use the explicit `modules` fixture in the previous example instead.

## Router-only component tests

A component that calls `useNavigate` or renders a `<Link>` needs a router above it, but mounting a whole AppShell for that is heavy. Use `TestRouter` when AppShell state is not needed:

```tsx
import { TestRouter } from "@tailor-platform/app-shell/testing";

render(
  <TestRouter initialEntries={["/orders/A42"]}>
    <SaveButton />
  </TestRouter>,
);
```

**If the component reads the route**, pass `path`. Without a matching route, `useParams()` comes back empty even when `initialEntries` holds a URL that looks like it should match:

```tsx
render(
  <TestRouter path="/orders/:id" initialEntries={["/orders/A42"]}>
    <OrderBadge /> {/* useParams() -> { id: "A42" } */}
  </TestRouter>,
);
```

Here `SaveButton` and `OrderBadge` are your components under test. The matching route also matters for `useMatch` and relative `<Link>` targets. Compose your own providers — a GraphQL client, say — around `TestRouter` as needed. `AppShellTestingProvider` does not replace `TestRouter` or `TestRouterProps`; they remain supported for focused component unit tests.

Import routing hooks and `Link` from AppShell, not from a separately installed `react-router` copy. See [Routing and Navigation](./routing-navigation.md#your-app-should-not-depend-on-react-router) for why this matters.

## Supply authentication state

Import `MemoryAuthProvider` and `createMemoryAuthClient` from `@tailor-platform/app-shell/testing`; keep importing `useAuth` and `useAuthSuspense` from the main package. The memory provider wraps the real `AuthProvider` with an in-memory client, so hooks and guards use the same context as production. It does not make sign-in requests, navigate the browser, persist a session, or provide tokens.

| Prop             | Meaning                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `initialState`   | Initial `AuthState`: all three fields (`isReady`, `isAuthenticated`, `error`) are required when supplied.    |
| `client`         | A client returned by `createMemoryAuthClient(initialState?)`, for test-controlled state changes.             |
| `guardComponent` | The real `AuthProvider` guard: rendered instead of children while not ready or not authenticated.            |
| `autoLogin`      | The real provider's auto-login behavior; omit or set to `false` when testing a persistent signed-out screen. |

Without an explicit state, the client starts with `{ isReady: true, isAuthenticated: false, error: null }`. Supply either `initialState` or `client`, never both. `initialState` is read only on mount; rerendering with a different initial state does not reset the session. Use an external client's `setState` for later changes, or remount for a fresh fixture. Each provider-owned client is independent.

### Exercise the real guard, login, and logout

No AppShell or router is needed for a subject that only consumes authentication:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { Button, useAuth } from "@tailor-platform/app-shell";
import { MemoryAuthProvider } from "@tailor-platform/app-shell/testing";

function SignInGuard() {
  const { isReady, error, login } = useAuth();

  if (!isReady) return <p>Checking session...</p>;

  return (
    <>
      <p>{error ?? "Please sign in."}</p>
      <Button onClick={() => void login()}>Sign in</Button>
    </>
  );
}

function AccountActions() {
  const { logout } = useAuth();

  return (
    <>
      <p>Account ready</p>
      <Button onClick={() => void logout()}>Sign out</Button>
    </>
  );
}

it("opens the account after sign-in and returns to the guard after sign-out", async () => {
  const user = userEvent.setup();

  render(
    <MemoryAuthProvider guardComponent={SignInGuard}>
      <AccountActions />
    </MemoryAuthProvider>,
  );

  expect(screen.getByText("Please sign in.")).toBeDefined();
  expect(screen.queryByText("Account ready")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Account ready")).toBeDefined();
  expect(screen.queryByText("Please sign in.")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Sign out" }));
  expect(await screen.findByText("Please sign in.")).toBeDefined();
  expect(screen.queryByText("Account ready")).toBeNull();
});
```

The memory client's `login()` and `logout()` simulate successful local actions. Both mark the state ready and clear its error; they publish the corresponding `login` or `logout` event followed by `auth_state_changed`. With `autoLogin`, the real provider can immediately sign in again after logout, so the example leaves it disabled.

For a page that should start signed in, use `initialState={{ isReady: true, isAuthenticated: true, error: null }}`. Nest the test `AppShell` inside this provider if the page also needs routing or shell configuration.

### Control loading, Suspense, and error fixtures

Use `createMemoryAuthClient` when the test needs to change state after rendering. `setState(next)` replaces the complete state and publishes `auth_state_changed`; it does not synthesize a `login` or `logout` action. Set `error` explicitly when testing an error message.

An initially loading client remains loading until the test publishes a ready state. The real provider calls `checkAuthStatus()` during initialization, but the memory implementation waits rather than completing that fixture automatically. `ready()` waits for the same readiness transition, so `useAuthSuspense` works without timers:

```tsx
import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { useAuthSuspense } from "@tailor-platform/app-shell";
import { createMemoryAuthClient, MemoryAuthProvider } from "@tailor-platform/app-shell/testing";

function AccountStatus() {
  const { isAuthenticated } = useAuthSuspense();
  return <p>{isAuthenticated ? "Account ready" : "Please sign in."}</p>;
}

it("keeps the Suspense fallback until authentication is ready", async () => {
  const auth = createMemoryAuthClient({
    isReady: false,
    isAuthenticated: false,
    error: null,
  });

  render(
    <MemoryAuthProvider client={auth}>
      <Suspense fallback={<p>Checking session...</p>}>
        <AccountStatus />
      </Suspense>
    </MemoryAuthProvider>,
  );

  expect(screen.getByText("Checking session...")).toBeDefined();

  await act(async () => {
    auth.setState({ isReady: true, isAuthenticated: true, error: null });
  });

  expect(await screen.findByText("Account ready")).toBeDefined();
  expect(screen.queryByText("Checking session...")).toBeNull();
});
```

Use an external client for a loading fixture that must later complete; an `initialState` alone gives the test no client handle to publish readiness. `checkAuthStatus()` returns the memory state once ready, without a network request. To assert a login argument or simulate an application-specific rejection, spy on the external client's public method instead of mocking authentication hooks.

### Keep OAuth and data transport outside the memory fixture

The client is compatible with `AuthProvider`'s client type, but it is not a full OAuth client. `getAuthUrl`, `handleCallback`, `refreshTokens`, `configure`, `getAuthHeaders`, `fetch`, and `getAppUri` fail explicitly as unsupported. Add your data library's provider and mock its application boundary separately; do not use the memory client as an authenticated HTTP transport.

A memory login accepts `returnTo` but does not navigate or validate an OAuth return path. The real provider still derives the default `returnTo` from `window.location`, not from the test AppShell's memory route. These tests do not prove deep-link preservation, token refresh, callback handling, or persisted sessions. Keep those contracts in browser/integration tests against the appropriate production authentication boundary.
