---
title: AppShell
description: The root component that provides routing, navigation, and theming for your application
---

# AppShell

`AppShell` is the root component that wires together routing, navigation, authentication, and theming for your AppShell application. It should wrap your entire application layout.

## Import

```tsx
import { AppShell } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx
import { AppShell, SidebarLayout, defineModule } from "@tailor-platform/app-shell"

const modules = [
  defineModule({
    path: "dashboard",
    component: DashboardPage,
    meta: { title: "Dashboard" },
  }),
]

function App() {
  return (
    <AppShell title="My ERP App" basePath="/app" modules={modules}>
      <SidebarLayout />
    </AppShell>
  )
}
```

## Props

### title

- **Type:** `string` (optional)
- **Description:** Application title displayed in the sidebar header

```tsx
<AppShell title="My ERP App" modules={modules}>
  {/* ... */}
</AppShell>
```

### icon

- **Type:** `React.ReactNode` (optional)
- **Description:** Application icon displayed in the sidebar header

```tsx
import { Building } from "lucide-react"
;<AppShell title="My App" icon={<Building />} modules={modules}>
  {/* ... */}
</AppShell>
```

### basePath

- **Type:** `string` (optional)
- **Default:** `""`
- **Description:** Base path prefix for all routes

```tsx
// Routes will be /app/dashboard, /app/products, etc.
<AppShell basePath="/app" modules={modules}>
  {/* ... */}
</AppShell>

// Routes will be /dashboard, /products, etc.
<AppShell basePath="" modules={modules}>
  {/* ... */}
</AppShell>
```

### modules

- **Type:** `Module[]` (required when not using file-based routing)
- **Description:** Array of module definitions that define your application structure

```tsx
import { defineModule, defineResource } from "@tailor-platform/app-shell"

const modules = [
  defineModule({
    path: "products",
    component: ProductsListPage,
    meta: { title: "Products" },
    resources: [
      defineResource({
        path: ":id",
        component: ProductDetailPage,
        meta: { title: "Product Details" },
      }),
    ],
  }),
]

;<AppShell modules={modules}>{/* ... */}</AppShell>
```

[Learn more about Modules and Resources →](../concepts/modules-and-resources.md)

### rootComponent

- **Type:** `() => React.ReactNode` (optional)
- **Description:** Component to render at the root path (e.g., `/app/`)

```tsx
<AppShell basePath="/app" modules={modules} rootComponent={() => <HomePage />}>
  {/* ... */}
</AppShell>
```

> **Tip:** For redirects from the root, use a guard with `redirectTo()` instead

```tsx
import { redirectTo } from "@tailor-platform/app-shell"
;<AppShell basePath="/app" modules={modules} rootComponent={() => redirectTo("/app/dashboard")}>
  {/* ... */}
</AppShell>
```

### settingsResources

- **Type:** `Resource[]` (optional)
- **Description:** Resources to include in the settings menu dropdown

```tsx
import { defineResource } from "@tailor-platform/app-shell"

const settingsResources = [
  defineResource({
    path: "profile",
    component: ProfileSettingsPage,
    meta: { title: "Profile" },
  }),
  defineResource({
    path: "billing",
    component: BillingSettingsPage,
    meta: { title: "Billing" },
  }),
]

;<AppShell modules={modules} settingsResources={settingsResources}>
  {/* ... */}
</AppShell>
```

Settings appear in a dropdown menu in the sidebar header, accessible via the settings icon.

### locale

- **Type:** `string` (optional)
- **Default:** Auto-detected from browser, falls back to `"en"`
- **Description:** Locale code for built-in UI strings

```tsx
<AppShell locale="ja" modules={modules}>
  {/* ... */}
</AppShell>
```

Supported locales: `en`, `ja`

[Learn more about Internationalization →](../guides/internationalization.md)

### errorBoundary

- **Type:** `ErrorBoundaryComponent` (optional)
- **Description:** Global error boundary component applied to all routes

```tsx
import { useRouteError } from "@tailor-platform/app-shell"

const GlobalErrorBoundary = () => {
  const error = useRouteError() as Error
  return (
    <div className="astw:p-8">
      <h1 className="astw:text-xl astw:font-bold astw:mb-4">Something went wrong</h1>
      <p className="astw:text-red-600">{error.message}</p>
    </div>
  )
}

;<AppShell modules={modules} errorBoundary={GlobalErrorBoundary}>
  {/* ... */}
</AppShell>
```

> **Note:** Module and resource-level error boundaries take precedence over the global error boundary.

### contextData

- **Type:** `ContextData` (optional)
- **Description:** Custom context data accessible from guards and components via `useAppShell()`

First, define your context data type using module augmentation:

```typescript
// types.d.ts
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      apiClient: ApiClient
      currentUser: User | null
      tenantId: string
    }
  }
}
```

Then pass the data to AppShell:

```tsx
// App.tsx
<AppShell
  modules={modules}
  contextData={{
    apiClient,
    currentUser,
    tenantId: "tenant-123",
  }}
>
  {/* ... */}
</AppShell>
```

Access the context data in your components:

```tsx
import { useAppShell } from "@tailor-platform/app-shell"

function MyComponent() {
  const { context } = useAppShell()

  // Fully typed!
  const user = context.currentUser
  const client = context.apiClient

  return <div>Welcome, {user?.name}</div>
}
```

Or in guards:

```tsx
import { pass, hidden } from "@tailor-platform/app-shell"

const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login")
  }
  return pass()
}
```

### children

- **Type:** `React.ReactNode` (required)
- **Description:** Layout component that renders your application content

Typically, you'll use `SidebarLayout`:

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell"
;<AppShell modules={modules}>
  <SidebarLayout />
</AppShell>
```

Or create a custom layout:

```tsx
<AppShell modules={modules}>
  <CustomLayout />
</AppShell>
```

## File-Based Routing Mode

When using the Vite plugin for file-based routing, use the special `WithPages` helper:

```tsx
// vite-env.d.ts (auto-generated by vite plugin)
/// <reference types="@tailor-platform/app-shell/vite-plugin" />

// App.tsx
import { AppShell } from "@tailor-platform/app-shell"

// No need to pass modules prop
;<AppShell.WithPages title="My App" basePath="/app">
  <SidebarLayout />
</AppShell.WithPages>
```

[Learn more about File-Based Routing →](../concepts/file-based-routing.md)

## Complete Example

Here's a complete example with all common features:

```tsx
import {
  AppShell,
  SidebarLayout,
  defineModule,
  defineResource,
  useRouteError,
} from "@tailor-platform/app-shell"
import { Building } from "lucide-react"

// Define context data type
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: User | null
    }
  }
}

// Error boundary
const ErrorBoundary = () => {
  const error = useRouteError() as Error
  return (
    <div className="astw:p-8">
      <h1 className="astw:text-xl astw:font-bold">Error</h1>
      <p>{error.message}</p>
    </div>
  )
}

// Modules
const modules = [
  defineModule({
    path: "dashboard",
    component: DashboardPage,
    meta: { title: "Dashboard" },
  }),
  defineModule({
    path: "products",
    component: ProductsPage,
    meta: { title: "Products" },
    resources: [
      defineResource({
        path: ":id",
        component: ProductDetailPage,
      }),
    ],
  }),
]

// Settings
const settingsResources = [
  defineResource({
    path: "profile",
    component: ProfilePage,
    meta: { title: "Profile" },
  }),
]

// App
function App() {
  const currentUser = useCurrentUser()

  return (
    <AppShell
      title="My ERP App"
      icon={<Building />}
      basePath="/app"
      modules={modules}
      settingsResources={settingsResources}
      locale="en"
      errorBoundary={ErrorBoundary}
      contextData={{ currentUser }}
    >
      <SidebarLayout />
    </AppShell>
  )
}

export default App
```

## Related Components

- [SidebarLayout](./sidebar-layout.md) - Default layout with sidebar navigation
- [CommandPalette](./command-palette.md) - Keyboard-driven navigation

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - Application structure
- [Authentication](../concepts/authentication.md) - User authentication setup
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation between pages

## API Reference

- [defineModule](../api/define-module.md) - Define a top-level module
- [defineResource](../api/define-resource.md) - Define a nested resource
- [useAppShell](../api/use-app-shell.md) - Access AppShell context
