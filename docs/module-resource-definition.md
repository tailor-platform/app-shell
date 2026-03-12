# Module and Resource Definition

AppShell will render the sidebar navigation, breadcrumbs and handle routing based on structured configuration of modules and resources (and sub-resources, sub-sub-resources and so on).

Modules and Resources both share core interface. Of interest:

- `path: string` - the path segment
- `component: (props: ResourceComponentProps) => ReactNode` - the component to render when the router navigates to that module/resource (optional — if omitted, the path returns a 404 while child routes remain accessible)
- `guards?: Guard[]` - optional array of guard functions to control access based on permissions or feature flags

A trivial `modules` example:

```tsx
import { defineModule, defineResource, pass, hidden } from "@tailor-platform/app-shell";

const appShellPropModule = [
  defineModule({
    path: "purchasing",
    component: PurchasingLandingPage,
    resources: [
      defineResource({
        path: "orders",
        component: OrdersPage,
        subResources: [
          defineResource({
            path: ":id",
            component: OrderDetailPage,
          }),
        ],
      }),
      defineResource({
        path: "invoices",
        component: PurchaseInvoicesPage,
        // ...
      }),
    ],
  }),
  defineModule({
    path: "sales",
    component: SalesLandingPage,
    resources: [
      defineResource({
        path: "invoices",
        component: SalesInvoicesPage,
        // ...
      }),
      // ...
    ],
  }),
  // Module without component — child resources are accessible, but /dashboard returns 404
  defineModule({
    path: "dashboard",
    resources: [
      defineResource({
        path: "overview",
        component: DashboardOverview,
      }),
      defineResource({
        path: "analytics",
        component: DashboardAnalytics,
      }),
    ],
  }),
  // Module with guards for access control
  defineModule({
    path: "reports",
    component: ReportsPage,
    resources: [reportsListResource],
    guards: [
      async ({ context, signal }) => {
        const ok = await fetch("/api/me/permissions?scope=reports", {
          signal,
        }).then((r) => r.ok);
        return ok ? pass() : hidden();
      },
    ],
  }),
];
```

Produces the following navigation menu:

```
› Purchasing
  - Orders
  - Invoices
› Sales
  - Invoices
  ...
› Reports  (only visible if user has reports permission)
```

Modules show as top-level menu items and resources are the sub-menu items. Sub-resources do not show up on the side navigation menu, but will be available via other navigation and show in breadcrumbs.

In the example above, clicking the 'Orders' menu item above will take you to `/{basePath}/purchasing/orders` and render the OrdersPage page. If you browse, either by direct request or via client-side navigation to `/{basePath}/purchasing/orders/1234`, AppShell will render OrderDetailPage with 'id' available via useParams

Providing a `component` for a Module is optional. If omitted, the module path itself returns a 404 response while its child resources remain accessible under their own paths. This is useful for grouping related resources under a shared path prefix without needing a landing page.

Providing a `component` for a Resource (via `defineResource()`) is also optional. Similarly, omitting it causes the resource path to return a 404, while any `subResources` remain accessible.

When guards are present on a component-less module or resource, they execute as expected. For example, a `redirectTo()` guard fires before the 404. If all guards return `pass()`, the path falls back to a 404.

```tsx
// Module without component — groups child resources under /admin
defineModule({
  path: "admin",
  meta: { title: "Admin" },
  resources: [
    defineResource({ path: "users", component: () => <Users /> }),
    defineResource({ path: "roles", component: () => <Roles /> }),
  ],
});
// /admin → 404
// /admin/users → renders Users
// /admin/roles → renders Roles

// Resource without component — groups sub-resources under a namespace
defineResource({
  path: "namespace",
  subResources: [defineResource({ path: "page-a", component: () => <div>Page A</div> })],
});
// /namespace → 404
// /namespace/page-a → renders Page A
```

> Read more about [client-side navigation](./routing-and-navigation.md) in AppShell apps

## Route Guards

Both modules and resources support `guards` - an array of functions that control access based on permissions, feature flags, or any other criteria. Guards are executed in order and provide:

- Composability: Combine multiple guards for complex access logic
- Reusability: Share common guards across routes
- Semantic constraints: Clear `pass()`, `hidden()`, or `redirectTo()` results

See the [Route Guards documentation](./api.md#route-guards) in the API reference for full details.

### Guard Examples

**Permission-based access:**

```tsx
import { defineModule, pass, hidden } from "@tailor-platform/app-shell";

const reportsModule = defineModule({
  path: "reports",
  component: ReportsPage,
  resources: [reportsListResource],
  guards: [
    async ({ context, signal }) => {
      const ok = await fetch("/api/me/permissions?scope=reports", {
        signal,
      }).then((r) => r.ok);
      return ok ? pass() : hidden();
    },
  ],
});
```

**Feature flag based:**

```tsx
import { pass, hidden } from "@tailor-platform/app-shell";

const betaFeaturesModule = defineModule({
  path: "beta",
  component: BetaFeaturesPage,
  resources: [newFeatureResource],
  guards: [
    async ({ context }) => {
      const enabled = await checkFeatureFlag("beta-features");
      return enabled ? pass() : hidden();
    },
  ],
});
```

**Tenant tier based:**

```tsx
import { pass, hidden } from "@tailor-platform/app-shell";

const billingModule = defineModule({
  path: "billing",
  component: BillingPage,
  resources: [billingResources],
  guards: [
    async ({ context }) => {
      const plan = await getCurrentTenantPlan();
      return plan === "enterprise" ? pass() : hidden();
    },
  ],
});
```

**Resource-level guards:**

```tsx
import { pass, hidden } from "@tailor-platform/app-shell";

defineResource({
  path: "admin-settings",
  component: AdminSettingsPage,
  guards: [
    async ({ context, signal }) => {
      const user = await getCurrentUser({ signal });
      return user.role === "admin" ? pass() : hidden();
    },
  ],
});
```

**Reusable guards:**

```tsx
import { type Guard, pass, hidden, redirectTo } from "@tailor-platform/app-shell";

// Define reusable guards
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login");
  }
  return pass();
};

const requireAdmin: Guard = ({ context }) => {
  if (context.currentUser?.role !== "admin") {
    return hidden();
  }
  return pass();
};

// Use in multiple resources
defineResource({
  path: "admin/users",
  component: AdminUsersPage,
  guards: [requireAuth, requireAdmin],
});
```

When a module or resource is hidden via guards, it will:

- Not appear in navigation menus
- Not be accessible via direct URL navigation
- Not appear in CommandPalette search results
