---
title: Routing and Navigation
description: Learn how to navigate between pages using React Router hooks and components re-exported from AppShell
---

# Routing and Navigation

AppShell owns the router. It builds the route tree from your modules and resources, constructs the router, and renders the `RouterProvider` itself. Your pages render _inside_ that router.

## Your app should not depend on `react-router`

**Do not add `react-router` to your application's dependencies.** Import everything you need for routing from `@tailor-platform/app-shell` instead.

This is not a style preference — it is what keeps your app working:

```tsx
// ✅ Do this
import { useNavigate, Link } from "@tailor-platform/app-shell";

// ❌ Not this
import { useNavigate, Link } from "react-router";
```

React Router keeps its state in React context, and context identity belongs to a _module instance_. If your app resolves its own copy of `react-router` — a different version to the one AppShell resolved — the bundle ends up with two copies and therefore two unrelated routers. AppShell's own navigation keeps working, so the app looks fine at a glance, while every hook and component you imported yourself throws:

```
useNavigate() may be used only in the context of a <Router> component.
```

TypeScript cannot see this, so the build passes and the failure only appears at runtime. Under pnpm, an app that has not declared `react-router` cannot import it at all, which is the intended outcome: the rule enforces itself.

If you already have a direct dependency, the fix is to delete it and change the import paths. The APIs are identical — they are the same functions, re-exported.

## What AppShell gives you

Everything you need to _consume_ the router AppShell created:

**Location and route matching**

- `useLocation` — the current location object
- `useParams` — dynamic route parameters
- `useSearchParams` — read and update the query string
- `useMatch` — test whether a path matches the current location
- `useResolvedPath` — resolve a relative path against the current route

**Navigating**

- `useNavigate` — navigate programmatically
- `useNavigation` — the in-flight navigation, for pending UI
- `Link` — a client-side link
- `NavLink` — a link that knows when it is active, for nav menus
- `Navigate` — redirect declaratively during render

**Guarding unsaved work**

- `useBlocker` — intercept an in-app navigation away from unsaved changes
- `useBeforeUnload` — the same for closing or reloading the tab

**Errors**

- `useRouteError` — read the error inside an error boundary

Types come with them: `Location`, `NavigateFunction`, `NavigateOptions`, `To`, `Params`, `PathMatch`, `LinkProps`, `NavLinkProps`, `Navigation`, `Blocker`, and `BlockerFunction`.

### What it deliberately does not give you

**Router construction** — `createBrowserRouter`, `RouterProvider`, `BrowserRouter`, `MemoryRouter`, `Routes`, `Route`. AppShell builds the router from your modules and resources; a second one nested inside it is the bug this page is about. To control routing in tests, use the [`/testing` entry point](#testing) rather than building your own router.

**Data-router APIs** — `useLoaderData`, `Form`, `useSubmit`, `useFetcher`, `useActionData`, `useRevalidator`. AppShell does not wire up React Router's data layer, so these have nothing to talk to. Load data in the page component or your own data layer. (AppShell exports its own `Form`, which is part of the [form system](../components/form.md) and unrelated to React Router's.)

Missing something you need? Ask for it to be added here rather than adding a direct `react-router` dependency — that is the trade this rule makes, and requests are the mechanism that keeps it honest.

### One caveat

A third-party library that itself depends on `react-router` can still pull in a second copy. That is rare, and outside what AppShell can control. If routing starts throwing the error above, look for a duplicate — under pnpm, `pnpm why react-router`.

## Testing

Test helpers live in a separate entry point, `@tailor-platform/app-shell/testing`. Memory routing is kept out of the main entry because an app that shipped it would render correctly while the URL bar silently stopped tracking navigation — the `AppShell` you import from `@tailor-platform/app-shell` always uses browser routing, and pins it off regardless of what you pass.

### Pages and integration tests

Because AppShell owns the router, a test mounts AppShell rather than building a router. The `AppShell` exported from `/testing` is the same shell, and additionally accepts `memory` with `initialEntries` so it starts at a known URL without touching `window.location`:

```tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { SidebarLayout } from "@tailor-platform/app-shell";

render(
  <AppShell memory initialEntries={["/orders/A42"]} modules={modules}>
    <SidebarLayout />
  </AppShell>,
);

expect(await screen.findByText("Order A42")).toBeDefined();
```

`initialEntries` is the history stack to start with — the last entry is the current location. Each render owns its history, so tests do not leak navigation state into one another.

### Unit tests

A component that calls `useNavigate` or renders a `<Link>` needs a router above it, but mounting a whole AppShell for that is heavy. `TestRouter` provides just the router context:

```tsx
import { TestRouter } from "@tailor-platform/app-shell/testing";

render(
  <TestRouter initialEntries={["/orders/A42"]}>
    <SaveButton />
  </TestRouter>,
);
```

**If the component reads the route**, pass `path`. A router on its own matches nothing, so `useParams()` comes back empty even when `initialEntries` holds a URL that looks like it should match:

```tsx
render(
  <TestRouter path="/orders/:id" initialEntries={["/orders/A42"]}>
    <OrderBadge /> {/* useParams() -> { id: "A42" } */}
  </TestRouter>,
);
```

The same applies to `useMatch` and to relative `<Link>` targets. Compose your own providers — a GraphQL client, say — around `TestRouter` as needed.

Reach for `TestRouter` when the component under test is the subject; mount `AppShell memory` when the routing itself is.

## Example

```tsx
import { useNavigate, useParams, useLocation, Link } from "@tailor-platform/app-shell";

const MyComponent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const handleClick = () => {
    // Navigate programmatically
    navigate("/dashboard/overview");
  };

  return (
    <div>
      <p>Current path: {location.pathname}</p>
      <p>Route param ID: {id}</p>

      {/* Client-side link */}
      <Link to="/products">View Products</Link>

      <button onClick={handleClick}>Go to Dashboard</button>
    </div>
  );
};
```

## Declarative Redirects

`Navigate` redirects as a render result, which avoids the `useEffect` + `navigate()` pattern (that pattern renders the old page for a frame before it redirects):

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

Pass `replace` when the redirect should not leave the abandoned route in history — otherwise the browser Back button lands the user right back on it, and bounces them forward again.

### Choosing between `Navigate` and `redirectTo()`

Both redirect, but they run at different points:

|                                                | Runs                                     | Use for                                                                                            |
| ---------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`redirectTo()`](../api/guards/redirect-to.md) | Route guard, before the component mounts | Route-level access control — the preferred option when the decision can be made from guard context |
| `Navigate`                                     | During render, from inside a component   | Decisions that depend on component state, hooks, or fetched data                                   |

Reach for `redirectTo()` first: it never mounts the component. `Navigate` is the fallback for cases a guard cannot express — notably [`WithGuard`](../components/with-guard.md), which does not support `redirectTo()`.

## Breadcrumbs

AppShell automatically generates breadcrumbs from your module and resource hierarchy. Each path segment corresponds to a breadcrumb item, using the `title` (or `meta.breadcrumbTitle`) defined in `defineModule` / `defineResource`.

### Static Breadcrumb Titles

Set a fixed breadcrumb title via `meta.breadcrumbTitle`:

```tsx
defineResource({
  path: ":id",
  meta: {
    breadcrumbTitle: (segment) => `Order #${segment}`,
  },
  component: OrderDetailPage,
});
// Breadcrumb shows: "Orders > Order #12345"
```

### Dynamic Breadcrumb Titles

Use the `useOverrideBreadcrumb` hook to replace a breadcrumb segment with a data-driven value from within the rendered page component:

```tsx
import { useOverrideBreadcrumb } from "@tailor-platform/app-shell";

defineResource({
  path: ":id",
  component: () => {
    const { data } = useQuery(GET_ORDER, { variables: { id } });

    // Breadcrumb updates reactively once data loads
    useOverrideBreadcrumb(data?.order?.name);

    return <OrderDetail />;
  },
});
```

While `title` is `undefined` (e.g., loading), the override is cleared and the static title is shown. The override is automatically cleaned up on unmount.

See [useOverrideBreadcrumb](../api/use-override-breadcrumb.md) for the full API reference.

## Command Palette for Quick Navigation

AppShell includes a `CommandPalette` component that provides keyboard-driven quick navigation to any page in your application.

### Features

- **Keyboard Shortcut**: `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **Fuzzy Search**: Search by page title or path
- **Hierarchical Display**: Shows module > resource breadcrumbs
- **Keyboard Navigation**: Use arrow keys and Enter to navigate
- **Multilingual**: Supports English and Japanese locales

### Setup

The CommandPalette is built into `AppShell` and rendered automatically:

```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => (
  <AppShell modules={modules} locale="en">
    <SidebarLayout />
  </AppShell>
);
```

The CommandPalette automatically:

- Collects all navigable routes from your module definitions
- Respects guards (modules/resources returning `hidden()` won't appear)
- Updates when navigation items change
- Adapts to the current locale

### User Experience

1. User presses `Cmd+K` / `Ctrl+K` anywhere in the app
2. Command palette dialog opens with fuzzy search
3. User types to filter pages (e.g., "order detail")
4. Navigate results with arrow keys
5. Press Enter to navigate to selected page

No configuration needed - it just works!

## Type-Safe Navigation with Generated Routes

When using file-based routing with the vite-plugin, you can enable automatic generation of type-safe route helpers. This provides compile-time checking for route paths and their parameters.

### Setup

Enable `generateTypedRoutes` in your vite config:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    appShellRoutes({
      pagesDir: "src/pages",
      // Enable with default output path ("src/routes.generated.ts")
      generateTypedRoutes: true,
      // Or customize output path:
      // generateTypedRoutes: { output: "src/my-routes.ts" },
    }),
  ],
});
```

This generates a `src/routes.generated.ts` file containing type definitions for all your routes.

### Generated File

The generated file exports a `paths` helper with a type-safe `for()` method:

```ts
// src/routes.generated.ts (auto-generated)
import { createTypedPaths } from "@tailor-platform/app-shell";

type RouteParams = {
  "/": {};
  "/dashboard": {};
  "/orders": {};
  "/orders/:id": { id: string };
  "/orders/:orderId/items/:itemId": { orderId: string; itemId: string };
};

export const paths = createTypedPaths<RouteParams>();

export type { RouteParams };
```

### Usage

```tsx
import { useNavigate } from "@tailor-platform/app-shell";
import { paths } from "./routes.generated";

const MyComponent = () => {
  const navigate = useNavigate();

  // ✅ Static route - no params needed
  const goToDashboard = () => {
    navigate(paths.for("/dashboard"));
  };

  // ✅ Dynamic route - params required and type-checked
  const goToOrder = (orderId: string) => {
    navigate(paths.for("/orders/:id", { id: orderId }));
  };

  // ✅ Multiple params
  const goToOrderItem = (orderId: string, itemId: string) => {
    navigate(paths.for("/orders/:orderId/items/:itemId", { orderId, itemId }));
  };

  // ✅ Query string passthrough
  const goToOrderWithTab = (orderId: string) => {
    navigate(paths.for("/orders/:id?tab=details", { id: orderId }));
  };

  // ✅ Dynamic query values via template literal
  const goToOrderWithDynamicQuery = (orderId: string, tab: string) => {
    navigate(paths.for(`/orders/:id?tab=${tab}`, { id: orderId }));
  };

  // ❌ TypeScript error: missing required params
  // navigate(paths.for("/orders/:id"));

  // ❌ TypeScript error: invalid path
  // navigate(paths.for("/invalid/path"));

  return <button onClick={goToDashboard}>Go to Dashboard</button>;
};
```

### Opt-In Design

This feature is opt-in. If you don't enable `generateTypedRoutes`, you can continue building paths dynamically:

```tsx
// Still works without typed routes
navigate(`/orders/${orderId}`);
```

### HMR Support

The generated file is automatically regenerated when:

- A new `page.tsx` is added
- A `page.tsx` is deleted
- The dev server starts
