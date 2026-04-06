---
title: SidebarGroup
description: Collapsible group component for organizing sidebar navigation items with icons and nested structure
---

# SidebarGroup

`SidebarGroup` creates a collapsible group in the sidebar to organize related navigation items. It supports icons, clickable headers, nested groups, and internationalization.

## Import

```tsx
import { SidebarGroup } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx
import { SidebarGroup, SidebarItem } from "@tailor-platform/app-shell"
import { Package } from "lucide-react"
;<DefaultSidebar>
  <SidebarGroup title="Products" icon={<Package />}>
    <SidebarItem to="/products/all" />
    <SidebarItem to="/products/categories" />
    <SidebarItem to="/products/brands" />
  </SidebarGroup>
</DefaultSidebar>
```

## Props

| Prop          | Type                        | Default      | Description                                    |
| ------------- | --------------------------- | ------------ | ---------------------------------------------- |
| `title`       | `string \| LocalizedString` | **Required** | Group title (supports i18n)                    |
| `icon`        | `React.ReactNode`           | -            | Icon displayed next to title                   |
| `to`          | `string`                    | -            | Makes title clickable (navigates to URL)       |
| `defaultOpen` | `boolean`                   | `true`       | Initial expanded/collapsed state               |
| `children`    | `React.ReactNode`           | **Required** | Child items (SidebarItem, nested groups, etc.) |

## Features

### Collapsible

Groups can be expanded or collapsed by clicking the chevron icon:

```tsx
<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />
  <SidebarItem to="/products/categories" />
</SidebarGroup>
```

Click the chevron (▶/▼) to toggle:

- **Expanded:** Shows all child items
- **Collapsed:** Hides child items, shows only title

### Clickable Header

Make the group title a clickable link:

```tsx
<SidebarGroup
  title="Settings"
  icon={<Settings />}
  to="/settings" // Header navigates here
>
  <SidebarItem to="/settings/profile" />
  <SidebarItem to="/settings/security" />
</SidebarGroup>
```

When `to` is provided:

- Title is a clickable link
- Chevron still collapses/expands children
- Useful for groups with a landing page

### Default State

Control whether groups start expanded or collapsed:

```tsx
// Starts expanded (default)
<SidebarGroup title="Recent" defaultOpen={true}>
  <SidebarItem to="/recent/today" />
</SidebarGroup>

// Starts collapsed
<SidebarGroup title="Archives" defaultOpen={false}>
  <SidebarItem to="/archives/2024" />
  <SidebarItem to="/archives/2023" />
</SidebarGroup>
```

### Nested Groups

Create multi-level navigation:

```tsx
<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />

  <SidebarGroup title="By Category">
    <SidebarItem to="/products/electronics" />
    <SidebarItem to="/products/clothing" />
  </SidebarGroup>

  <SidebarGroup title="Archives" defaultOpen={false}>
    <SidebarItem to="/products/archives/2024" />
    <SidebarItem to="/products/archives/2023" />
  </SidebarGroup>
</SidebarGroup>
```

### Internationalization

Titles support i18n with `defineI18nLabels`:

```tsx
import { defineI18nLabels } from "@tailor-platform/app-shell"

const labels = defineI18nLabels({
  products: {
    en: "Products",
    ja: "商品",
  },
  settings: {
    en: "Settings",
    ja: "設定",
  },
})

;<SidebarGroup title={labels.t("products")} icon={<Package />}>
  <SidebarItem to="/products/all" />
</SidebarGroup>
```

## Examples

### Basic Group

```tsx
import { Package } from "lucide-react"
;<SidebarGroup title="Products" icon={<Package />}>
  <SidebarItem to="/products/all" />
  <SidebarItem to="/products/categories" />
  <SidebarItem to="/products/brands" />
</SidebarGroup>
```

### Clickable Group with Landing Page

```tsx
import { Settings } from "lucide-react"
;<SidebarGroup title="Settings" icon={<Settings />} to="/settings">
  <SidebarItem to="/settings/profile" />
  <SidebarItem to="/settings/security" />
  <SidebarItem to="/settings/notifications" />
  <SidebarItem to="/settings/billing" />
</SidebarGroup>
```

Clicking "Settings" navigates to `/settings`, while child items navigate to their specific pages.

### Multiple Groups

```tsx
import { Package, ShoppingCart, Users, Settings } from "lucide-react"
;<DefaultSidebar>
  <SidebarItem to="/dashboard" />

  <SidebarGroup title="Products" icon={<Package />}>
    <SidebarItem to="/products/all" />
    <SidebarItem to="/products/categories" />
  </SidebarGroup>

  <SidebarGroup title="Orders" icon={<ShoppingCart />}>
    <SidebarItem to="/orders/pending" />
    <SidebarItem to="/orders/shipped" />
    <SidebarItem to="/orders/completed" />
  </SidebarGroup>

  <SidebarGroup title="Customers" icon={<Users />}>
    <SidebarItem to="/customers/all" />
    <SidebarItem to="/customers/segments" />
  </SidebarGroup>

  <SidebarSeparator />

  <SidebarGroup title="Settings" icon={<Settings />} to="/settings">
    <SidebarItem to="/settings/profile" />
    <SidebarItem to="/settings/billing" />
  </SidebarGroup>
</DefaultSidebar>
```

### Nested Groups

```tsx
import { FolderIcon } from "lucide-react"
;<SidebarGroup title="Documents" icon={<FolderIcon />}>
  <SidebarItem to="/documents/recent" />

  <SidebarGroup title="Projects">
    <SidebarItem to="/documents/project-a" />
    <SidebarItem to="/documents/project-b" />
  </SidebarGroup>

  <SidebarGroup title="Archives" defaultOpen={false}>
    <SidebarItem to="/documents/archives/2024" />
    <SidebarItem to="/documents/archives/2023" />
    <SidebarItem to="/documents/archives/2022" />
  </SidebarGroup>
</SidebarGroup>
```

### Collapsed by Default

```tsx
<SidebarGroup title="Admin Tools" icon={<Wrench />} defaultOpen={false}>
  <SidebarItem to="/admin/users" />
  <SidebarItem to="/admin/logs" />
  <SidebarItem to="/admin/system" />
</SidebarGroup>
```

Useful for:

- Less frequently used sections
- Admin panels
- Advanced features
- Archives

### With Conditional Items

```tsx
import { WithGuard } from "@tailor-platform/app-shell"

const isAdmin = ({ context }) => (context.currentUser?.role === "admin" ? pass() : hidden())

;<SidebarGroup title="Settings" icon={<Settings />}>
  <SidebarItem to="/settings/profile" />
  <SidebarItem to="/settings/notifications" />

  <WithGuard guards={[isAdmin]}>
    <SidebarItem to="/settings/users" />
    <SidebarItem to="/settings/permissions" />
  </WithGuard>
</SidebarGroup>
```

### With External Links

```tsx
import { HelpCircle, FileText, ExternalLink } from "lucide-react"
;<SidebarGroup title="Help" icon={<HelpCircle />}>
  <SidebarItem to="/help/faq" />
  <SidebarItem to="https://docs.example.com" title="Documentation" icon={<FileText />} external />
  <SidebarItem to="https://support.example.com" title="Support" icon={<ExternalLink />} external />
</SidebarGroup>
```

### With Custom Separator

```tsx
<DefaultSidebar>
  <SidebarGroup title="Main" icon={<Home />}>
    <SidebarItem to="/dashboard" />
    <SidebarItem to="/analytics" />
  </SidebarGroup>

  <SidebarSeparator />

  <SidebarGroup title="Management" icon={<Settings />}>
    <SidebarItem to="/products" />
    <SidebarItem to="/orders" />
  </SidebarGroup>
</DefaultSidebar>
```

## Visual Structure

```
▼ Products                    ← Group header (clickable if `to` provided)
  • All Products              ← SidebarItem
  • Categories                ← SidebarItem
  ▼ Archives                  ← Nested SidebarGroup
    • 2024                    ← SidebarItem
    • 2023                    ← SidebarItem
```

When collapsed:

```
▶ Products                    ← Collapsed group
```

## Active State

When a child item is active, the group:

- Remains expanded (if it was collapsed)
- Group title gets highlighted (if `to` is provided and matches current route)

```tsx
// User is on /settings/profile
<SidebarGroup title="Settings" to="/settings">
  <SidebarItem to="/settings/profile" /> {/* Active */}
  <SidebarItem to="/settings/security" />
</SidebarGroup>

// Group title is highlighted (matches /settings prefix)
// /settings/profile item is highlighted
```

## Styling

### Custom Icon Styling

```tsx
<SidebarGroup title="Products" icon={<Package className="astw:text-blue-500" />}>
  {/* ... */}
</SidebarGroup>
```

### Group Title Styling

The title styling is controlled by AppShell's theme. You can customize via CSS:

```css
/* Custom group header styling */
.astw:sidebar-group-title {
  font-weight: 600;
  font-size: 0.875rem;
}
```

## Accessibility

- Semantic HTML structure
- ARIA labels for expand/collapse state
- Keyboard navigation (Tab, Enter, Space)
- Screen reader announcements for state changes
- Proper heading hierarchy

## Best Practices

### Do:

- ✅ Group related items logically
- ✅ Use clear, descriptive group titles
- ✅ Provide icons for visual recognition
- ✅ Start collapsed for less-used sections
- ✅ Keep groups shallow (max 2 levels of nesting)

### Don't:

- ❌ Create groups with only 1 item (use SidebarItem directly)
- ❌ Nest more than 2 levels deep (hard to navigate)
- ❌ Use very long group titles (keep to 1-2 words)
- ❌ Mix unrelated items in same group
- ❌ Forget icons (helps with visual scanning)

## When to Use

**Use SidebarGroup when:**

- You have 3+ related navigation items
- Items share a common category or theme
- You want to organize a large navigation menu
- Users need to focus on specific sections

**Use SidebarItem directly when:**

- You have standalone top-level navigation
- Items don't fit into logical groups
- You want a flat, simple navigation structure

## Comparison

| Feature         | SidebarGroup           | SidebarItem     |
| --------------- | ---------------------- | --------------- |
| **Purpose**     | Organize related items | Individual link |
| **Collapsible** | ✅ Yes                 | ❌ No           |
| **Contains**    | Multiple items         | Self (link)     |
| **Icon**        | Group identifier       | Link identifier |
| **Clickable**   | Optional (`to` prop)   | Always          |
| **Nesting**     | Can contain groups     | Leaf node       |

## TypeScript

Full type safety:

```typescript
import { type SidebarGroupProps } from "@tailor-platform/app-shell";

const groupProps: SidebarGroupProps = {
  title: "Products",
  icon: <Package />,
  to: "/products",
  defaultOpen: true,
  children: <SidebarItem to="/products/all" />,
};
```

## Troubleshooting

### Group not expanding/collapsing

**Problem:** Clicking chevron doesn't toggle group

**Solution:**

1. Check browser console for errors
2. Ensure children are valid React elements
3. Verify AppShell is properly configured

### Title not clickable

**Problem:** Clicking title doesn't navigate

**Solution:** Add the `to` prop:

```tsx
<SidebarGroup title="Settings" to="/settings">
  {/* ... */}
</SidebarGroup>
```

Without `to`, only the chevron is clickable (for expand/collapse).

### Icon not showing

**Problem:** Icon doesn't appear

**Solution:**

1. Check that icon is a valid React element
2. Import the icon correctly
3. Verify icon library is installed

## Related Components

- [SidebarItem](./sidebar-item.md) - Individual navigation items
- [DefaultSidebar](./sidebar-layout.md) - Container for groups
- [WithGuard](./with-guard.md) - Conditional rendering

## Related Concepts

- [Sidebar Navigation](../concepts/sidebar-navigation.md) - Sidebar customization guide
- [Internationalization](../guides/internationalization.md) - Multi-language support

## API Reference

- [defineI18nLabels](../api/define-i18n-labels.md) - Internationalization helper
