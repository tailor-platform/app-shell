# Quick Start

## Installation

```bash
npm install @tailor-platform/app-shell
```

## Setup

Add the `AppShell` component as the root of your application. Define your pages as modules and resources — AppShell manages routing, sidebar navigation, and breadcrumbs automatically.

```tsx
import { AppShell, SidebarLayout, defineModule, defineResource } from "@tailor-platform/app-shell";

const productsModule = defineModule({
  path: "products",
  component: () => <div>Products</div>,
  resources: [
    defineResource({
      path: ":id",
      component: () => <div>Product Detail</div>,
    }),
  ],
});

const App = () => (
  <AppShell title="My App" basePath="dashboard" modules={[productsModule]}>
    <SidebarLayout />
  </AppShell>
);
```

Mount AppShell's Tailwind theme in your CSS:

```css
/* globals.css */
@import "@tailor-platform/app-shell/theme.css";
@import "tailwindcss";
```

This gives you:

- Sidebar navigation with "Products" as a menu item
- Routing to `/dashboard/products` and `/dashboard/products/:id`
- Breadcrumb trail navigation
- Light/dark theming

## What's Included

- **`AppShell`** — Root provider that wires routing, navigation, and theming
- **`SidebarLayout`** / **`DefaultSidebar`** — Opinionated responsive layouts with sidebar navigation
- **`defineModule`** / **`defineResource`** — Declarative app structure with automatic routing and breadcrumbs
- **`AuthProvider`** / **`useAuth`** — OAuth2/OIDC authentication for Tailor Platform
- **`CommandPalette`** — Keyboard-driven quick navigation (`Cmd+K`)
- **`Layout`** — Responsive column layouts (1/2/3 columns)
- **`Badge`** / **`DescriptionCard`** — ERP-oriented UI components
- **Route Guards** — Access control with `pass()`, `hidden()`, `redirectTo()`
- **i18n** — Built-in internationalization support
- **Theming** — Light/dark mode with `useTheme`

## Next Steps

- [Module & Resource Definition](./module-resource-definition.md) — Structure your application with modules and resources
- [File-Based Routing](./file-based-routing.md) — Define pages via directory structure (Vite only)
- [Authentication](./authentication.md) — Set up OAuth2/OIDC authentication
- [Styles](./styles.md) — Theming and Tailwind CSS configuration
- [API Reference](./api.md) — Complete reference for all components, hooks, and functions
