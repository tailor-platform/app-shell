---
title: defineModule
description: Define a top-level module that appears in the main navigation
---

# defineModule

Creates a top-level module that appears in the main navigation. Modules can contain resources and optionally have their own landing page component.

## Signature

```typescript
function defineModule(props: DefineModuleProps): Module
```

## Parameters

### `path`
- **Type:** `string`
- **Required:** Yes
- **Description:** URL path segment for the module

```typescript
defineModule({
  path: "products", // URL: /products
})
```

### `component`
- **Type:** `(props: ResourceComponentProps) => React.ReactNode`
- **Required:** No
- **Description:** Landing page component for the module. If omitted, module redirects to first resource.

**ResourceComponentProps:**
```typescript
{
  title: string;          // Resolved title
  icon?: React.ReactNode; // Module icon
  resources?: Resource[]; // Child resources
}
```

### `resources`
- **Type:** `Resource[]`
- **Required:** Yes
- **Description:** Array of resources within this module. Define using `defineResource()`.

### `meta`
- **Type:** `object`
- **Required:** No
- **Description:** Metadata configuration for the module

**meta.title**
- **Type:** `string | LocalizedString`
- **Default:** Capitalized `path`
- **Description:** Display title in navigation and breadcrumbs

**meta.icon**
- **Type:** `React.ReactNode`
- **Description:** Icon displayed in sidebar navigation

**meta.breadcrumbTitle**
- **Type:** `string | ((segment: string) => string)`
- **Description:** Custom breadcrumb segment title override

### `guards`
- **Type:** `Guard[]`
- **Required:** No
- **Description:** Access control guards executed in order. If any guard returns non-pass, access is denied.

See [Guards Overview](./guards/overview.md) for details.

### `errorBoundary`
- **Type:** `React.ReactNode`
- **Required:** No
- **Description:** Error boundary component for this module and its child resources. Use `useRouteError` hook to access error details.

### `loader`
- **Type:** `(args: LoaderFunctionArgs) => Promise<unknown> | unknown`
- **Required:** No
- **Description:** React Router loader function for data fetching

## Return Type

```typescript
Module
```

A module object that can be passed to the `modules` prop of `AppShell`.

## Examples

### Basic Module

```typescript
import { defineModule } from "@tailor-platform/app-shell";

const dashboardModule = defineModule({
  path: "dashboard",
  component: () => <h1>Dashboard</h1>,
  resources: [],
});
```

### Module with Icon and Title

```typescript
import { Home } from "lucide-react";

const dashboardModule = defineModule({
  path: "dashboard",
  meta: {
    title: "Dashboard",
    icon: <Home />,
  },
  component: DashboardPage,
  resources: [],
});
```

### Module with Resources

```typescript
const productsModule = defineModule({
  path: "products",
  component: ProductsListPage,
  resources: [
    defineResource({
      path: ":id",
      component: ProductDetailPage,
    }),
    defineResource({
      path: "categories",
      component: CategoriesPage,
    }),
  ],
});
```

### Module without Component (Auto-redirect)

```typescript
const dashboardModule = defineModule({
  path: "dashboard",
  // No component - automatically redirects to first resource
  resources: [
    defineResource({
      path: "overview",
      component: OverviewPage,
    }),
    defineResource({
      path: "analytics",
      component: AnalyticsPage,
    }),
  ],
});
```

### Module with Guards

```typescript
import { pass, hidden } from "@tailor-platform/app-shell";

const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  resources: [adminResources],
  guards: [
    ({ context }) => {
      return context.currentUser?.role === "admin"
        ? pass()
        : hidden();
    },
  ],
});
```

### Module with Error Boundary

```typescript
import { useRouteError } from "@tailor-platform/app-shell";

const ErrorBoundary = () => {
  const error = useRouteError() as Error;
  return (
    <div>
      <h1>Module Error</h1>
      <p>{error.message}</p>
    </div>
  );
};

const productsModule = defineModule({
  path: "products",
  component: ProductsPage,
  resources: [],
  errorBoundary: <ErrorBoundary />,
});
```

### Module with Internationalization

```typescript
import { defineI18nLabels } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  dashboard: {
    en: "Dashboard",
    ja: "ダッシュボード",
  },
});

const dashboardModule = defineModule({
  path: "dashboard",
  meta: {
    title: labels.t("dashboard"),
  },
  component: DashboardPage,
  resources: [],
});
```

## TypeScript

```typescript
import { type DefineModuleProps, type Module } from "@tailor-platform/app-shell";

const props: DefineModuleProps = {
  path: "products",
  component: ProductsPage,
  resources: [],
};

const module: Module = defineModule(props);
```

## Related

- [defineResource](./define-resource.md) - Define nested resources
- [Guards Overview](./guards/overview.md) - Access control
- [defineI18nLabels](./define-i18n-labels.md) - Internationalization
- [Modules & Resources Concept](../concepts/modules-and-resources.md) - Detailed guide
