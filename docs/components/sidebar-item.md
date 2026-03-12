---
title: SidebarItem
description: Individual navigation item for customizing sidebar with icons, active states, and external links
---

# SidebarItem

`SidebarItem` represents an individual navigation link in the sidebar. It automatically resolves titles and icons from resource definitions and provides active state highlighting.

## Import

```tsx
import { SidebarItem } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
import { DefaultSidebar, SidebarItem } from "@tailor-platform/app-shell";

<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />
  <SidebarItem to="/orders" />
</DefaultSidebar>
```

When you only provide `to`, the title and icon are automatically resolved from the matching resource's `meta` property.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `to` | `string` | **Required** | Target URL (internal or external) |
| `title` | `string` | Auto-resolved | Override the display title |
| `icon` | `React.ReactNode` | Auto-resolved | Override the icon |
| `external` | `boolean` | `false` | Opens link in new tab with external icon |
| `activeMatch` | `"exact" \| "prefix"` | `"prefix"` | How to match the current path for active state |
| `render` | `(props) => ReactNode` | - | Custom render function for full control |

## Auto-Resolution

### Title Resolution

The title is automatically resolved from the resource's `meta.title`:

```tsx
// In your module definition
const dashboardModule = defineModule({
  path: "dashboard",
  component: DashboardPage,
  meta: {
    title: "Dashboard", // ← Automatically used
  },
});

// In sidebar - no title needed!
<SidebarItem to="/dashboard" />
// Renders as: Dashboard
```

### Icon Resolution

Icons are resolved from the module's `meta.icon`:

```tsx
import { Home, Package } from "lucide-react";

const modules = [
  defineModule({
    path: "dashboard",
    meta: {
      title: "Dashboard",
      icon: <Home />, // ← Automatically used in sidebar
    },
  }),
  defineModule({
    path: "products",
    meta: {
      title: "Products",
      icon: <Package />,
    },
  }),
];

<DefaultSidebar>
  <SidebarItem to="/dashboard" /> {/* Shows Home icon */}
  <SidebarItem to="/products" /> {/* Shows Package icon */}
</DefaultSidebar>
```

## Manual Override

### Override Title

```tsx
<SidebarItem
  to="/dashboard"
  title="My Dashboard" // Override auto-resolved title
/>
```

### Override Icon

```tsx
import { Home } from "lucide-react";

<SidebarItem
  to="/dashboard"
  icon={<Home />} // Override auto-resolved icon
/>
```

### Both Title and Icon

```tsx
import { Settings } from "lucide-react";

<SidebarItem
  to="/settings"
  title="Settings"
  icon={<Settings />}
/>
```

## External Links

Open links in a new tab with an external link icon:

```tsx
import { ExternalLink } from "lucide-react";

<SidebarItem
  to="https://docs.example.com"
  title="Documentation"
  icon={<ExternalLink />}
  external
/>
```

The external link icon is automatically added to the end of the item.

## Active State Matching

Control how the active state is determined:

### Prefix Matching (Default)

Highlights when the current path **starts with** the `to` path:

```tsx
<SidebarItem to="/products" activeMatch="prefix" />

// Active when:
// - /products
// - /products/123
// - /products/categories
```

### Exact Matching

Highlights only when the current path **exactly matches** the `to` path:

```tsx
<SidebarItem to="/products" activeMatch="exact" />

// Active when:
// - /products (only)

// NOT active when:
// - /products/123
// - /products/categories
```

## Custom Rendering

For full control, use the `render` prop:

```tsx
<SidebarItem
  to="/notifications"
  render={({ title, icon, isActive }) => (
    <div className="astw:flex astw:items-center astw:gap-2">
      {icon}
      <span>{title}</span>
      {isActive && <Badge>New</Badge>}
      <Badge variant="error">5</Badge>
    </div>
  )}
/>
```

The render function receives:

```typescript
type SidebarItemRenderProps = {
  title: string;        // Auto-resolved or overridden
  url: string;          // The `to` prop value
  icon?: ReactNode;     // Auto-resolved or overridden
  isActive: boolean;    // Whether this item matches the current route
};
```

## Examples

### Basic Sidebar

```tsx
<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />
  <SidebarItem to="/orders" />
  <SidebarItem to="/customers" />
</DefaultSidebar>
```

### With Manual Overrides

```tsx
import { Home, Package, ShoppingCart, Users } from "lucide-react";

<DefaultSidebar>
  <SidebarItem to="/" title="Home" icon={<Home />} />
  <SidebarItem to="/products" title="Products" icon={<Package />} />
  <SidebarItem to="/orders" title="Orders" icon={<ShoppingCart />} />
  <SidebarItem to="/customers" title="Customers" icon={<Users />} />
</DefaultSidebar>
```

### With External Links

```tsx
import { HelpCircle, FileText, ExternalLink } from "lucide-react";

<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />

  <SidebarSeparator />

  <SidebarItem
    to="https://docs.example.com"
    title="Documentation"
    icon={<FileText />}
    external
  />
  <SidebarItem
    to="https://support.example.com"
    title="Support"
    icon={<HelpCircle />}
    external
  />
</DefaultSidebar>
```

### With Notification Badge

```tsx
<SidebarItem
  to="/notifications"
  render={({ title, icon, isActive }) => (
    <>
      {icon}
      <span>{title}</span>
      <Badge variant="error">12</Badge>
    </>
  )}
/>
```

### With Active Indicator

```tsx
<SidebarItem
  to="/messages"
  render={({ title, icon, isActive }) => (
    <>
      {icon}
      <span className={isActive ? "astw:font-bold" : undefined}>
        {title}
      </span>
      {isActive && <span className="astw:ml-auto">•</span>}
    </>
  )}
/>
```

### Exact Match for Root

```tsx
<DefaultSidebar>
  <SidebarItem to="/" activeMatch="exact" />
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />
</DefaultSidebar>
```

Without `activeMatch="exact"`, the root item would be active on all pages since every path starts with `/`.

### Conditional Rendering with Guards

```tsx
import { WithGuard } from "@tailor-platform/app-shell";

const isAdmin = ({ context }) =>
  context.currentUser?.role === "admin" ? pass() : hidden();

<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />

  <WithGuard guards={[isAdmin]}>
    <SidebarItem to="/admin" title="Admin Panel" />
  </WithGuard>
</DefaultSidebar>
```

### In SidebarGroup

```tsx
import { SidebarGroup, SidebarItem } from "@tailor-platform/app-shell";
import { Package } from "lucide-react";

<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />
  <SidebarItem to="/products/categories" />
  <SidebarItem to="/products/brands" />
</SidebarGroup>
```

## Styling

### Active State

Active items automatically receive the `astw:bg-sidebar-accent` background class:

```css
/* Active item styling (automatic) */
.astw:bg-sidebar-accent {
  background: var(--sidebar-accent);
  font-weight: 500;
}
```

### Custom Styling

Add custom classes via the `render` prop:

```tsx
<SidebarItem
  to="/special"
  render={({ title, icon, isActive }) => (
    <div className={cn(
      "astw:flex astw:items-center astw:gap-2",
      isActive && "astw:border-l-4 astw:border-primary"
    )}>
      {icon}
      {title}
    </div>
  )}
/>
```

## Accessibility

- Semantic `<a>` tag for links
- Proper `href` attribute
- Active state announced to screen readers
- External links open in new tab with `rel="noopener noreferrer"`
- Keyboard navigation support (Tab, Enter)

## Best Practices

### Do:
- ✅ Let AppShell auto-resolve title/icon when possible
- ✅ Use `external` for links outside your app
- ✅ Use `exact` match for root routes
- ✅ Group related items with `SidebarGroup`
- ✅ Keep item labels short (1-2 words)

### Don't:
- ❌ Hardcode titles that exist in resource meta
- ❌ Forget `external` for external links
- ❌ Use prefix match for root route (`/`)
- ❌ Mix internal and external links without visual distinction
- ❌ Create deeply nested navigation (use breadcrumbs instead)

## Comparison: Auto vs Manual

| Aspect | Auto-Resolved | Manual Override |
|--------|---------------|-----------------|
| **Title** | From resource `meta.title` | Specify `title` prop |
| **Icon** | From module `meta.icon` | Specify `icon` prop |
| **Effort** | Less code, DRY | More flexible |
| **Maintenance** | Single source of truth | Must update in 2 places |
| **Use When** | Standard navigation | Custom items, external links |

## TypeScript

Full type safety:

```typescript
import { type SidebarItemProps, type SidebarItemRenderProps } from "@tailor-platform/app-shell";

// Type-safe props
const itemProps: SidebarItemProps = {
  to: "/dashboard",
  title: "Dashboard",
  activeMatch: "prefix",
};

// Type-safe render function
const customRender = (props: SidebarItemRenderProps) => {
  // props.title, props.icon, props.isActive are all typed
  return <div>{props.title}</div>;
};
```

## Troubleshooting

### Title/Icon not showing

**Problem:** SidebarItem doesn't display title or icon

**Solutions:**
1. Check that the resource has `meta.title` defined
2. Verify the `to` prop matches the resource path exactly
3. Ensure the module has `meta.icon` for icon display
4. Try manually specifying `title` and `icon` props

### Active state not working

**Problem:** Item isn't highlighted when on that page

**Solutions:**
1. Check that the `to` prop matches the current route
2. Use `exact` match for root routes (`/`)
3. Use `prefix` match for parent routes with children
4. Verify you're using React Router's `<Link>` correctly

### External link not opening in new tab

**Problem:** External link opens in same tab

**Solution:** Add `external` prop:
```tsx
<SidebarItem to="https://..." external />
```

## Related Components

- [SidebarGroup](./sidebar-group.md) - Group multiple items
- [DefaultSidebar](./sidebar-layout.md) - Container for sidebar items
- [WithGuard](./with-guard.md) - Conditional rendering

## Related Concepts

- [Sidebar Navigation](../concepts/sidebar-navigation.md) - Sidebar customization guide
- [Modules and Resources](../concepts/modules-and-resources.md) - Define routes and meta

## API Reference

- [usePageMeta](../api/use-page-meta.md) - Hook for resolving page metadata
