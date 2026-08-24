---
title: Routing and Navigation
description: Learn how to navigate between pages using React Router hooks and components re-exported from AppShell
---

# Routing and Navigation

Because AppShell manages routing internally, it owns the application's `RouterProvider` instance.

`react-router` is a peer dependency, so your app supplies it and there is exactly one copy in the
bundle. That single instance is what makes the two sides interoperable: importing `useNavigate`
from `@tailor-platform/app-shell` and importing it from `react-router` in your own code reach the
same router context.

Prefer the re-exports from `@tailor-platform/app-shell` for the common primitives — it keeps the
import surface small and makes the AppShell dependency explicit at the call site. Reach for
`react-router` directly when you need something AppShell does not re-export, such as `useBlocker`,
`useMatch`, or `MemoryRouter` in tests. Both work.

What must not happen is **two** copies of `react-router` in one bundle, which is what the peer
dependency prevents: two copies means two disjoint router contexts, and your own `useNavigate` /
`useLocation` / `<Link>` will throw `may be used only in the context of a <Router> component` while
AppShell's own navigation keeps working. If you see that error, check for a duplicate — under pnpm,
`pnpm why react-router`.

## Exported React Router Hooks

AppShell re-exports the following hooks and components from `react-router` for use in your components:

- `useLocation` - Access the current location object
- `useNavigate` - Programmatic navigation
- `useParams` - Access route parameters
- `useSearchParams` - Access and manipulate URL search parameters
- `useRouteError` - Access error details in error boundaries
- `Link` - Client-side navigation component
- `Navigate` - Declarative redirect component

### Example Usage

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
import { appShellRoutes } from "@tailor-platform/app-shell-vite-plugin";

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
