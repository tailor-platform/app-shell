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

| What the component needs                                                           | What to render                               |
| ---------------------------------------------------------------------------------- | -------------------------------------------- |
| Only form controls and local state                                                 | The component itself; no `AppShell` required |
| Router hooks such as `useNavigate`, `useParams`, or `Link`                         | `TestRouter` from `/testing`                 |
| AppShell configuration, `contextData`, shell features, or page/routing integration | `AppShell` from `/testing`, with `memory`    |

`TestRouter` supplies router context only. It does not supply AppShell configuration, theme, authentication, or command-palette state. Features requiring a data router, such as `useBlocker`, need the test `AppShell`, not `TestRouter`.

## Find form controls by role and accessible name

Use the label a user sees:

```tsx
<Field.Root name="email">
  <Field.Label>Email</Field.Label>
  <Field.Control type="email" />
  <Field.Description>Used for order updates.</Field.Description>
</Field.Root>
```

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

There is no separate public mock-provider API. The `AppShell` from `/testing` mounts the real providers and additionally accepts `memory` and `initialEntries`. Use its normal props for configuration and pass test doubles through `contextData`. Do not import internal contexts, mock Base UI, or replace the entire AppShell package with an empty module.

Here is a complete provider-state test. It needs no routes or layout. The `AppShellRegister` declaration represents the example application's context type; in your project, reuse your existing declaration and supply fixtures matching it rather than declaring a second incompatible type.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { Button, useAppShellData } from "@tailor-platform/app-shell";

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

  render(
    <AppShell
      memory
      initialEntries={["/"]}
      modules={[]}
      locale="en-US"
      timeZone="UTC"
      defaultColorTheme="light"
      contextData={{ currentUser: { name: "Ada" }, save }}
    >
      <ProfileActions />
    </AppShell>,
  );

  expect(await screen.findByText("Signed in as Ada")).toBeDefined();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(save).toHaveBeenCalledOnce();
});
```

This also supplies `useAppShell()` and `useAppShellConfig()` with real provider values; you do not need to fabricate each hook's return shape. Always supply `initialEntries` when using `memory`. For a routed page, define test modules and render a layout such as `SidebarLayout`; see the [page integration example](./routing-navigation.md#pages-and-integration-tests).

**Typed-route limitation:** Currently the published `/testing` declarations do not share the main entry's `AppShellRegister` augmentation in every route type. If passing typed modules produces an incompatible `GuardContext.context` error, that is a declaration limitation, not a missing provider. The `modules={[]}` provider fixture above avoids it; do not import internal contexts or cast your modules to `any` to hide the error.

Memory routing does not change `window.location`; assert rendered pages or the location from AppShell's `useLocation` instead. The production `AppShell` does **not** accept memory routing. Even with file-based routing in your app, supply explicit test modules rather than calling the internal `AppShell.WithPages` helper.

Mock only the application boundary being exercised: callbacks, clients in `contextData`, or your data library's provider. AppShell does not include `AuthProvider`; add your application's authentication/data wrappers if the page consumes them. An authentication-provider integration test should use a fake auth client, not make a real sign-in request. See [Authentication](./authentication.md).

Set locale/timezone explicitly when assertions depend on them. A stored theme preference takes precedence over `defaultColorTheme`; isolate or clear test-owned storage in theme tests. Clean up rendered providers and restore spies/fake timers between tests.

### Router-only component tests

Use `TestRouter` when AppShell state is not needed:

```tsx
import { TestRouter } from "@tailor-platform/app-shell/testing";

render(
  <TestRouter path="/orders/:id" initialEntries={["/orders/A42"]}>
    <OrderBadge />
  </TestRouter>,
);
```

Here `OrderBadge` is your component under test. Pass `path` when it reads route parameters or needs route-relative matching/navigation; without a matching route, `useParams()` is empty. Import routing hooks and `Link` from AppShell, not from a separately installed `react-router` copy. See [Routing and Navigation](./routing-navigation.md#testing) for the helper contracts.
