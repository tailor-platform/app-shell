# Client-side Navigation

Because AppShell manages routing internally, it has its own instance of the RouterProvider from `react-router`.

To use client-side navigation from AppShell pages, instead of installing `react-router` to package.json and importing components and hooks from your application's dependencies, we must use the exports from `@tailor-platform/app-shell`, such as `Link` component, or `useParams`, `useNavigate` hooks. These components and hooks internally use the correct context for the AppShell `RouterProvider` to properly recognize the intent.

## Exported React Router Hooks

AppShell re-exports the following hooks from `react-router` for use in your components:

- `useLocation` - Access the current location object
- `useNavigate` - Programmatic navigation
- `useParams` - Access route parameters
- `useSearchParams` - Access and manipulate URL search parameters
- `useRouteError` - Access error details in error boundaries
- `Link` - Client-side navigation component

### Example Usage

```tsx
import { 
  useNavigate, 
  useParams, 
  useLocation,
  Link 
} from "@tailor-platform/app-shell";

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

## Command Palette for Quick Navigation

AppShell includes a `CommandPalette` component that provides keyboard-driven quick navigation to any page in your application.

### Features

- **Keyboard Shortcut**: `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **Fuzzy Search**: Search by page title or path
- **Hierarchical Display**: Shows module > resource breadcrumbs
- **Keyboard Navigation**: Use arrow keys and Enter to navigate
- **Multilingual**: Supports English and Japanese locales

### Setup

Add the `CommandPalette` component to your AppShell layout:

```tsx
import { 
  AppShell, 
  SidebarLayout, 
  CommandPalette 
} from "@tailor-platform/app-shell";

const App = () => (
  <AppShell modules={modules} locale="en">
    <>
      <SidebarLayout />
      <CommandPalette />
    </>
  </AppShell>
);
```

The CommandPalette automatically:
- Collects all navigable routes from your module definitions
- Respects `accessControl` settings (hidden modules/resources won't appear)
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


