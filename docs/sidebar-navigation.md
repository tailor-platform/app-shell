# Sidebar Navigation

AppShell provides flexible sidebar navigation with two modes:
- **Auto-generation mode**: Automatically generates navigation from module/resource definitions
- **Composition mode**: Full control over sidebar structure using declarative components

## Quick Start

### Auto-generation Mode (Default)

The simplest way to use the sidebar - navigation items are automatically generated from your module definitions:

```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";

const App = () => (
  <AppShell modules={modules}>
    <SidebarLayout />
  </AppShell>
);
```

### Composition Mode

For full control over sidebar structure, pass children to `DefaultSidebar` via the `sidebar` prop:

```tsx
import {
  AppShell,
  SidebarLayout,
  DefaultSidebar,
  SidebarItem,
  SidebarGroup,
  SidebarSeparator,
} from "@tailor-platform/app-shell";
import { Package, Settings } from "lucide-react";

const App = () => (
  <AppShell modules={modules}>
    <SidebarLayout
      sidebar={
        <DefaultSidebar>
          <SidebarItem to="/dashboard" />
          <SidebarSeparator />
          <SidebarGroup title="Products" icon={<Package />}>
            <SidebarItem to="/products/all" />
            <SidebarItem to="/products/categories" />
          </SidebarGroup>
          <SidebarItem to="/settings" icon={<Settings />} />
        </DefaultSidebar>
      }
    />
  </AppShell>
);
```

---

## Components

### SidebarItem

A navigation item that automatically resolves title and icon from resource definitions.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `to` | `string` | Yes | Target URL. External URLs (http://...) are rendered as external links |
| `title` | `string` | No | Override title. When omitted, auto-resolved from resource meta |
| `icon` | `ReactNode` | No | Override icon. When omitted, auto-resolved from resource meta |
| `external` | `boolean` | No | Opens link in new tab with external link icon |
| `render` | `function` | No | Custom render function for full UI control |

#### Examples

```tsx
// Auto-resolved from resource meta
<SidebarItem to="/dashboard" />

// Override title and icon
<SidebarItem to="/" title="Home" icon={<Home />} />

// External link
<SidebarItem to="https://docs.example.com" external />

// Custom rendering with render prop
<SidebarItem
  to="/tasks"
  render={({ title, icon, isActive }) => (
    <div className={isActive ? "font-bold" : ""}>
      {icon}
      <span>{title}</span>
      <Badge>5</Badge>
    </div>
  )}
/>
```

#### Render Prop

When using the `render` prop, you receive `SidebarItemRenderProps`:

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Resolved title (from override or resource meta) |
| `url` | `string` | Target URL |
| `icon` | `ReactNode \| undefined` | Resolved icon |
| `isActive` | `boolean` | Whether this item is currently active |

---

### SidebarGroup

A collapsible group for organizing navigation items.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `LocalizedString` | Yes | Group title (supports i18n) |
| `icon` | `ReactNode` | No | Group icon |
| `to` | `string` | No | When specified, title becomes a clickable link |
| `defaultOpen` | `boolean` | No | Initial expanded state. Default: `true` |
| `children` | `ReactNode` | Yes | Child items (SidebarItem, SidebarGroup, etc.) |

#### Examples

```tsx
// Basic group
<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />
  <SidebarItem to="/products/categories" />
</SidebarGroup>

// Clickable group header
<SidebarGroup title="Settings" icon={<Settings />} to="/settings">
  <SidebarItem to="/settings/profile" />
  <SidebarItem to="/settings/security" />
</SidebarGroup>

// Initially collapsed
<SidebarGroup title="Archives" defaultOpen={false}>
  <SidebarItem to="/archives/2024" />
  <SidebarItem to="/archives/2023" />
</SidebarGroup>

// Nested groups
<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />
  <SidebarGroup title="Archives" defaultOpen={false}>
    <SidebarItem to="/products/archives/2024" />
    <SidebarItem to="/products/archives/2023" />
  </SidebarGroup>
</SidebarGroup>
```

#### i18n Support

Group titles support localized strings:

```tsx
import { defineI18nLabels } from "@tailor-platform/app-shell";

const labels = defineI18nLabels({
  en: { products: "Products" },
  ja: { products: "製品" },
});

<SidebarGroup title={labels.t("products")} icon={<Package />}>
  <SidebarItem to="/products/all" />
</SidebarGroup>
```

---

### SidebarSeparator

A visual divider between sidebar sections.

#### Props

This component takes no props.

#### Example

```tsx
<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarSeparator />
  <SidebarItem to="/settings" />
</DefaultSidebar>
```

---

### DefaultSidebar

The main sidebar container that supports both auto-generation and composition modes.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `header` | `ReactNode` | No | Custom header content |
| `footer` | `ReactNode` | No | Custom footer content |
| `children` | `ReactNode` | No | When provided, enables composition mode |

#### Examples

```tsx
// Auto-generation mode
<DefaultSidebar />

// With custom header and footer
<DefaultSidebar
  header={<Logo />}
  footer={<UserMenu />}
/>

// Composition mode with custom navigation
<DefaultSidebar header={<Logo />}>
  <SidebarItem to="/dashboard" />
  <SidebarGroup title="Products">
    <SidebarItem to="/products/all" />
  </SidebarGroup>
</DefaultSidebar>
```

---

## Hooks

### usePageMeta

A hook to retrieve page metadata (title, icon) for a given URL path.

#### Signature

```typescript
const usePageMeta: (path: string) => PageMeta | null;

type PageMeta = {
  title: string;
  icon?: ReactNode;
};
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | URL path to find meta for (e.g., "/products/all") |

#### Returns

- `PageMeta` - Object containing `title` and optional `icon` if found
- `null` - For external links or when path is not found

#### Example

```tsx
import { usePageMeta } from "@tailor-platform/app-shell";

const MyComponent = () => {
  const pageMeta = usePageMeta("/products/all");

  if (!pageMeta) {
    return <span>Unknown Page</span>;
  }

  return (
    <div>
      {pageMeta.icon}
      <span>{pageMeta.title}</span>
    </div>
  );
};
```

---

## Access Control

### Auto-generation Mode

In auto-generation mode, `guards` defined in `defineModule`/`defineResource` are automatically evaluated. Modules/resources that return `hidden()` will not appear in the sidebar.

```tsx
import { defineModule, defineResource, pass, hidden } from "@tailor-platform/app-shell";

const adminModule = defineModule({
  path: "admin",
  meta: { title: "Admin" },
  // If this guard returns hidden(), the module won't appear in sidebar
  guards: [
    ({ context }) =>
      context.currentUser.role === "admin" ? pass() : hidden(),
  ],
  resources: [
    defineResource({
      path: "users",
      meta: { title: "Users" },
      component: () => <div>Users</div>,
    }),
  ],
});

// Used with auto-generation mode
<DefaultSidebar />
```

### Composition Mode

In composition mode, use the `WithGuard` component to control visibility of sidebar items. This allows you to reuse the same guard logic used in route definitions.

```tsx
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

// Define a guard function
const isAdminGuard = ({ context }) =>
  context.currentUser.role === "admin" ? pass() : hidden();

<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  
  {/* Wrap items with WithGuard for conditional visibility */}
  <WithGuard guards={[isAdminGuard]}>
    <SidebarGroup title="Admin" icon={<Shield />}>
      <SidebarItem to="/admin/users" />
      <SidebarItem to="/admin/settings" />
    </SidebarGroup>
  </WithGuard>
</DefaultSidebar>
```

#### Curried Guards

For parameterized guards, use the curried pattern:

```tsx
// Define a curried guard factory
const hasRole = (role: string) => ({ context }) =>
  context.currentUser.role === role ? pass() : hidden();

<DefaultSidebar>
  <WithGuard guards={[hasRole("admin")]}>
    <SidebarItem to="/admin" />
  </WithGuard>
  
  <WithGuard guards={[hasRole("manager")]}>
    <SidebarItem to="/reports" />
  </WithGuard>
</DefaultSidebar>
```

> **Note**: Route-level access control (e.g., redirects) still works via `guards` in `defineResource`, even in composition mode. `WithGuard` only controls visibility—it does not prevent navigation to protected routes.

---

## Migration from Auto-generation

If you're currently using auto-generated navigation and want to customize it:

1. **Keep auto-generation for most items**, add custom items where needed:

```tsx
// Before: Pure auto-generation
<DefaultSidebar />

// After: Composition with similar structure
<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />
  <SidebarSeparator />
  <SidebarItem to="https://docs.example.com" title="Documentation" external />
</DefaultSidebar>
```

2. **Title and icon are auto-resolved** from your resource definitions, so you don't need to specify them unless you want to override.

3. **External links** can now be added directly in the sidebar.
