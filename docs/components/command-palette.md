---
title: CommandPalette
description: Keyboard-driven quick navigation with fuzzy search for all routes in your application
---

# CommandPalette

`CommandPalette` provides a keyboard-driven quick navigation interface that allows users to search and navigate to any page in your application. Activated with `Cmd+K` (Mac) or `Ctrl+K` (Windows), it offers fuzzy search across all accessible routes.

## Import

```tsx
import { CommandPalette } from "@tailor-platform/app-shell"
```

## Usage

The CommandPalette is automatically included when you use `AppShell` with `SidebarLayout`. It requires no additional configuration:

```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell"

function App() {
  return (
    <AppShell modules={modules}>
      <SidebarLayout />
    </AppShell>
  )
}
```

The CommandPalette will automatically:

- ✅ Index all navigatable routes from your modules
- ✅ Provide fuzzy search functionality
- ✅ Show breadcrumb paths for context
- ✅ Display module icons
- ✅ Respect access control (hidden routes won't appear)

## Keyboard Shortcuts

### Opening/Closing

| Shortcut                   | Action                |
| -------------------------- | --------------------- |
| `Cmd + K` (Mac)            | Toggle CommandPalette |
| `Ctrl + K` (Windows/Linux) | Toggle CommandPalette |
| `Esc`                      | Close CommandPalette  |

### Navigation

| Shortcut       | Action                           |
| -------------- | -------------------------------- |
| `↑` / `↓`      | Navigate up/down through results |
| `Enter`        | Navigate to selected route       |
| Type to search | Filter routes by fuzzy search    |

## Features

### Fuzzy Search

The CommandPalette uses intelligent fuzzy search that matches:

- **Route titles** - Page names from your resource meta
- **Paths** - URL segments
- **Breadcrumbs** - Full navigation path

Example searches:

- `dash` → Matches "Dashboard"
- `prod det` → Matches "Products > Product Details"
- `ord` → Matches "Orders", "Order Details", etc.

### Breadcrumb Display

Each result shows its full navigation path for context:

```
🏠 Dashboard > Analytics > Revenue
📦 Products > Categories > Electronics
📋 Orders > History > 2024
```

### Access Control Integration

The CommandPalette automatically respects your route guards:

- Hidden routes (via `hidden()` guard) don't appear in search
- Protected routes are filtered based on current user permissions
- Dynamic updates when context changes

### Icon Display

Module icons are displayed next to search results for visual recognition:

```tsx
const productsModule = defineModule({
  path: "products",
  component: ProductsPage,
  meta: {
    title: "Products",
    icon: <Package />, // Shown in CommandPalette
  },
})
```

## Customization

### Custom Palette (Advanced)

If you need to customize the CommandPalette behavior, you can use the `useCommandPalette` hook:

```tsx
import { useCommandPalette, navItemsToRoutes } from "@tailor-platform/app-shell"

function CustomPalette() {
  const navItems = useNavItems() // Get navigation items
  const routes = navItemsToRoutes(navItems)

  const { open, handleOpenChange, search, setSearch, filteredRoutes, handleSelect, handleKeyDown } =
    useCommandPalette({ routes })

  // Custom UI implementation
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search pages..."
      />
      {filteredRoutes.map((route) => (
        <button key={route.path} onClick={() => handleSelect(route)}>
          {route.icon}
          {route.title}
          <span>{route.breadcrumb.join(" > ")}</span>
        </button>
      ))}
    </Dialog>
  )
}
```

### Disabling CommandPalette

Currently, the CommandPalette is always enabled with `SidebarLayout`. To disable it, you would need to create a custom layout without the CommandPalette component.

## Examples

### Basic Usage

The CommandPalette works automatically with your module definitions:

```tsx
const modules = [
  defineModule({
    path: "dashboard",
    component: DashboardPage,
    meta: { title: "Dashboard", icon: <Home /> },
    resources: [
      defineResource({
        path: "analytics",
        component: AnalyticsPage,
        meta: { title: "Analytics" },
      }),
    ],
  }),
  defineModule({
    path: "products",
    component: ProductsPage,
    meta: { title: "Products", icon: <Package /> },
    resources: [
      defineResource({
        path: ":id",
        component: ProductDetailPage,
        meta: { title: "Product Details" },
      }),
    ],
  }),
]

// CommandPalette will show:
// - Dashboard
// - Dashboard > Analytics
// - Products
// - Products > Product Details (when applicable)
```

### With Access Control

Routes hidden by guards won't appear in search:

```tsx
const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  meta: { title: "Admin Panel" },
  guards: [
    ({ context }) => {
      return context.currentUser?.role === "admin" ? pass() : hidden() // Won't show in CommandPalette for non-admins
    },
  ],
})
```

### Search Behavior

```
User types: "prod"
Results:
  📦 Products
  📦 Products > Product Details
  📦 Products > Categories

User types: "dash ana"
Results:
  🏠 Dashboard > Analytics

User types: "ord 123"
Results:
  📋 Orders > Order #123 (if dynamic routes are indexed)
```

## Design

The CommandPalette follows these design principles:

### Visual Design

- **Clean, focused UI** - Minimal distractions
- **Clear hierarchy** - Module icons, titles, and breadcrumbs
- **Active state** - Highlight selected result
- **Empty state** - "No results found" message

### UX Patterns

- **Immediate feedback** - Results update as you type
- **Keyboard-first** - All actions accessible via keyboard
- **Contextual information** - Breadcrumbs show location
- **Quick access** - Single shortcut to open

### Performance

- **Instant search** - Client-side fuzzy matching
- **Debounced input** - Smooth typing experience
- **Lazy loading** - Routes loaded only when needed

## Best Practices

### Do:

- ✅ Provide clear, descriptive titles in resource meta
- ✅ Use meaningful module icons for visual recognition
- ✅ Structure modules logically for better discoverability
- ✅ Keep route hierarchies shallow when possible

### Don't:

- ❌ Use generic titles like "Page 1", "Section A"
- ❌ Create deeply nested resources (hard to navigate)
- ❌ Forget to set meta.title on resources
- ❌ Use similar titles for different routes

## Accessibility

- **Keyboard navigation** - Full keyboard support
- **ARIA labels** - Proper labels for screen readers
- **Focus management** - Focus trapped in dialog when open
- **ESC to close** - Standard dialog behavior

## Related Components

- [AppShell](./app-shell.md) - Root component that provides CommandPalette
- [SidebarLayout](./sidebar-layout.md) - Layout that includes CommandPalette

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - Define routes that appear in CommandPalette
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation system
- [Guards and Permissions](../guides/guards-permissions.md) - Control route visibility

## Troubleshooting

### Routes not appearing in search

**Problem:** Some routes don't show up in CommandPalette

**Solutions:**

1. Check that the resource has a `meta.title` defined
2. Verify the route isn't hidden by a guard
3. Ensure the route is navigatable (not a redirect-only route)

### Search not matching expected routes

**Problem:** Typing a route name doesn't find it

**Solutions:**

1. Try typing the breadcrumb path: "Products Categories"
2. Use abbreviations: "prod cat"
3. Check spelling of the title in resource meta

### CommandPalette not opening

**Problem:** `Cmd+K` / `Ctrl+K` doesn't work

**Solutions:**

1. Check if another app is capturing the shortcut
2. Verify you're using `SidebarLayout` (CommandPalette is included)
3. Check browser console for JavaScript errors
