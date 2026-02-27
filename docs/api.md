# AppShell API

## Table of Contents
- [AppShell](#appshell)
- [defineModule](#definemodule)
- [defineResource](#defineresource)
- [Route Guards](#route-guards)
  - [pass](#pass)
  - [hidden](#hidden)
  - [redirectTo](#redirectto)
- [SidebarLayout](#sidebarlayout)
- [DefaultSidebar](#defaultsidebar)
- [WithGuard](#withguard)
- [CommandPalette](#commandpalette)
- [Badge](#badge)
- [DescriptionCard](#descriptioncard)
- [Layout](#layout)
- [useAppShell](#useappshell)
- [useAppShellConfig](#useappshellconfig)
- [useAppShellData](#useappshelldata)
- [usePageMeta](#usepagemeta)
- [useTheme](#usetheme)
- [useRouteError](#userouteerror)
- [defineI18nLabels](#definei18nlabels)
- [AuthProvider](#authprovider)
- [useAuth](#useauth)

## AppShell

The root level component that works as a React Provider. This component is expected to be used by being mounted at a catch-all segment in Next.js App Router, or the root component of any React application.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | App shell title |
| `icon` | `React.ReactNode` | No | App shell icon |
| `basePath` | `string` | No | Base path for the app shell |
| `modules` | `Module[]` | Yes | Navigation configuration |
| `settingsResources` | `Resource[]` | No | Resources that appear only in Settings menu |
| `locale` | `string` | No | Locale code for built-in UI strings (accepts any string, e.g., "en", "ja", "fr"). Built-in translations available for "en" and "ja" only. Auto-detects from browser if not provided, defaults to "en" |
| `contextData` | `ContextData` | No | Custom context data passed to guards and accessible via `useAppShell()`. Use TypeScript module augmentation with `AppShellRegister` to define the type |
| `errorBoundary` | `React.ReactNode` | No | Global error boundary (auto-applied by default, pass `null` to disable) |
| `children` | `React.ReactNode` | No | Layout components (e.g., SidebarLayout) |

### Example
```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => {
  const apiClient = useApiClient();
  const currentUser = useCurrentUser();

  const appShellConfig = {
    title: "My Application",
    icon: <CustomIcon />,
    basePath: "dashboard",
    modules: [customModule, productModule],
    locale: "en", // Optional: any locale code, auto-detects from browser if omitted
    contextData: {
      apiClient,
      currentUser,
    },
  };

  return (
    <AppShell {...appShellConfig}>
      <SidebarLayout />
    </AppShell>
  );
};
```

**See also:**
- [Context Data](#context-data) for type-safe context data usage
- [Route Guards](#route-guards) for accessing context in guards

## defineModule

Creates a top-level module that appears in the main navigation. Modules contain resources and can optionally have their own landing page.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | URL path for the module |
| `meta` | `object` | No | Metadata configuration |
| `meta.title` | `string` | No | Display title (defaults to path in capital case) |
| `meta.icon` | `React.ReactNode` | No | Icon displayed in navigation |
| `meta.breadcrumbTitle` | `string \| function` | No | Custom breadcrumb title |
| `resources` | `Resource[]` | Yes | [sub-resources](#defineresource) within this module |
| `component` | `function` | No | Landing page component (receives ResourceComponentProps). Optional - if omitted, module redirects to first resource |
| `errorBoundary` | `React.ReactNode` | No | Error boundary for this module and its resources |
| `guards` | `Guard[]` | No | Array of guard functions to control access. See [Route Guards](#route-guards) |

**ResourceComponentProps:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Title of the resource |
| `icon` | `React.ReactNode \| undefined` | Optional icon |
| `resources` | `Resource[] \| undefined` | Optional sub-resources |

### Example
```tsx
import { defineModule, defineResource, ResourceComponentProps, pass, hidden, redirectTo } from "@tailor-platform/app-shell";
import { Package } from "lucide-react";

// Module with component
const productModule = defineModule({
  path: "products",
  meta: {
    title: "Product Management",
    icon: <Package />,
  },
  component: ({ title, resources }: ResourceComponentProps) => (
    <div>
      <h1>{title} Dashboard</h1>
      <p>Total resources: {resources?.length || 0}</p>
    </div>
  ),
  resources: [inventoryPage, categoriesPage], 
});

// Module without component - automatically redirects to first resource
const reportsModule = defineModule({
  path: "reports",
  meta: {
    title: "Reports",
    icon: <BarChart />,
  },
  // No component - will redirect to /reports/sales
  resources: [
    defineResource({
      path: "sales",
      component: () => <SalesReport />
    }),
    defineResource({
      path: "users",
      component: () => <UserReport />
    })
  ]
});

// Module with guards for access control
const adminModule = defineModule({
  path: "admin",
  component: AdminDashboard,
  resources: [adminResources],
  guards: [
    ({ context }) => {
      if (!context.currentUser) {
        return redirectTo("/login");
      }
      if (context.currentUser.role !== "admin") {
        return hidden(); // Shows 404
      }
      return pass();
    }
  ]
});

// Module with redirect guard
const settingsModule = defineModule({
  path: "settings",
  resources: [
    defineResource({
      path: "general",
      component: () => <GeneralSettings />
    })
  ],
  guards: [() => redirectTo("settings/general")]
});
```

## Route Guards

Route guards control access to modules and resources. Guards are executed in order, and the first non-`pass` result stops the chain.

### Types

```typescript
type Guard = (context: GuardContext) => GuardResult | Promise<GuardResult>;

type GuardContext = {
  params: Record<string, string>;    // URL parameters
  searchParams: URLSearchParams;     // Query parameters
  signal: AbortSignal;               // For canceling async operations
  context: ContextData;              // Custom context data from AppShell
};

type GuardResult = 
  | { type: "pass" }      // Allow access
  | { type: "hidden" }    // Deny access (shows 404)
  | { type: "redirect", to: string };  // Redirect to another path
```

### pass

Helper function that allows access to the route.

**Returns:** `GuardResult` with type "pass"

```tsx
import { pass } from "@tailor-platform/app-shell";

const myGuard: Guard = () => pass();
```

### hidden

Helper function that denies access to the route (shows 404 page).

**Returns:** `GuardResult` with type "hidden"

```tsx
import { hidden } from "@tailor-platform/app-shell";

const requireAdmin: Guard = ({ context }) => {
  return context.currentUser?.role === "admin" ? pass() : hidden();
};
```

### redirectTo

Helper function that redirects to another path.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Path to redirect to (e.g., "/login", "dashboard/overview") |

**Returns:** `GuardResult` with type "redirect"

```tsx
import { redirectTo } from "@tailor-platform/app-shell";

const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) return redirectTo("/login");
  return pass();
};
```

**See:** [Module & Resource Definition](./module-resource-definition.md#route-guards) for usage examples and patterns.

## defineResource

Creates a resource that can be nested within modules or other resources. Resources represent individual pages or features.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | URL path (supports dynamic segments like :id) |
| `component` | `function` | Yes | Component to render (receives ResourceComponentProps) |
| `meta` | `object` | No | Metadata configuration |
| `meta.title` | `string` | No | Display title (defaults to path in capital case) |
| `meta.icon` | `React.ReactNode` | No | Icon for navigation |
| `meta.breadcrumbTitle` | `string \| function` | No | Custom breadcrumb title |
| `subResources` | `Resource[]` | No | Nested resources |
| `errorBoundary` | `React.ReactNode` | No | Error boundary for this resource (overrides module/global) |
| `guards` | `Guard[]` | No | Array of guard functions to control access. See [Route Guards](#route-guards) |

### Example
```tsx
const productResource = defineResource({
  path: "products",
  meta: {
    title: "Product List",
    icon: <Package />,
  },
  component: ({ title }) => <ProductList title={title} />,
  subResources: [
    defineResource({
      path: ":productSlug",
      meta: { 
        title: "Product Details",
        breadcrumbTitle: (productSlug) => `Product ${productSlug}`
      },
      component: () => {
        const { productSlug } = useParams();
        return <ProductDetails productSlug={productSlug} />;
      },
      subResources: [
        defineResource({
          path: "edit",
          meta: { title: "Edit Product" },
          component: () => <ProductEditForm />
        })
      ]
    })
  ]
});
```

## SidebarLayout

Default layout component that provides sidebar navigation and header. Should be used as a child of AppShell.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `function` | No | Render prop that receives `{ Outlet }` |
| `sidebar` | `React.ReactNode` | No | Custom sidebar component (defaults to DefaultSidebar) |
| `header` | `React.ReactNode` | No | Custom header component |

### Example
```tsx
// Simple usage with defaults
<AppShell {...config}>
  <SidebarLayout />
</AppShell>

// Custom content wrapper
<AppShell {...config}>
  <SidebarLayout>
    {({ Outlet }) => (
      <div className="custom-wrapper">
        <Outlet />
      </div>
    )}
  </SidebarLayout>
</AppShell>

// Fully custom sidebar
<AppShell {...config}>
  <SidebarLayout
    sidebar={<CustomSidebar />}
    header={<CustomHeader />}
  />
</AppShell>
```

## Layout

Responsive column layout component that automatically handles 1, 2, or 3 column layouts with responsive behavior. All columns are always rendered and wrap responsively based on container width (not viewport width), making it work correctly when placed inside narrow containers.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `1 \| 2 \| 3` | Yes | Number of columns |
| `title` | `string` | No | Optional header title displayed above the layout |
| `actions` | `React.ReactNode[]` | No | Optional array of action buttons displayed in the header (e.g., Save, Cancel) |
| `className` | `string` | No | Additional CSS classes |
| `gap` | `4 \| 6 \| 8` | No | Gap between columns in Tailwind units (default: 4 = 16px, 6 = 24px, 8 = 32px) |
| `children` | `React.ReactNode` | Yes | Should be `Layout.Column` components |

### Responsive Behavior

**Note:** The Layout component responds to its container width, not the viewport width. This ensures it works correctly when placed inside narrow containers or single columns.

- **1 Column**: Always displays as 1 column at all container sizes
- **2 Columns**: 
  - Container width < 1024px: Both columns stack vertically
  - Container width ≥ 1024px: 2 columns side-by-side
    - First column: Minimum 560px, flexible (grows to fill remaining space)
    - Second column: Fixed 360px width
- **3 Columns**:
  - Container width < 960px: All 3 columns stack vertically (order: Column 3, Column 2, Column 1 from top to bottom)
  - Container width 960px - 1199px: Top row has columns 2 and 3 side-by-side, column 1 moves below column 2
    - Column 2: Minimum 550px, flexible (top left)
    - Column 3: Fixed 360px (top right)
    - Column 1: Fixed 360px (below column 2)
  - Container width ≥ 1200px: All 3 columns side-by-side
    - Column 1: Fixed 360px
    - Column 2: Minimum 550px, flexible
    - Column 3: Fixed 360px

### Example

```tsx
import { Layout } from "@tailor-platform/app-shell";

// Basic 2 Column Layout
<Layout columns={2}>
  <Layout.Column>
    <div>Main content</div>
  </Layout.Column>
  <Layout.Column>
    <div>Side panel</div>
  </Layout.Column>
</Layout>

// With header title and action buttons
<Layout 
  columns={2} 
  title="Edit Product"
  actions={[
    <Button key="cancel" variant="secondary">Cancel</Button>,
    <Button key="save">Save</Button>,
  ]}
>
  <Layout.Column>
    <div>Main content</div>
  </Layout.Column>
  <Layout.Column>
    <div>Side panel</div>
  </Layout.Column>
</Layout>

// 3 Column Layout
<Layout columns={3}>
  <Layout.Column>
    <div>Column 1</div>
  </Layout.Column>
  <Layout.Column>
    <div>Column 2</div>
  </Layout.Column>
  <Layout.Column>
    <div>Column 3</div>
  </Layout.Column>
</Layout>

// With custom gap
<Layout columns={2} gap={8}>
  <Layout.Column>Content 1</Layout.Column>
  <Layout.Column>Content 2</Layout.Column>
</Layout>
```

### Usage in Resources

```tsx
defineResource({
  path: "dashboard",
  component: ({ title }) => (
    <Layout columns={2}>
      <Layout.Column>
        <div>Left Panel</div>
      </Layout.Column>
      <Layout.Column>
        <div>Right Panel</div>
      </Layout.Column>
    </Layout>
  )
})
```

## DefaultSidebar

The default sidebar component that renders navigation items from the AppShell context.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `header` | `React.ReactNode` | No | Custom header content |
| `footer` | `React.ReactNode` | No | Custom footer content |

### Example

```tsx
import { DefaultSidebar } from "@tailor-platform/app-shell";

const CustomLayout = () => (
  <DefaultSidebar 
    header={<CompanyLogo />}
    footer={<UserProfile />}
  />
);
```

## WithGuard

Conditionally renders children based on guard evaluation. Use this component to control visibility of UI elements (e.g., sidebar items) based on the same guard logic used in route definitions.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `guards` | `Guard[]` | Yes | Array of guard functions. All must pass for children to render |
| `children` | `React.ReactNode` | Yes | Content to render when all guards pass |
| `fallback` | `React.ReactNode` | No | Content to render when any guard returns `hidden()` (default: `null`) |
| `loading` | `React.ReactNode` | No | Content to render while async guards are being evaluated (default: `null`) |

### Behavior

- Guards are evaluated in order
- If any guard returns `hidden()`, the fallback is rendered instead of children
- Supports async guards with Suspense integration
- Unlike route guards, `redirectTo()` is not supported in `WithGuard`
- Use `hidden()` with a fallback that handles navigation if needed

### Example

```tsx
import { WithGuard, pass, hidden, DefaultSidebar, SidebarItem } from "@tailor-platform/app-shell";
import { Shield } from "lucide-react";

// Define guard functions
const isAdminGuard = ({ context }) =>
  context.currentUser.role === "admin" ? pass() : hidden();

const hasRole = (role: string) => ({ context }) =>
  context.currentUser.role === role ? pass() : hidden();

// Use in sidebar
<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  
  <WithGuard guards={[isAdminGuard]}>
    <SidebarItem to="/admin" />
  </WithGuard>
  
  <WithGuard guards={[hasRole("manager")]}>
    <SidebarItem to="/reports" />
  </WithGuard>
</DefaultSidebar>

// Use in page components with fallback
<WithGuard guards={[isAdminGuard]} fallback={<UpgradePrompt />}>
  <AdminPanel />
</WithGuard>

// With loading state for async guards
<WithGuard 
  guards={[checkSubscription]} 
  loading={<Spinner />}
  fallback={<UpgradePrompt />}
>
  <PremiumFeature />
</WithGuard>
```

**See also:**
- [Sidebar Navigation - Access Control](./sidebar-navigation.md#access-control) for sidebar-specific usage
- [Route Guards](#route-guards) for guard function reference

## CommandPalette

Keyboard-driven quick navigation component for searching and navigating between pages.

### Props

No props required - the component automatically reads module configurations from AppShell context.

### Features

- Global keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- Fuzzy search by page title or path
- Keyboard navigation with arrow keys and Enter
- Hierarchical breadcrumb display for nested resources
- Supports both English and Japanese locales

### Example

```tsx
import { AppShell, CommandPalette, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => (
  <AppShell modules={modules} locale="en">
    <>
      <SidebarLayout />
      <CommandPalette />
    </>
  </AppShell>
);
```

## Badge

Status badge component with semantic variants for displaying tags, statuses, and labels.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `BadgeVariant` | No | Badge style variant (defaults to "default") |
| `children` | `React.ReactNode` | Yes | Badge content |
| `className` | `string` | No | Additional CSS classes |

**Available Variants:**
- `default` - Primary color badge
- `success` - Green background, white text
- `warning` - Yellow background, white text
- `error` - Red/destructive background, white text
- `neutral` - Secondary color badge
- `outline-success` - Outlined with green status dot
- `outline-warning` - Outlined with orange status dot
- `outline-error` - Outlined with red status dot
- `outline-info` - Outlined with blue status dot
- `outline-neutral` - Outlined with neutral status dot

### Example

```tsx
import { Badge } from "@tailor-platform/app-shell";

const StatusDisplay = () => (
  <div>
    <Badge variant="success">Active</Badge>
    <Badge variant="warning">Pending</Badge>
    <Badge variant="error">Failed</Badge>
    <Badge variant="outline-success">Confirmed</Badge>
  </div>
);
```

## DescriptionCard

Card component for displaying structured key-value information, commonly used in ERP document views like orders, invoices, and product details.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Record<string, unknown>` | Yes | Raw data object containing field values |
| `title` | `string` | Yes | Card title displayed in header |
| `fields` | `FieldConfig[]` | Yes | Array of field configurations and dividers |
| `columns` | `3 \| 4` | No | Number of columns on desktop (defaults to 3) |
| `className` | `string` | No | Additional CSS classes |
| `headerAction` | `React.ReactNode` | No | Action button/component in card header (e.g., edit button) |

**FieldConfig Types:**

Field Definition:
| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Path to value in data object (supports dot notation like "customer.name") |
| `label` | `string` | Display label for the field |
| `type` | `FieldType` | Field type: "text", "badge", "money", "date", "link", "address", "reference" |
| `meta` | `FieldMeta` | Optional field-specific configuration |
| `emptyBehavior` | `"dash" \| "hide"` | How to handle empty values (defaults to "dash") |

Divider:
| Property | Type | Description |
|----------|------|-------------|
| `type` | `"divider"` | Creates a horizontal line between field sections |

**FieldMeta Options:**

| Property | Type | Description |
|----------|------|-------------|
| `copyable` | `boolean` | Show copy button for this field |
| `badgeVariantMap` | `Record<string, BadgeVariant>` | Map field values to badge variants |
| `currencyKey` | `string` | Path to currency code in data (for money fields) |
| `hrefKey` | `string` | Path to URL in data (for link fields) |
| `external` | `boolean` | Open link in new tab (for link fields) |
| `dateFormat` | `"short" \| "medium" \| "long" \| "relative"` | Date display format |
| `referenceIdKey` | `string` | Path to reference document ID |
| `referenceUrlPattern` | `string` | URL pattern for reference links (use {id} placeholder) |
| `tooltip` | `string` | Tooltip text |
| `truncateLines` | `number` | Truncate text after N lines (shows tooltip with full text) |

### Features

- 7 built-in field types with specialized rendering
- Responsive grid layout (4 → 3 → 2 → 1 columns based on container width)
- Automatic badge value conversion to sentence case (e.g., "CONFIRMED" → "Confirmed")
- Text truncation with tooltip for long content
- Section dividers for visual grouping
- Empty value handling (show dash or hide field)

### Example

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";

const OrderDetails = ({ order }) => (
  <DescriptionCard
    data={order}
    title="Order Summary"
    headerAction={<EditButton />}
    columns={3}
    fields={[
      // Badge field with variant mapping
      {
        key: "status",
        label: "Status",
        type: "badge",
        meta: {
          badgeVariantMap: {
            CONFIRMED: "outline-success",
            PENDING: "outline-warning",
            CANCELLED: "outline-error",
          },
        },
      },
      
      // Text field with copy button
      {
        key: "orderNumber",
        label: "Order #",
        meta: { copyable: true },
      },
      
      // Money field with currency
      {
        key: "total",
        label: "Total",
        type: "money",
        meta: { currencyKey: "currency" },
      },
      
      // Date field with format
      {
        key: "createdAt",
        label: "Created",
        type: "date",
        meta: { dateFormat: "medium" },
      },
      
      // Section divider
      { type: "divider" },
      
      // Reference field with link
      {
        key: "customer.name",
        label: "Customer",
        type: "reference",
        meta: {
          referenceIdKey: "customer.id",
          referenceUrlPattern: "/customers/{id}",
        },
      },
      
      // Text field with truncation
      {
        key: "notes",
        label: "Notes",
        meta: { truncateLines: 2 },
      },
      
      // Address field (full width)
      {
        key: "shippingAddress",
        label: "Shipping Address",
        type: "address",
      },
    ]}
  />
);
```

## useAppShell

React hook to access AppShell context data including navigation items, configuration, and custom context data.

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string \| undefined` | App title |
| `icon` | `React.ReactNode \| undefined` | App icon |
| `configurations` | `object` | Configuration object |
| `configurations.basePath` | `string \| undefined` | Base path |
| `configurations.modules` | `Module[]` | Registered modules |
| `configurations.settingsResources` | `Resource[]` | Resources that appear only in Settings menu |
| `navItems` | `NavItem[]` | Processed navigation items |
| `navItems[].title` | `string` | Item title |
| `navItems[].url` | `string \| undefined` | Item URL |
| `navItems[].icon` | `React.ReactNode` | Item icon |
| `navItems[].isActive` | `boolean` | Whether item is active |
| `navItems[].items` | `Array<{title, url}>` | Sub-items |
| `contextData` | `ContextData` | Custom context data passed to AppShell (type-safe via `AppShellRegister`) |

### Example
```tsx
import { useAppShell } from "@tailor-platform/app-shell";

const CustomNavigation = () => {
  const { navItems, title, configurations, contextData } = useAppShell();
  
  return (
    <nav>
      <h1>{title}</h1>
      <p>Base path: {configurations.basePath}</p>
      <p>User: {contextData.currentUser?.name}</p>
      <ul>
        {navItems.map((item) => (
          <li key={item.url}>
            {item.icon} {item.title}
            {item.items?.map((subItem) => (
              <a key={subItem.url} href={subItem.url}>
                {subItem.title}
              </a>
            ))}
          </li>
        ))}
      </ul>
    </nav>
  );
};
```

## useAppShellConfig

React hook to access only the AppShell configuration (title, icon, basePath, modules, settingsResources). This is a lighter alternative to `useAppShell` when you only need configuration data.

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string \| undefined` | App title |
| `icon` | `React.ReactNode \| undefined` | App icon |
| `basePath` | `string \| undefined` | Base path |
| `modules` | `Module[]` | Registered modules |
| `settingsResources` | `Resource[]` | Resources that appear only in Settings menu |

### Example
```tsx
import { useAppShellConfig } from "@tailor-platform/app-shell";

const AppInfo = () => {
  const { title, basePath } = useAppShellConfig();
  
  return (
    <div>
      <h2>{title}</h2>
      <p>Base: {basePath}</p>
    </div>
  );
};
```

## useAppShellData

React hook to access only the custom context data. This is a lighter alternative to `useAppShell` when you only need the contextData.

### Returns

| Type | Description |
|------|-------------|
| `ContextData` | Custom context data passed to AppShell (type-safe via `AppShellRegister`) |

### Example
```tsx
import { useAppShellData } from "@tailor-platform/app-shell";

const UserProfile = () => {
  const contextData = useAppShellData();
  
  return (
    <div>
      <p>Welcome, {contextData.currentUser?.name}</p>
      <p>Role: {contextData.currentUser?.role}</p>
    </div>
  );
};
```

## usePageMeta

Hook to retrieve page metadata (title and icon) for a given URL path. Useful for building custom navigation components or displaying page information.

### Signature

```typescript
const usePageMeta: (path: string) => PageMeta | null;

type PageMeta = {
  title: string;
  icon?: ReactNode;
};
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | URL path to find meta for (e.g., "/products/all") |

### Returns

| Type | Description |
|------|-------------|
| `PageMeta \| null` | Object containing `title` and optional `icon` if found, or `null` for external links or when path is not found |

### Example

```tsx
import { usePageMeta } from "@tailor-platform/app-shell";

// Display current page metadata
const PageHeader = () => {
  const location = useLocation();
  const pageMeta = usePageMeta(location.pathname);
  
  if (!pageMeta) {
    return <h1>Unknown Page</h1>;
  }
  
  return (
    <h1>
      {pageMeta.icon}
      {pageMeta.title}
    </h1>
  );
};

// Custom navigation item
const CustomNavItem = ({ to }: { to: string }) => {
  const pageMeta = usePageMeta(to);
  
  return (
    <Link to={to}>
      {pageMeta?.icon}
      <span>{pageMeta?.title || to}</span>
    </Link>
  );
};
```

**See also:**
- [Sidebar Navigation - SidebarItem](./sidebar-navigation.md#sidebaritem) which uses this hook internally

## useTheme

Hook for managing application theme (light/dark/system).

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `theme` | `"dark" \| "light" \| "system"` | Current theme setting |
| `resolvedTheme` | `"dark" \| "light"` | Actual theme after system resolution |
| `setTheme` | `function` | Function to update theme |

### Example
```tsx
import { useTheme } from "@tailor-platform/app-shell";

const CustomThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("system")}>System</button>
    </div>
  );
};
```

## useRouteError

Hook to access error details within a custom error boundary component. Re-exported from react-router.

### Returns

| Type | Description |
|------|-------------|
| `unknown` | The error that was thrown (typically `Error` object or route error response) |

### Example
```tsx
import { useRouteError } from "@tailor-platform/app-shell";

const CustomErrorBoundary = () => {
  const error = useRouteError();

  // Handle the error
  const message = error instanceof Error
    ? error.message
    : "An unexpected error occurred";

  return (
    <div>
      <h1>Something went wrong</h1>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>
        Try Again
      </button>
    </div>
  );
};

// Use in module or resource definition
const myModule = defineModule({
  path: "dashboard",
  component: DashboardPage,
  errorBoundary: <CustomErrorBoundary />,
  resources: [...]
});
```

## defineI18nLabels

Function for defining internationalization labels for multiple locales with type-safe usage.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `labels` | `object` | Yes | Object with locale keys (`en` required) containing label definitions |

Each locale object can contain:
- Static string labels: `key: "Label text"`
- Dynamic function labels: `key: (args: T) => string`

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `useT` | `function` | React hook that returns a translator function for use in components |
| `t` | `function` | Function to get a `LocalizedString` for use in module/resource meta.title |

### Example

```tsx
// i18n-labels.ts
import { defineI18nLabels } from "@tailor-platform/app-shell";

export const labels = defineI18nLabels({
  en: {
    welcome: "Welcome to our app",
    greeting: (args: { name: string }) => `Hello, ${args.name}!`,
    itemCount: (args: { count: number }) => `${args.count} items`,
  },
  ja: {
    welcome: "アプリへようこそ",
    greeting: (args: { name: string }) => `こんにちは、${args.name}さん！`,
    itemCount: (args: { count: number }) => `${args.count}個のアイテム`,
  },
});

// Export useT hook
export const useT = labels.useT;
```

Use in components:

```tsx
import { useT } from "./i18n-labels";

const MyComponent = () => {
  const t = useT();
  
  return (
    <div>
      {/* Static label */}
      <h1>{t("welcome")}</h1>
      
      {/* Dynamic label with type-safe props */}
      <p>{t("greeting", { name: "John" })}</p>
      <p>{t("itemCount", { count: 42 })}</p>
    </div>
  );
};
```

### Dynamic Label Resolution with `t.dynamic()`

The translator function returned by `useT()` includes a `dynamic` method for resolving labels with runtime-constructed keys. This is useful when the label key is determined dynamically based on data.

```tsx
import { useT } from "./i18n-labels";

const MyComponent = ({ employeeType }: { employeeType: string }) => {
  const t = useT();
  
  // First define labels with the possible keys:
  // en: { "employees.STAFF": "Staff", "employees.MANAGER": "Manager", ... }
  // ja: { "employees.STAFF": "スタッフ", "employees.MANAGER": "マネージャー", ... }
  
  return (
    <div>
      {/* Dynamic key resolution with fallback */}
      <p>Type: {t.dynamic(`employees.${employeeType}`, "Unknown")}</p>
    </div>
  );
};
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The dynamically constructed label key |
| `fallback` | `string` | Fallback text if the label key doesn't exist |

Use in module/resource definitions:

```tsx
import { defineModule, defineResource } from "@tailor-platform/app-shell";
import { labels } from "./i18n-labels";

const dashboardModule = defineModule({
  path: "dashboard",
  meta: {
    // Static label
    title: labels.t("welcome"),
  },
  component: DashboardPage,
  resources: [
    defineResource({
      path: "settings",
      meta: {
        // Labels are resolved based on current locale
        title: labels.t("settings"),
      },
      component: SettingsPage,
    })
  ],
});
```

**Note:** The browser's language preference is automatically detected to select the appropriate locale. `en` is used as the fallback if the detected locale is not defined.

### Context Data

AppShell supports passing custom context data that can be accessed from guards and components. This provides a type-safe dependency injection mechanism for sharing data like API clients, user state, and feature flags.

#### Step 1: Define Context Data Type

Use TypeScript module augmentation to define your context data type:

```typescript
// types/app-shell.d.ts
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      apiClient: ApiClient;
      currentUser: User | null;
      featureFlags: {
        enableNewUI: boolean;
        enableReports: boolean;
      };
    };
  }
}
```

#### Step 2: Pass Context Data to AppShell

```tsx
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
    >
      <SidebarLayout />
    </AppShell>
  );
}
```

#### Step 3: Access in Guards

```tsx
import { type Guard, pass, hidden } from "@tailor-platform/app-shell";

const requireAuth: Guard = ({ context }) => {
  // `context` is fully typed based on your AppShellRegister
  if (!context.currentUser) {
    return redirectTo("/login");
  }
  return pass();
};

const requireFeature = (feature: keyof typeof context.featureFlags): Guard => {
  return ({ context }) => {
    if (!context.featureFlags[feature]) {
      return hidden();
    }
    return pass();
  };
};
```

#### Step 4: Access in Components

```tsx
import { useAppShell, useAppShellData } from "@tailor-platform/app-shell";

// Using useAppShell (returns all AppShell data including contextData)
function MyComponent() {
  const { contextData } = useAppShell();
  
  return <div>Welcome, {contextData.currentUser?.name}</div>;
}

// Using useAppShellData (returns only contextData, lighter alternative)
function UserProfile() {
  const contextData = useAppShellData();
  
  return (
    <div>
      <p>User: {contextData.currentUser?.name}</p>
      <p>Role: {contextData.currentUser?.role}</p>
    </div>
  );
}
```

### Locale Configuration

AppShell provides three ways to configure the locale:

1. **Auto-detection (Default)**: If no `locale` prop is provided to `AppShell`, it automatically detects the user's browser language preference using `navigator.languages`.

```tsx
<AppShell modules={modules}>
  {/* Locale auto-detected from browser */}
  <SidebarLayout />
</AppShell>
```

2. **Explicit Configuration**: Set a specific locale by passing the `locale` prop to `AppShell`. The prop accepts any locale code string (e.g., "en", "ja", "fr", "de"). Note that AppShell's built-in UI strings currently have translations for "en" and "ja" only - other locales will fall back to English for built-in strings.

```tsx
<AppShell modules={modules} locale="ja">
  {/* Forces Japanese locale */}
  <SidebarLayout />
</AppShell>
```

3. **Dynamic Switching**: To allow users to switch locales at runtime, store the locale in state and pass it to `AppShell`:

```tsx
const App = () => {
  const [locale, setLocale] = useState<"en" | "ja">("en");
  
  return (
    <>
      {/* Locale switcher UI */}
      <select value={locale} onChange={(e) => setLocale(e.target.value as "en" | "ja")}>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
      
      <AppShell modules={modules} locale={locale}>
        <SidebarLayout />
      </AppShell>
    </>
  );
};
```

The locale setting affects:
- Built-in UI strings in AppShell components (CommandPalette, navigation, etc.)
- Resolution of `LocalizedString` values in module/resource titles
- Labels defined via `defineI18nLabels`

## AuthProvider

Provides OAuth2/OIDC authentication using Tailor Platform's Auth service. Supports any IdP configured in your Tailor Platform application (built-in IdP, Google, Okta, Auth0, etc.).

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiEndpoint` | `string` | Yes | Your Tailor Platform application URL (no `/query` suffix needed) |
| `clientId` | `string` | Yes | OAuth2 client ID from Tailor Platform console |
| `redirectUri` | `string` | No | OAuth2 redirect URI (defaults to `window.location.origin`) |
| `meQuery` | `string \| DocumentNode` | No | Custom GraphQL query to fetch current user (see below for default) |
| `autoLogin` | `boolean` | No | Enable automatic login on initialization |
| `guardComponent` | `() => React.ReactNode` | No | Component to render while loading or unauthenticated |
| `children` | `React.ReactNode` | Yes | Child components |

**Default meQuery:**
```graphql
query {
  me {
    id
    email
    name
  }
}
```

### Example

```tsx
import { AuthProvider, AppShell, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => (
  <AuthProvider
    apiEndpoint="https://xyz.erp.dev"
    clientId="your-client-id"
    redirectUri="https://yourapplication.com/callback"
    autoLogin={true}
    guardComponent={() => <LoadingScreen />}
  >
    <AppShell {...config}>
      <SidebarLayout />
    </AppShell>
  </AuthProvider>
);
```

### Extending User Type

By default, `authState.user` has the `DefaultUser` type with `id`, `email`, and `name` fields. You can extend this type using TypeScript module augmentation:

```tsx
// types/auth.d.ts
declare module "@tailor-platform/app-shell" {
  interface AuthRegister {
    user: DefaultUser & {
      roles: Array<string>;
      organizationId: string;
      // Add any other custom fields
    };
  }
}
```

Then provide a matching `meQuery`:

```tsx
<AuthProvider
  apiEndpoint="https://xyz.erp.dev"
  clientId="your-client-id"
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
  {children}
</AuthProvider>
```

Now `authState.user` will be fully typed with your custom fields:

```tsx
const { authState } = useAuth();
console.log(authState.user.roles); // Array<string>
console.log(authState.user.organizationId); // string
```

## useAuth

Hook to access authentication methods and state when using AuthProvider.

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `authState` | `AuthState<User>` | Current authentication state |
| `authState.isLoading` | `boolean` | Whether auth status is being checked |
| `authState.isAuthenticated` | `boolean` | Whether user is authenticated |
| `authState.user` | `User \| null` | Current user object (null if not authenticated) |
| `login` | `() => Promise<void>` | Initiate OAuth2 login flow |
| `logout` | `() => Promise<void>` | Logout and clear tokens |
| `checkAuthStatus` | `() => Promise<AuthState<User>>` | Manually verify authentication status |
| `handleCallback` | `() => Promise<void>` | Handle OAuth callback (typically used in callback route) |

### Example

```tsx
import { useAuth } from "@tailor-platform/app-shell";

const UserProfile = () => {
  const { authState, login, logout } = useAuth();
  
  if (authState.isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!authState.isAuthenticated) {
    return <button onClick={login}>Sign In</button>;
  }
  
  return (
    <div>
      <p>Welcome, {authState.user.name || authState.user.email}!</p>
      <p>User ID: {authState.user.id}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};
```

### OAuth Callback Handling

```tsx
import { useAuth } from "@tailor-platform/app-shell";
import { useEffect } from "react";

const CallbackPage = () => {
  const { handleCallback } = useAuth();
  
  useEffect(() => {
    handleCallback().catch((error) => {
      console.error("Auth callback failed:", error);
    });
  }, [handleCallback]);
  
  return <div>Processing authentication...</div>;
};
```
