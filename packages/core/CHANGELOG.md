# @tailor-platform/app-shell

## 0.27.0

### Minor Changes

- a7f686f: Adds new Sidebar custom items API for flexible sidebar navigation customization.

  ## New Components

  - `SidebarItem` - Navigation item that auto-resolves title/icon from resource meta
  - `SidebarGroup` - Collapsible group for organizing navigation items
  - `SidebarSeparator` - Visual separator between sidebar sections
  - `WithGuard` - Conditional rendering wrapper based on guard functions

  ## New Hook

  - `usePageMeta` - Hook to access current page metadata (title, icon)

  ## Usage

  ```tsx
  import {
    SidebarLayout,
    DefaultSidebar,
    SidebarItem,
    SidebarGroup,
    SidebarSeparator,
  } from "@tailor-platform/app-shell";

  // Auto-resolved navigation from resource definitions (DefaultSidebar is used by default)
  <SidebarLayout />

  // Fully customized sidebar navigation
  <SidebarLayout
    sidebar={
      <DefaultSidebar>
        <SidebarItem to="/dashboard" />
        <SidebarSeparator />
        <SidebarGroup title="Products" icon={<Package />}>
          <SidebarItem to="/products/all" />
          <SidebarItem to="/products/categories" />
        </SidebarGroup>
        <SidebarItem to="https://docs.example.com" external />
      </DefaultSidebar>
    }
  />

  // Custom rendering with render prop
  <SidebarItem
    to="/tasks"
    render={({ title, icon, isActive }) => (
      <div className={isActive ? "active" : ""}>
        {icon} {title}
      </div>
    )}
  />
  ```

  ## WithGuard Component

  New `WithGuard` component for conditional rendering based on guard functions. Use it to control visibility of sidebar items or any other components.

  ```tsx
  import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

  // Define a guard function
  const isAdminGuard = ({ context }) =>
    context.currentUser.role === "admin" ? pass() : hidden();

  // Wrap components with WithGuard
  <DefaultSidebar>
    <SidebarItem to="/dashboard" />
    <WithGuard guards={[isAdminGuard]}>
      <SidebarGroup title="Admin" icon={<Shield />}>
        <SidebarItem to="/admin/users" />
      </SidebarGroup>
    </WithGuard>
  </DefaultSidebar>;

  // Curried guards for parameterized conditions
  const hasRole =
    (role: string) =>
    ({ context }) =>
      context.currentUser.role === role ? pass() : hidden();

  <WithGuard guards={[hasRole("manager")]}>
    <SidebarItem to="/reports" />
  </WithGuard>;

  // Use in page components for conditional UI
  const DashboardPage = () => (
    <div>
      <h1>Dashboard</h1>
      <WithGuard guards={[isAdminGuard]}>
        <AdminPanel />
      </WithGuard>
      <WithGuard guards={[hasRole("editor")]}>
        <EditButton />
      </WithGuard>
    </div>
  );
  ```

- e7fa8ec: Add file-based routing support via new Vite plugin

  File-based routing allows defining pages by placing components in a directory structure, eliminating the need for explicit `defineModule()` and `defineResource()` calls.

  ### Why file-based routing?

  **URL-First Design is Already the Norm** - Most projects naturally align their module/resource hierarchy with URL paths. A "purchasing" module at `/purchasing` with an "orders" resource at `/purchasing/orders` is the intuitive choice. The previous API required manually wiring up this structure even though the mapping was already implicit.

  **AI-Friendly Development** - By adopting file-based routing patterns pioneered by Next.js, AI tools can understand and navigate your codebase with less context. Code generation becomes more predictable and the established convention serves as shared knowledge between humans and AI.

  **Providing Rails, Not Just Flexibility** - The legacy `defineModule()`/`defineResource()` API gave flexibility but offered few conventions for directory structure, hierarchy management, or file naming. File-based routing provides an opinionated, battle-tested convention.

  Importantly, this is implemented as a Vite plugin layer on top of the existing programmatic API. Projects requiring non-standard routing can still use `defineModule()`/`defineResource()` directly.

  ### Backward Compatibility

  File-based routing is a **recommended opt-in** feature. The legacy declarative API (`defineModule()`/`defineResource()`) remains fully supported and will continue to work. You can choose either approach per project, though mixing both in the same application is not supported.

  ### Vite Plugin

  The new `@tailor-platform/app-shell-vite-plugin` package provides file-based routing support:

  ```typescript
  // vite.config.ts
  import { appShellRoutes } from "@tailor-platform/app-shell-vite-plugin";

  export default defineConfig({
    plugins: [
      react(),
      appShellRoutes(), // scans src/pages by default
    ],
  });
  ```

  Under the hood, the plugin:

  1. **Scans pages** - Finds `page.tsx` files in `src/pages` and builds a route tree
  2. **Generates virtual module** - Creates `virtual:app-shell-pages` with all discovered pages
  3. **Auto-injects pages** - Intercepts `@tailor-platform/app-shell` imports and wraps `AppShell` with `AppShell.WithPages(pages)`
  4. **Validates at build time** - Uses ts-morph AST analysis to validate `appShellPageProps`
  5. **Supports HMR** - Watches for page changes and triggers hot reload

  No manual wiring needed—just import `AppShell` as usual and pages are automatically available.

  ### Defining Pages

  ```tsx
  // src/pages/dashboard/page.tsx
  import type { AppShellPageProps } from "@tailor-platform/app-shell";

  const DashboardPage = () => <div>Dashboard</div>;

  DashboardPage.appShellPageProps = {
    meta: { title: "Dashboard" },
    guards: [authGuard],
  } satisfies AppShellPageProps;

  export default DashboardPage;
  ```

  ### Type-safe Routes (Optional)

  ```typescript
  // vite.config.ts
  appShellRoutes({ generateTypedRoutes: true });
  ```

  When enabled, the plugin generates `src/routes.generated.ts` containing:

  - `GeneratedRouteParams` type mapping all routes to their parameter types
  - `paths` helper with a type-safe `for()` method for building URLs
  - Module augmentation to register route types with app-shell

  ```tsx
  // Auto-generated: src/routes.generated.ts
  export type GeneratedRouteParams = {
    "/": {};
    "/dashboard": {};
    "/dashboard/orders/:id": { id: string };
  };
  export const paths = createTypedPaths<GeneratedRouteParams>();

  // Usage - TypeScript enforces correct params
  import { paths } from "./routes.generated";

  paths.for("/dashboard"); // ✓ OK
  paths.for("/dashboard/orders/:id", { id: "123" }); // ✓ OK → "/dashboard/orders/123"
  paths.for("/dashboard/orders/:id"); // ✗ Error: missing 'id'
  paths.for("/invalid-route"); // ✗ Error: route doesn't exist
  ```

  ### Breaking Change: Guard/Loader Cascade Behavior

  In the legacy `defineModule()`/`defineResource()` API, guards and loaders defined at the module level were automatically cascaded to all child resources. This automatic cascade behavior has been removed in both the legacy API and file-based routing—**guards and loaders are no longer automatically inherited**. Each resource or page must explicitly define its own guards and loaders.

  **Before (legacy API):**

  ```tsx
  defineModule({
    path: "/dashboard",
    guards: [authGuard], // Applied to all child resources automatically
    resources: [
      defineResource({ path: "/orders", element: <Orders /> }), // authGuard applied
      defineResource({ path: "/reports", element: <Reports /> }), // authGuard applied
    ],
  });
  ```

  **After (legacy API):**

  ```tsx
  defineModule({
    path: "/dashboard",
    guards: [authGuard],
    resources: [
      defineResource({
        path: "/orders",
        guards: [authGuard],
        element: <Orders />,
      }), // Must be explicitly defined
      defineResource({
        path: "/reports",
        guards: [authGuard],
        element: <Reports />,
      }), // Must be explicitly defined
    ],
  });
  ```

  Note: File-based routing, introduced in this release, also does not support guard/loader cascading. Each page must define its own guards and loaders explicitly:

  ```tsx
  // src/pages/dashboard/orders/page.tsx
  OrdersPage.appShellPageProps = {
    guards: [authGuard], // Must be explicitly defined
  } satisfies AppShellPageProps;

  // src/pages/dashboard/reports/page.tsx
  ReportsPage.appShellPageProps = {
    guards: [authGuard], // Must be explicitly defined
  } satisfies AppShellPageProps;
  ```

  **Rationale:** Explicit guard/loader definitions per resource/page improve code clarity and make it easier to understand the security requirements of each route at a glance.

  **Migration tip:** If you need the previous cascading behavior, compose your guards array explicitly:

  ```tsx
  // src/guards.ts
  export const requireAuth = [authGuard];
  export const requireAdmin = [authGuard, adminRoleGuard];

  // src/pages/dashboard/orders/page.tsx
  import { requireAuth } from "@/guards";

  OrdersPage.appShellPageProps = {
    guards: [...requireAuth, canViewOrders],
  } satisfies AppShellPageProps;

  // src/pages/admin/users/page.tsx
  import { requireAdmin } from "@/guards";

  UsersPage.appShellPageProps = {
    guards: [...requireAdmin],
  } satisfies AppShellPageProps;
  ```

  ## Breaking Change: Module without component requires guards

  As part of the ongoing effort to decouple navigation and routing (aligned with file-based routing), the automatic redirect behavior for modules without a `component` has been removed.

  Previously, a module without a `component` would automatically redirect to the first visible resource. However, in file-based routing, the resource hierarchy is determined ad-hoc by the vite-plugin based on directory structure, making this implicit redirect behavior inconsistent and unpredictable. To maintain consistency across both explicit and file-based routing, this behavior has been removed.

  If a module is defined without both `component` and `guards`, an error will be thrown at runtime. You must provide at least one of them.

  ```tsx
  // Before: automatic redirect to first visible resource
  defineModule({
    path: "reports",
    resources: [salesResource, usersResource],
  });

  // After: explicit redirect via guards
  defineModule({
    path: "reports",
    guards: [() => redirectTo("sales")],
    resources: [salesResource, usersResource],
  });

  // Error: defining a module without both component and guards will throw
  defineModule({
    path: "reports",
    resources: [salesResource, usersResource],
  }); // => throws an error
  ```

### Patch Changes

- 8c19779: Updated [react-hook-form](https://www.npmjs.com/package/react-hook-form) (^7.71.1 -> ^7.71.2)
- 50ddd5f: Updated [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) (^3.4.0 -> ^3.5.0)
- 1338776: Updated [es-toolkit](https://www.npmjs.com/package/es-toolkit) (^1.41.0 -> ^1.44.0)
- Updated dependencies [e7fa8ec]
  - @tailor-platform/app-shell-vite-plugin@0.27.0

## 0.26.3

### Patch Changes

- 2170b9e: Updated [oauth4webapi](https://www.npmjs.com/package/oauth4webapi) (^3.8.3 -> ^3.8.5)
- 5aef4ad: Update auth-public-client to 0.4.1
- 18f9b66: Updated [react-hook-form](https://www.npmjs.com/package/react-hook-form) (^7.54.2 -> ^7.71.1)

## 0.26.2

### Patch Changes

- 7fee07a: Updated [@tanstack/react-table](https://www.npmjs.com/package/@tanstack/react-table) (^8.21.2 -> ^8.21.3)

## 0.26.1

### Patch Changes

- 3fe975b: Fix content area layout to properly fill remaining space

  Added `flex-1` and `min-h-0` to the content wrapper in SidebarLayout, allowing child pages to use `h-full` or `flex-1` to fill the remaining space after the header/breadcrumb. This eliminates the need for hacky `calc(100dvh - Xrem)` workarounds.

  Also added `overflow-hidden` to the sidebar-wrapper to enable proper scrolling within nested containers (e.g., kanban board lanes).

## 0.26.0

### Minor Changes

- 72bbcb6: Replace `@tailor-platform/auth-browser-client` with `@tailor-platform/auth-public-client` and add Suspense support

  ## Motivation

  The previous authentication implementation using `@tailor-platform/auth-browser-client` relied on HTTPOnly cookie-based session management. This caused authentication failures on browsers with strict privacy protections, particularly Safari with its Intelligent Tracking Prevention (ITP) feature, and Brave with its similar tracking prevention mechanisms. These browsers block or restrict cross-site cookies, which prevented the HTTPOnly cookies from being stored and sent properly, causing authentication to fail silently or users to be logged out unexpectedly.

  To address this cross-browser compatibility issue, we have migrated to `@tailor-platform/auth-public-client`, which uses DPoP (Demonstrating Proof of Possession) token binding with IndexedDB storage instead of cookies. This approach works reliably across all major browsers (including Safari 14+ and Brave) regardless of their privacy settings.

  ## Key Changes

  - **Cross-browser Compatibility**: Works reliably on Safari, Brave, and other browsers with strict privacy settings
  - **Suspense Support**: Added `useAuthSuspense` hook for React Suspense integration
  - **Module-level Client**: Auth client can now be created at module level and shared across the app

  ## Breaking Changes

  The underlying authentication package has been replaced with `@tailor-platform/auth-public-client` v0.3.1, which uses DPoP (Demonstrating Proof of Possession) token binding.

  ### AuthProvider API Changes

  - `AuthProvider` now requires a `client` prop created with `createAuthClient` from `@tailor-platform/app-shell`
  - The `apiEndpoint` prop has been removed - the client automatically uses the `appUri` provided during creation
  - You must use the wrapped `createAuthClient` from `@tailor-platform/app-shell` (not the original from `@tailor-platform/auth-public-client`)

  ### Hook Return Value Changes

  - **`useAuth`**: Now returns `{ isAuthenticated, error, isReady, login, logout, checkAuthStatus }` directly instead of `{ authState, ... }`
  - **`useAuthSuspense`**: Returns `{ isAuthenticated, error, login, logout, checkAuthStatus }` (no `isReady` since Suspense handles loading)

  ### Removed Exports

  - `DefaultUser` and `AuthRegister` types are no longer exported
  - `user` property removed from `AuthState` (see "Removed: Built-in User Fetching" below)

  ### Removed: Built-in User Fetching (meQuery)

  The previous implementation fetched user information internally using a simple `fetch` call to the `/query` endpoint. This design had several issues:

  1. **Caching conflicts**: When applications use GraphQL client libraries (urql, Apollo, etc.) with sophisticated caching mechanisms, having a separate internal fetch for user data creates inconsistencies and bypasses the cache.
  2. **Inflexibility**: Applications couldn't customize the user query or integrate it with their existing data fetching patterns.
  3. **Mixed responsibilities**: The auth provider was handling both authentication AND user data fetching, which are separate concerns.

  **The new design focuses solely on authentication responsibilities:**

  - Token management (access tokens, refresh tokens)
  - Login/logout flows
  - OAuth callback handling
  - Authentication state (`isAuthenticated`, `error`, `isReady`)

  **User information should now be fetched by your application** using your preferred GraphQL client library, which gives you:

  - Full control over caching behavior
  - Ability to customize the user query
  - Consistent data fetching patterns across your app
  - Better integration with your existing data layer

  ## Migration Guide

  ### Before (v0.22.0 and earlier)

  ```tsx
  import { AuthProvider, useAuth } from "@tailor-platform/app-shell";

  function App() {
    return (
      <AuthProvider
        apiEndpoint="https://xyz.erp.dev"
        clientId="your-client-id"
        redirectUri="https://your-app.com"
      >
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    const { authState, login, logout } = useAuth();

    if (authState.isLoading) return <div>Loading...</div>;
    if (!authState.isAuthenticated)
      return <button onClick={login}>Log In</button>;

    // User was available from authState
    return <div>Welcome, {authState.user?.email}!</div>;
  }
  ```

  ### After (v0.23.0+)

  ```tsx
  import {
    createAuthClient,
    AuthProvider,
    useAuth,
  } from "@tailor-platform/app-shell";

  // Create auth client outside component (module level)
  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
    redirectUri: "https://your-app.com", // optional, defaults to window.location.origin
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    // New: properties returned directly (not nested in authState)
    const { isAuthenticated, isReady, login, logout } = useAuth();

    if (!isReady) return <div>Loading...</div>;
    if (!isAuthenticated) return <button onClick={login}>Log In</button>;

    // User info should now be fetched separately using your GraphQL client
    return <UserProfile />;
  }

  // Fetch user info with your GraphQL client (e.g., urql)
  function UserProfile() {
    const [{ data }] = useQuery({ query: ME_QUERY });
    return <div>Welcome, {data?.me?.email}!</div>;
  }
  ```

  ## Usage Examples

  ### Basic Authentication

  ```tsx
  import {
    createAuthClient,
    AuthProvider,
    useAuth,
  } from "@tailor-platform/app-shell";

  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <MyComponent />
      </AuthProvider>
    );
  }

  function MyComponent() {
    const { isAuthenticated, isReady, login, logout } = useAuth();

    if (!isReady) return <div>Loading...</div>;
    if (!isAuthenticated) return <button onClick={login}>Log In</button>;

    return (
      <div>
        <p>Authenticated!</p>
        <button onClick={logout}>Log Out</button>
      </div>
    );
  }
  ```

  ### With Suspense

  ```tsx
  import { Suspense } from "react";
  import {
    createAuthClient,
    AuthProvider,
    useAuthSuspense,
  } from "@tailor-platform/app-shell";

  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://xyz.erp.dev",
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <Suspense fallback={<div>Loading authentication...</div>}>
          <ProtectedContent />
        </Suspense>
      </AuthProvider>
    );
  }

  function ProtectedContent() {
    // isReady is guaranteed to be true here (Suspense handles loading)
    const { isAuthenticated, login, logout } = useAuthSuspense();

    if (!isAuthenticated) {
      return <button onClick={login}>Log In</button>;
    }

    return (
      <div>
        <p>Authenticated!</p>
        <button onClick={logout}>Log Out</button>
      </div>
    );
  }
  ```

  ### Initializing GraphQL Client with Auth Headers

  The new API makes it easy to share the auth client between `AuthProvider` and your GraphQL client, with less duplication:

  ```tsx
  import { createAuthClient, AuthProvider } from "@tailor-platform/app-shell";
  import { createClient, Provider } from "urql";

  // Create auth client at module level
  const authClient = createAuthClient({
    clientId: "your-client-id",
    appUri: "https://api.example.com",
  });

  // Create urql client - no need to repeat the URL!
  const urqlClient = createClient({
    url: `${authClient.getAppUri()}/query`,
    fetchOptions: async () => {
      // Simplified: no need to pass URL again
      const headers = await authClient.getAuthHeadersForQuery();
      return { headers };
    },
  });

  function App() {
    return (
      <AuthProvider client={authClient}>
        <Provider value={urqlClient}>
          <YourAppComponents />
        </Provider>
      </AuthProvider>
    );
  }
  ```

  ### Fetching User Information

  Since user fetching is no longer built-in, here's a recommended pattern:

  ```tsx
  import { useQuery, gql } from "urql";
  import { useAuth } from "@tailor-platform/app-shell";

  const ME_QUERY = gql`
    query Me {
      me {
        id
        email
        name
      }
    }
  `;

  function UserProfile() {
    const { isAuthenticated } = useAuth();
    const [{ data, fetching }] = useQuery({
      query: ME_QUERY,
      pause: !isAuthenticated, // Don't fetch if not authenticated
    });

    if (fetching) return <div>Loading user...</div>;
    if (!data?.me) return <div>Not logged in</div>;

    return <div>Welcome, {data.me.name}!</div>;
  }
  ```

## 0.25.0

### Minor Changes

- 6ff1478: Export `useToast` hook

  `useToast` is just a hook that returns [sonner](https://sonner.emilkowal.ski/).

### Patch Changes

- 10b521d: Fix module redirect to skip hidden resources

  When a module has no `component` and redirects to its first resource, the redirect now correctly skips resources that are hidden by guards. If all resources are hidden, the module itself returns a 404.

  - Redirects to the first visible (non-hidden) resource instead of always redirecting to the first resource
  - Returns 404 when all resources in the module are hidden by guards

## 0.24.0

### Minor Changes

- ae8f732: Add `t.dynamic()` method for resolving i18n labels with dynamic keys

  The `useT` hook now returns a function with a `dynamic` method that allows resolving labels with runtime-constructed keys:

  ```tsx
  const t = labels.useT();

  const employeeType = "STAFF";
  t.dynamic(`employees.${employeeType}`, "Unknown"); // Returns the label or "Unknown" if not found
  ```

- 193afe9: Make `component` optional in `defineModule`

  - `defineModule` now accepts an optional `component` prop
  - When `component` is omitted, the module acts as a container for resources and automatically redirects to the first resource
  - `menuItemClickable` is set to `false` for modules without a component

  ```tsx
  // With component - renders the component at /dashboard
  defineModule({
    path: "dashboard",
    component: () => <DashboardPage />,
    resources: [...]
  });

  // Without component - redirects /reports to /reports/sales
  defineModule({
    path: "reports",
    resources: [
      defineResource({ path: "sales", ... }),
      defineResource({ path: "users", ... }),
    ]
  });
  ```

- 617c1ac: ## Route Guards and Context Data

  This release introduces a new route guards system and custom context data support, replacing the previous `accessControl` API.

  ### Motivation

  #### Route Guards

  Inspired by Angular Route Guards, this feature introduces a middleware-like pattern for route access control.

  - **Composable**: Guards can be combined in an array, promoting separation of concerns and reusability
  - **Semantic Constraints**: Guard results are limited to `pass`, `hidden`, or `redirect`, making behavior predictable and explicit
  - **Reusable**: Define guards once and share them across multiple routes

  #### Context Data

  Provides a type-safe dependency injection mechanism for passing data from the application root to guards and components.

  - **Type-Safe**: Module augmentation ensures `contextData` is fully typed throughout the application
  - **Centralized**: Manage API clients, user state, and feature flags in one place
  - **Testable**: Easy to mock and inject different contexts for testing

  ### Breaking Changes

  - **`accessControl` is replaced by `guards`**: The `accessControl` option in `defineModule` and `defineResource` has been replaced with a more flexible `guards` array.
  - **`RedirectConfig` and `redirectToResource` are removed**: Use `guards` with `redirectTo()` instead.

  ### New Features

  #### 1. Route Guards

  Guards are functions that control access to routes. They are executed in order, and the first non-`pass` result stops the chain.

  ```tsx
  import {
    defineResource,
    pass,
    hidden,
    redirectTo,
    type Guard,
  } from "@tailor-platform/app-shell";

  // Reusable guards
  const requireAuth: Guard = ({ context }) => {
    if (!context.currentUser) {
      return redirectTo("/login");
    }
    return pass();
  };

  const requireAdmin: Guard = ({ context }) => {
    if (context.currentUser.role !== "admin") {
      return hidden(); // Shows 404
    }
    return pass();
  };

  // Use guards in resource definition
  export const adminResource = defineResource({
    path: "admin/users/:id",
    component: AdminUserPage,
    guards: [
      requireAuth,
      requireAdmin,
      async ({ params, context }) => {
        // Check organization access
        const user = await context.apiClient.getUser(params.id);
        if (user.orgId !== context.currentUser.orgId) {
          return hidden();
        }
        return pass();
      },
    ],
  });
  ```

  #### 2. Custom Context Data

  Pass arbitrary data through `AppShellProps` and access it from guards and components.

  **Step 1: Define your context data type using module augmentation**

  ```typescript
  // types.d.ts
  declare module "@tailor-platform/app-shell" {
    interface AppShellRegister {
      contextData: {
        apiClient: ApiClient;
        currentUser: User | null;
        featureFlags: {
          enableNewUI: boolean;
        };
      };
    }
  }
  ```

  **Step 2: Pass context data to AppShell**

  ```tsx
  // App.tsx
  import { AppShell } from "@tailor-platform/app-shell";

  function App() {
    const apiClient = useApiClient();
    const currentUser = useCurrentUser();
    const featureFlags = useFeatureFlags();

    return (
      <AppShell
        modules={modules}
        contextData={{
          apiClient,
          currentUser,
          featureFlags,
        }}
      />
    );
  }
  ```

  **Step 3: Access context data in guards**

  ```tsx
  const myGuard: Guard = ({ context }) => {
    // `context` is fully typed based on your AppShellRegister
    if (context.featureFlags.enableNewUI) {
      return redirectTo("/new-dashboard");
    }
    return pass();
  };
  ```

  **Step 4: Access context data in components**

  ```tsx
  import { useAppShell } from "@tailor-platform/app-shell";

  function MyComponent() {
    const { contextData } = useAppShell();

    return <div>Welcome, {contextData.currentUser?.name}</div>;
  }
  ```

  ### Migration Guide

  **Before (accessControl):**

  ```tsx
  defineResource({
    path: "admin",
    component: AdminPage,
    accessControl: async ({ params }) => {
      const hasAccess = await checkAccess(params.id);
      return hasAccess ? { state: "visible" } : { state: "hidden" };
    },
  });
  ```

  **After (guards):**

  ```tsx
  defineResource({
    path: "admin",
    component: AdminPage,
    guards: [
      async ({ params }) => {
        const hasAccess = await checkAccess(params.id);
        return hasAccess ? pass() : hidden();
      },
    ],
  });
  ```

  **Before (redirectToResource):**

  ```tsx
  defineModule({
    path: "dashboard",
    component: redirectToResource("dashboard/overview"),
    resources: [...],
  });
  ```

  **After (guards with redirectTo):**

  ```tsx
  defineModule({
    path: "dashboard",
    component: () => null,
    guards: [() => redirectTo("dashboard/overview")],
    resources: [...],
  });
  ```

  ### New Exports

  - `Guard` - Guard function type
  - `GuardContext` - Context passed to guards (`params`, `searchParams`, `signal`, `context`)
  - `GuardResult` - Result type (`pass`, `hidden`, or `redirect`)
  - `pass()` - Helper to allow access
  - `hidden()` - Helper to deny access (404)
  - `redirectTo(path)` - Helper to redirect
  - `AppShellRegister` - Interface for module augmentation
  - `ContextData` - Inferred context data type

### Patch Changes

- 42daf85: Updated [react-dom](https://www.npmjs.com/package/react-dom) (^19.2.1 -> ^19.2.4)

## 0.23.0

### Minor Changes

- 3f42257: Add Layout component for responsive column layouts

  - `Layout` - Responsive column layout component with automatic responsive behavior
  - `Layout.Column` - Sub-component for wrapping individual column content
  - Support for 1, 2, and 3 column layouts with automatic responsive stacking
  - Optional `title` and `actions` props for built-in header with action buttons

  ```tsx
  import { Layout } from "@tailor-platform/app-shell";

  // Basic 2 Column Layout
  <Layout columns={2}>
    <Layout.Column>Main content</Layout.Column>
    <Layout.Column>Side panel</Layout.Column>
  </Layout>

  // With header title and action buttons
  <Layout
    columns={2}
    title="Page Title"
    actions={[
      <Button key="cancel" variant="secondary">Cancel</Button>,
      <Button key="save">Save</Button>,
    ]}
  >
    <Layout.Column>...</Layout.Column>
    <Layout.Column>...</Layout.Column>
  </Layout>
  ```

## 0.22.0

### Minor Changes

- b09e30d: Add DescriptionCard component for ERP document display

  - `DescriptionCard` - Card component for structured key-value information
  - `Badge` - Status badge component with semantic variants (success, warning, error, etc.)
  - 7 field types: text, badge, money, date, link, address, reference
  - Text truncation with tooltip: `meta: { truncateLines: 2 }`
  - Badge values auto-converted to sentence case (e.g., "CONFIRMED" → "Confirmed")
  - Responsive grid layout (4 → 3 → 2 → 1 columns)

  ```tsx
  import { DescriptionCard } from "@tailor-platform/app-shell";

  <DescriptionCard
    data={order}
    title="Order Summary"
    fields={[
      {
        key: "status",
        label: "Status",
        type: "badge",
        meta: { badgeVariantMap: { CONFIRMED: "outline-success" } },
      },
      { type: "divider" },
      { key: "note", label: "Notes", meta: { truncateLines: 2 } },
    ]}
  />;
  ```

## 0.21.1

### Patch Changes

- bc08996: Updated [@radix-ui/react-navigation-menu](https://www.npmjs.com/package/@radix-ui/react-navigation-menu) (^1.2.5 -> ^1.2.14)

## 0.21.0

### Minor Changes

- 32f0c81: `accessControl` is introduced as the unified way to hide modules or resources when a feature flag or permission is missing.

  ```tsx
  // Example: permission-gated reports module
  export const reportsModule = defineModule({
    // ...
    accessControl: async ({ signal }) => {
      const ok = await fetch("/api/me/permissions?scope=reports", {
        signal,
      }).then((r) => r.ok);
      return { state: ok ? "visible" : "hidden" };
    },
  });

  // Example: resource-level access control
  const reportsListResource = defineResource({
    // ...
    accessControl: () => ({ state: "hidden" }),
  });

  // Example: rollout by tenant tier.
  const billingModule = defineModule({
    // ...
    accessControl: async () => {
      const plan = await getCurrentTenantPlan();
      return { state: plan === "enterprise" ? "visible" : "hidden" };
    },
  });
  ```

## 0.20.1

### Patch Changes

- 2418378: Improve CommandPalette UI with hierarchical path display

  - Display module/resource hierarchy as breadcrumb format (e.g., "Dashboard > Analytics")
  - Widen the dialog width for better readability
  - Show URL path below the breadcrumb in smaller text

- fb7e114: Updated [@radix-ui/react-collapsible](https://www.npmjs.com/package/@radix-ui/react-collapsible) (^1.1.3 -> ^1.1.12)

## 0.20.0

### Minor Changes

- 1a2ee08: Add `CommandPalette` component for quick page navigation.

  The CommandPalette provides a keyboard-driven interface (Cmd+K / Ctrl+K) for searching and navigating between pages in your application. It automatically collects navigable routes from your module definitions and supports both English and Japanese locales.

  ## Features

  - Global keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
  - Fuzzy search by page title or path
  - Keyboard navigation with arrow keys and Enter

  ## Usage

  The `CommandPalette` component is designed to be used within an `AppShell` context. It automatically reads module configurations and provides navigation capabilities.

  ```tsx
  import {
    AppShell,
    CommandPalette,
    SidebarLayout,
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

### Patch Changes

- d680b83: Updated [oauth4webapi](https://www.npmjs.com/package/oauth4webapi) (^3.8.1 -> ^3.8.3)
- e6020ae: Updated [lucide-react](https://www.npmjs.com/package/lucide-react) (^0.487.0 -> ^0.562.0)
- cda3d85: Updated [@radix-ui/react-popover](https://www.npmjs.com/package/@radix-ui/react-popover) (^1.1.6 -> ^1.1.15)
- 7fcc21c: Updated [@radix-ui/react-tooltip](https://www.npmjs.com/package/@radix-ui/react-tooltip) (^1.1.8 -> ^1.2.8)

## 0.19.0

### Minor Changes

- 1833c9c: Replace `BuiltinIdPAuthProvider` with new `AuthProvider` using `@tailor-platform/auth-browser-client`.

  The previous `BuiltinIdPAuthProvider` only supported authentication with Tailor Platform's built-in IdP system. With the new `AuthProvider` powered by `@tailor-platform/auth-browser-client`, you can now authenticate with any IdP configured in Tailor Platform's Auth service (e.g., Google, Okta, Auth0, etc.).

  # New APIs

  ## Component

  **`AuthProvider`** - New props:

  - `meQuery`: Custom GraphQL query to fetch the current authenticated user. If you override `AuthRegister["user"]`, make sure to have the fields match your custom user type.
  - `autoLogin`: Enable automatic login on initialization
  - `guardComponent`: Component to render while loading or unauthenticated

  ## Hook

  **`useAuth`** - New returns:

  - `authState`: Current auth state (`isLoading`, `isAuthenticated`, `user`)
  - `checkAuthStatus()`: Manually verify authentication status
  - `handleCallback()`: Handle OAuth callback

  ## Extending User Type with type safety

  By default, `authState.user` returned from `useAuth()` has the `DefaultUser` type, which includes the following fields:

  ```ts
  type DefaultUser = {
    id: string;
    email: string;
    name: string;
  };
  ```

  If your application needs additional user fields (e.g., roles, organization info, custom attributes), you can extend the user type using TypeScript's **module augmentation** feature. This ensures full type safety when accessing user properties throughout your application.

  ### Step 1: Define your custom user type

  Use the `AuthRegister` interface to declare your extended user type. This interface uses declaration merging to override the default user type globally.

  ```tsx
  // types/auth.d.ts (or any .ts/.tsx file in your project)
  declare module "@tailor-platform/app-shell" {
    interface AuthRegister {
      user: DefaultUser & {
        roles: Array<string>;
        organizationId: string;
        // Add any other custom fields your API returns
      };
    }
  }
  ```

  ### Step 2: Provide a matching `meQuery`

  The `meQuery` prop defines the GraphQL query used to fetch the authenticated user. **The fields in your query must match the fields defined in your custom user type.**

  ```tsx
  import {
    AppShell,
    AuthProvider,
    SidebarLayout,
  } from "@tailor-platform/app-shell";

  const App = () => (
    <AppShell>
      <AuthProvider
        apiEndpoint="..."
        clientId="..."
        meQuery={`
          query {
            me {
              id
              email
              name
              roles
              organizationId
            }
          }
        `}
      >
        <SidebarLayout />
      </AuthProvider>
    </AppShell>
  );
  ```

  ### Step 3: Access typed user data

  After the above setup, `authState.user` will be fully typed with your custom user type:

  ```tsx
  import { useAuth } from "@tailor-platform/app-shell";

  const MyComponent = () => {
    const { authState } = useAuth();

    // TypeScript knows these properties exist
    console.log(authState.user.roles); // Array<string>
    console.log(authState.user.organizationId); // string
    console.log(authState.user.email); // string (from DefaultUser)

    // ...
  };
  ```

  > **Note:** If you don't need custom user fields, you can skip this setup entirely. The default `meQuery` fetches `id`, `email`, and `name` automatically.

  # Migration

  Key changes:

  - `BuiltinIdPAuthProvider` is removed. Use `AuthProvider` instead.
  - `useBuiltinIdpAuth` is removed. Use `useAuth` instead.
  - Utility functions (`buildAuthorizationUrl`, `exchangeCodeForToken`, `prepareLogin`, `handleOAuthCallback`) are no longer exported.

  ```tsx
  // Before
  import {
    BuiltinIdPAuthProvider,
    useBuiltinIdpAuth,
  } from "@tailor-platform/app-shell";

  <BuiltinIdPAuthProvider apiEndpoint="..." clientId="...">
    {children}
  </BuiltinIdPAuthProvider>;

  const { login, logout } = useBuiltinIdpAuth();

  // After
  import { AuthProvider, useAuth } from "@tailor-platform/app-shell";

  <AuthProvider
    apiEndpoint="..."
    clientId="..."
    guardComponent={() => <Loading />}
  >
    {children}
  </AuthProvider>;

  const { login, logout, authState } = useAuth();
  ```

## 0.18.0

### Minor Changes

- 91bfc1f: Add `defineI18nLabels` function for internationalization support.

  `defineI18nLabels` defines internationalization labels for multiple locales with `en` as the required default locale, and returns an object with:

  - `useT`: A hook to get the translated label resolver function for use in React components
  - `t`: A function to get a `LocalizedString` for a specific label key, useful for `meta.title` in module/resource definitions

  Labels can be either static strings or dynamic functions that take props.

  ### Usage

  Define your i18n labels and export the returned `useT` hook:

  ```tsx
  // i18n-labels.ts
  import { defineI18nLabels } from "@tailor-platform/app-shell";

  export const labels = defineI18nLabels({
    en: {
      welcome: "Welcome to our app",
      greeting: (args: { name: string }) => `Hello, ${args.name}!`,
    },
    ja: {
      welcome: "アプリへようこそ",
      greeting: (args: { name: string }) => `こんにちは、${args.name}さん！`,
    },
  });

  // Export useT hook from the returned object
  export const useT = labels.useT;
  ```

  Use `useT` in components:

  ```tsx
  import { useT } from "./i18n-labels";

  const MyComponent = () => {
    const t = useT();

    return (
      <div>
        {/* Static label */}
        {t("welcome")}

        {/* Dynamic label with props (type-safe) */}
        {t("greeting", { name: "John" })}
      </div>
    );
  };
  ```

  Use `labels.t()` in resource definitions:

  ```tsx
  import { defineResource } from "@tailor-platform/app-shell";
  import { labels } from "./i18n-labels";

  const resource = defineResource({
    path: "example",
    meta: {
      // Static label
      title: labels.t("welcome"),
      // Dynamic label with props bound at definition time
      // title: labels.t("greeting", { name: "User" }),
    },
    component: ExampleComponent,
  });
  ```

- 096eb28: Add browser language detection to decide AppShell locale configuration

### Patch Changes

- d9e4e7c: Use vite as bundler

## 0.17.1

### Patch Changes

- 0cdda8f: Fix breadcrumb segment parsing

## 0.17.0

### Minor Changes

- 8092240: Deprecate `contentBorder` style prop
- 8092240: Flatten `configurations` key in AppShell component for simplicity
- 8092240: Rename `SidebarLayoutContainer` to `SidebarLayout`

## 0.16.0

### Minor Changes

- 9e0c17c: `Link` and `useNavigate` destinations should now be provided without the app's base-path prefix; the router applies the scope for you.

  ```tsx
  // basePath === "admin"

  // Before
  <Link to="/admin/dashboard" />;
  navigate("/admin/settings");

  // After
  <Link to="/dashboard" />;
  navigate("/settings");
  ```

### Patch Changes

- 9e0c17c: Remove next.js from peerDependecies

## 0.15.0

### Minor Changes

- 5b02e8a: Remove the implicit `/resources` prefix from generated module and resource routes.

  Consumers should update any hardcoded URLs and expectations to match the new base path structure.

### Patch Changes

- f34af20: Correct `AppShellProps` to accept `configurations.settingsResources` with the proper typing and remove the obsolete `configurations.settingsModules` prop.

  ```tsx
  <AppShell
    configurations={{
      modules,
      settingsResources: [settingsResource],
    }}
  >
    <SidebarLayoutContainer />
  </AppShell>
  ```

- f34af20: Accessing "/settings" path without settings resources will now go 404

  Previously, it gets runtime error caused by out-of-index array access

## 0.14.1

### Patch Changes

- 1cdd5e1: Update depepdencies for security vulnerabilities

## 0.14.0

### Minor Changes

- ca82334: Add configurable error boundaries

  - Add default error boundary that auto-applies to all routes
  - Support custom error boundaries at global, module, and resource levels
  - Add catch-all route for 404 handling

### Patch Changes

- 0a24505: Make `redirectUri` in `BuiltinIdPAuthProvider` optional

  It internally has been fallen back into `window.location.origin`, so should not be required for user experience

- 0a24505: Rename `idpEndpoint` prop in `BuiltinIdPAuthProvider` to `apiEndpoint` to properly tell what it expects to get from users.

## 0.13.0

### Minor Changes

- ec61cab: Add `redirectToResource` helper for declarative module redirection. Modules can now redirect to resources using `component: redirectToResource("path/to/resource")` instead of rendering a component. Redirection is handled efficiently via React Router loaders, avoiding unnecessary component rendering.

  **Example:**

  ```tsx
  import { defineModule, redirectToResource } from "@tailor-platform/app-shell";

  // Redirect to a resource instead of rendering a component
  export const dashboardModule = defineModule({
    path: "dashboard",
    component: redirectToResource("dashboard/overview"),
    resources: [overviewResource, analyticsResource],
  });

  // Also works for AppShell root component
  const appShellConfig: AppShellProps = {
    configurations: {
      rootComponent: redirectToResource("dashboard/overview"),
      modules: [dashboardModule],
    },
  };
  ```

  **Breaking Change**: `defaultResourceRedirectPath` prop in `defineModule` function is removed to keep API consistent. Use `redirectToResource` helper function instead.

### Patch Changes

- 35ae2eb: Promote Omakase-IMS Auth Patterns to AppShell

## 0.12.0

### Minor Changes

- 34715de: Add `rootComponent` prop in AppShell configuration

  The prop is expected to be used for overriding the root page in AppShell to show user-defined page like personalized dashboard, customized onboarding instruction, or something.

  ## Example

  ```tsx
  import {
    AppShell,
    AppShellProps,
    SidebarLayoutContainer,
  } from "@tailor-platform/app-shell";
  import { exampleModule } from "./resource/example";

  const App = () => {
    const appShellConfig: AppShellProps = {
      title: "AppShell",
      configurations: {
        modules: [exampleModule],

        /*
         * NEW: a prop to give a component to override the root page
         *
         * If nothing given, the default empty page would still be shown.
         * Use `useEffect` + `useNavigate` when initial page redirection is needed.
         */
        rootComponent: () => <div>Custom Root Component</div>,
      },
    };

    return (
      <AppShell {...appShellConfig}>
        <SidebarLayoutContainer />
      </AppShell>
    );
  };
  ```

### Patch Changes

- 58ed4a1: Add astw prefix to sr-only

## 0.11.1

### Patch Changes

- 5315366: Settings Modules

## 0.11.0

### Minor Changes

- 0c6312c: Module component can access module resources

### Patch Changes

- 225b4fd: Module component should be able to access the module's subResources

## 0.10.0

### Minor Changes

- af40df7: Add isLoading

### Patch Changes

- 675413d: Add isLoading to `BuiltinIdPAuthProvider`

## 0.9.4

### Patch Changes

- 93add79: Add logout function for BuiltinIdpAuthProvider

## 0.9.3

### Patch Changes

- f7a6fc6: Make redirect URI configurable in BuiltinIdPAuthProvider

## 0.9.2

### Patch Changes

- a33a031: Update packages

## 0.9.1

### Patch Changes

- 7fb8e40: - Force render on clientside to remove SSR console and node errors
  - Remove console error for nested buttons in DOM
  - Return `resolvedTheme` from `useTheme` hook to get the true theme to use when `system` theme is used

## 0.9.0

### Minor Changes

- 1ad6b3b: - Support module definition without a module-level component

  This can be done by providing a `defaultResourceRedirectPath` prop instead of a `component` in the `defineModule` call

## 0.8.2

### Patch Changes

- bbb2740: Support dynamic breadcrumb segment titles

## 0.8.1

### Patch Changes

- cbd605f: - Add `astw` prefix to tailwind classes to avoid global namespace clashes with consumer applications
  - Update padding around main content area

## 0.8.0

### Minor Changes

- b3c8e76: - Updates to Tailwind styles including classnames. `theme.css` is now exported for inclusion in consumer application tailwind `globals.css`
  - `defineResource`'s `meta.contentBorder` property now defaults to `false` if not provided
  - Removed the inset shadow for the sidebar-layout, and added a visual separator border to the sidebar
  - Move the sidebar icon inside the sidebar as per latest designs
  - Sidebar and Breadcrumb trail links now use react-router Link to ensure clientside navigation, if react-router context exists. (⚠️ Note this is untested in a non-react-router setting)

## 0.7.0

### Minor Changes

- 00ca998: Updates the style definition to bring over the class name and colours/other styles from frontend-platform-services: Console

  This file was used as a reference
  https://github.com/tailor-inc/platform-frontend-services/blob/main/apps/console/src/app/globals.css

  Todo in future: have these defined in just one place so we can use a centralised definition as base styles for multiple platforms

## 0.6.0

### Minor Changes

- c857b7e: Adds support for consumer applications to customize the UI

  - Customize icon for module:

    Optionally include an `icon` property within the defineModule meta property to render a custom icon, rather than using the default Table one.

    ```tsx
    defineModule({
    path: modulePath,
    component: ModulePageComponent,
    meta: {
        title: "Module Title",
        icon: <IconComponent />,
    },
    resources: [...],
    });
    ```

  - Make the content area border optional

    Removes the border around the content area if contentBorder is specified as `false`. (It defaults to true if unspecified)

    ```tsx
    defineResource({
      path: resourcePath,
      component: resourceComponent,
      meta: { contentBorder: false },
    });
    ```

  - Exports useTheme for consumers to get access to the theme being tracked by AppShell

    `import { useTheme } from "@tailor-platform/app-shell";`

## 0.5.0

### Minor Changes

- e9c56ae: Dark mode toggle
- 22fa03f: Design tweak: use built-in sidebar inset
- 54d8418: Fix breadcrumb labels

## 0.4.0

### Minor Changes

- 81cfb8c: Resource components can access title through props

  The value given to `meta.title` in a resource was rendered as the page title automatically, but this behaviour is removed by this change.

  Instead of that, the page title can be accessible through props given to the resoure component for more layout flexibility.

  ```tsx
  import {
    defineResource,
    ResourceComponentProps,
  } from "@tailor-platform/app-shell";

  const Page = (pageProps: ResourceComponentProps) => (
    <div>
      <h2 className="font-bold">{pageProps.title}</h2>
      <p className="pt-4">This is a page content</p>
    </div>
  );

  export const customPageResource = defineResource({
    path: "custom-page",
    component: Page,
    meta: {
      title: "Custom Page",
      category: "Examples",
    },
  });
  ```

- 2ce10bc: Module is a concept that groups multiple resources as a root.

  AppShell configuration accepts modules instead of resources with this change.

  ```diff
  <AppShell
    configurations={{
  -   resources: [someModule]
  +   modules: [someModule]
    }}
    {...otherProps}
  />
  ```

  Modules are defined with `defineModule` function, and it has `resources` property to give the child resources.

  ```tsx
  import { defineModule, defineResource } from "@tailor-platform/app-shell";

  const customPageModuleResource = defineResource({
    path: "sub",
    component: () => <p>This is a resource page</p>,
  });

  export const customPageModule = defineModule({
    path: "custom-page",
    component: () => <p>This is a module page</p>,
    resources: [customPageModuleResource],
  });
  ```

  A resource can also have multiple nested resources as deeply as needed recursively. `defineSubResource` function is oboleted.

  As of UI behaviour, the navigation shows only the first level of resources as sub items for the group that is a module.

## 0.3.0

### Minor Changes

- e724cd1: Upgrade tailwindcss to v4

## 0.2.0

### Minor Changes

- 22dc68c: Up until this release, AppShell did not support nested routes due to its limited routing implementation, but now it internally integrates react-router to support nested routes.

  It allows AppShell to be working as a standalone React application as well. A new app example that uses Vite instead of Next.js is added under `examples/vite-app`.

  AppShell is still usable as embedded Next.js route by levereging optional catch-all routes, but that's just an auxiliary interface.

  ### New functions

  To support nested routes, the following changes on functions to define resrouces are applied:

  #### `defineResource`

  A function to use the root-level resource that expects `title` and `category` as navigation metadata.

  ```tsx
  defineResource({
    path: "custom-page",
    component: () => <p>This is a custom page</p>,

    // Meta information
    meta: {
      title: "Custom Page",
      category: "Example",
    },
  });
  ```

  Behaviour on navigation UI: only the pages defined with `defineResource` function are the shown in navigation UI like sidebar items.

  #### `defineSubResource`

  A function to use the sub-level resource that expects only `title` as navigation metadata

  ```tsx
  defineResource({
    path: "custom-page",

    /*
     * (omitted...)
     */

    /*
     * Subresources works as the nested routes to the parent resource
     * Here defines the following two routes:
     * - /custom-page/sub-page
     * - /custom-page/sub-page/:id
     */
    subResources: [
      // Static route
      defineSubResource({
        path: "sub-page",
        component: () => (
          <p>This is a sub page</p>
        ),
        meta: {
          title: "Sub Page"
        }
      }),

      // Dynamic route
      defineSubResource({
        path: "sub-page/:id"
        component: () => (
          <p>This is is a sub page with dynamic parameter</p>
        )
      })
    ]
  })
  ```

  `defineSubResource` also accepts `subResources` as well to have nested children routes as many as you want.

## 0.1.0

### Minor Changes

- a9043b1: Initial release
