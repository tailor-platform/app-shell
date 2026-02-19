# File-Based Routing

File-based routing allows you to define pages by simply placing components in a directory structure, eliminating the need for explicit `defineModule()` and `defineResource()` calls.

## Motivation

### URL-First Design is Already the Norm

In practice, most projects naturally align their module/resource hierarchy with URL paths. A "purchasing" module at `/purchasing` with an "orders" resource at `/purchasing/orders` is the intuitive, conventional choice. The previous API required developers to manually wire up this structure even though the mapping between code organization and URL paths was already implicit.

### AI-Friendly Development

In the era of AI-assisted development, well-known conventions significantly improve collaboration with AI tools. By adopting file-based routing patterns pioneered by Next.js:
- AI tools can understand and navigate your codebase with less context
- Code generation becomes more predictable and consistent
- The established convention serves as shared knowledge between humans and AI

This results in more stable, reliable AI-assisted workflows—whether generating new pages, refactoring routes, or understanding existing code.

### Providing Rails, Not Just Flexibility

The legacy `defineModule()`/`defineResource()` API gave flexibility but offered few conventions. Teams had to decide their own:
- Directory structure for organizing page components
- Parent-children hierarchy management
- File naming conventions

This lack of "rails" led to inconsistent patterns across projects. File-based routing provides an opinionated, battle-tested convention that eliminates these decisions.

Importantly, file-based routing is implemented as a Vite plugin layer on top of the existing programmatic API. Internally, discovered pages are converted to the same `Module[]` structure used by `defineModule()`/`defineResource()`. This means:
- The core routing logic remains filesystem-agnostic
- Projects requiring non-standard routing can still use the programmatic API directly
- The convention is assistance, not a constraint

## Overview

Instead of manually assembling module/resource hierarchies, you define pages as files in a `pages/` directory. The path is automatically derived from the directory structure.

```
src/pages/
├── page.tsx                  # / (root path)
├── purchasing/
│   ├── page.tsx              # /purchasing
│   └── orders/
│       ├── page.tsx          # /purchasing/orders
│       └── [id]/
│           └── page.tsx      # /purchasing/orders/:id
└── (admin)/                  # Grouping (not included in path)
    └── settings/
        └── page.tsx          # /settings
```

## Setup

### 1. Configure Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { appShellRoutes } from '@tailor-platform/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    appShellRoutes(), // scans src/pages by default
  ],
});
```

### 2. Use AppShell (No Configuration Needed)

```tsx
// App.tsx
import { AppShell, SidebarLayout, DefaultSidebar } from '@tailor-platform/app-shell';

const App = () => {
  return (
    <AppShell title="My App">
      <SidebarLayout sidebar={<DefaultSidebar />} />
    </AppShell>
  );
};
```

Pages are automatically discovered and injected—no `modules` prop required!

## Page Components

### Minimal Example

The simplest page is just a default-exported component:

```tsx
// src/pages/about/page.tsx
export default () => <div>About</div>;
```

### Full Example

Use `appShellPageProps` static field to configure page metadata and guards:

```tsx
// src/pages/dashboard/page.tsx
import type { AppShellPageProps } from '@tailor-platform/app-shell';
import { authGuard } from '../guards';
import { DashboardIcon } from '../icons';

const DashboardPage = () => {
  return <div>Dashboard Content</div>;
};

DashboardPage.appShellPageProps = {
  meta: { 
    title: "Dashboard", 
    icon: <DashboardIcon />,
  },
  guards: [authGuard],
} satisfies AppShellPageProps;

export default DashboardPage;
```

### AppShellPageProps Type

```typescript
type AppShellPageProps = {
  meta?: { title: LocalizedString; icon?: ReactNode };
  guards?: Guard[];
};
```

## Path Conventions

| Directory Name | Converts To | Description |
|----------------|-------------|-------------|
| `orders` | `orders` | Static segment |
| `[id]` | `:id` | Dynamic parameter |
| `(group)` | (excluded) | Grouping only (not in path) |
| `_lib` | (ignored) | Not routed (for shared logic) |

### Examples

```
src/pages/
├── users/
│   ├── page.tsx              # /users
│   └── [userId]/
│       └── page.tsx          # /users/:userId
├── (marketing)/
│   ├── campaigns/
│   │   └── page.tsx          # /campaigns (not /marketing/campaigns)
│   └── analytics/
│       └── page.tsx          # /analytics
└── _utils/
    └── helpers.ts            # Not routed (shared utilities)
```

## Guards Inheritance

Guards defined on parent pages are automatically inherited by child pages:

```
/dashboard          guards: [authGuard]
/dashboard/orders   guards: [authGuard] (inherited)
/dashboard/orders/:id  guards: [authGuard] (inherited)
```

When a child page defines additional guards, they are merged with parent guards:

```tsx
// /dashboard/page.tsx
DashboardPage.appShellPageProps = {
  guards: [authGuard],
} satisfies AppShellPageProps;

// /dashboard/admin/page.tsx
AdminPage.appShellPageProps = {
  guards: [adminGuard],
} satisfies AppShellPageProps;
// → Effective guards: [authGuard, adminGuard]
```

## Typed Routes

Enable `generateTypedRoutes` in the Vite plugin to generate type-safe route helpers:

```typescript
// vite.config.ts
appShellRoutes({
  generateTypedRoutes: true,
})
```

This generates `src/routes.generated.ts` with a `paths` helper:

```tsx
import { paths } from './routes.generated';
import { Link } from '@tailor-platform/app-shell';

// Static routes
<Link to={paths.for("/dashboard")}>Dashboard</Link>

// Dynamic routes - params are type-checked
<Link to={paths.for("/dashboard/orders/:id", { id: orderId })}>Order</Link>

// TypeScript catches errors:
paths.for("/dashboard/orders/:id"); // Error: missing 'id'
paths.for("/invalid");              // Error: route doesn't exist
```

## Comparison with Legacy API

### Before: Explicit Hierarchy Assembly

```tsx
const orderDetailResource = defineResource({ path: ":id", component: OrderDetail });
const ordersResource = defineResource({ 
  path: "orders", 
  component: OrdersList,
  subResources: [orderDetailResource],
});
const purchasingModule = defineModule({ 
  path: "purchasing", 
  resources: [ordersResource],
});

<AppShell modules={[purchasingModule]} />
```

### After: File-Based Pages

```tsx
// src/pages/purchasing/orders/[id]/page.tsx
const OrderDetailPage = () => <div>Order Detail</div>;
OrderDetailPage.appShellPageProps = {
  meta: { title: "Order Detail" },
} satisfies AppShellPageProps;
export default OrderDetailPage;
```

```tsx
// App.tsx - No configuration needed
<AppShell title="My App">
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>
```

### Concept Mapping

| Legacy API | File-Based | Notes |
|------------|------------|-------|
| `Module` | — | First-level directory |
| `Resource` | — | Directory structure |
| `defineModule()` | — | Not needed |
| `defineResource()` | — | Not needed |
| `path` property | Directory name | Auto-derived |
| `component` property | `page.tsx` default export | File convention |
| `meta` property | `Page.appShellPageProps.meta` | Static field |
| `guards` property | `Page.appShellPageProps.guards` | Static field + auto-inheritance |
| `subResources` property | Subdirectories | Auto-derived |

## Compatibility

File-based pages and explicit `modules` prop are **mutually exclusive**.

### Usage Patterns

```tsx
// ✅ Pattern 1: File-based pages with plugin (recommended)
// vite.config.ts has plugin configured
<AppShell title="My App">
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>

// ✅ Pattern 2: Explicit modules without plugin (legacy)
<AppShell modules={[myModule]} title="My App">
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>

// ✅ Pattern 3: Plugin enabled + modules prop (modules takes precedence)
// Even with plugin enabled, modules prop is used when provided
<AppShell modules={[myModule]} title="My App">
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>

// ❌ Pattern 4: No plugin + no modules (runtime error)
<AppShell title="My App">
  {/* → Runtime error: No routes configured */}
</AppShell>
```

## Migration Guide

To migrate from `defineModule`/`defineResource` to file-based routing:

1. **Add Vite Plugin**
   ```typescript
   // vite.config.ts
   import { appShellRoutes } from '@tailor-platform/vite-plugin';
   
   export default defineConfig({
     plugins: [
       react(),
       appShellRoutes(),
     ],
   });
   ```

2. **Create pages directory structure**
   - Map each module to a top-level directory
   - Map each resource to a subdirectory with `page.tsx`
   - Use `[param]` for dynamic segments

3. **Move component and metadata**
   ```tsx
   // Before: defineResource({ path: "orders", component: Orders, meta: {...} })
   
   // After: src/pages/orders/page.tsx
   const OrdersPage = () => <Orders />;
   OrdersPage.appShellPageProps = { meta: {...} };
   export default OrdersPage;
   ```

4. **Remove `modules` prop** from `<AppShell>` once all pages are migrated
