---
title: Quickstart
description: Get started with AppShell in 5 minutes
---

# Quickstart

Get your first AppShell application running in minutes.

## Prerequisites

- Node.js 16+
- React 19+ (React 18 supported)
- Tailwind CSS v4 installed ([See Installation](./installation.md) for setup)

## Install

```bash
npm install @tailor-platform/app-shell
```

## Setup Theme

Add to your global CSS file:

```css
/* globals.css */
@import "@tailor-platform/app-shell/theme.css";
@import "tailwindcss";
```

## Create Your First App

```tsx
// App.tsx
import { AppShell, SidebarLayout, defineModule } from "@tailor-platform/app-shell";

const dashboardModule = defineModule({
  path: "dashboard",
  component: () => (
    <div className="astw:p-8">
      <h1 className="astw:text-2xl astw:font-bold">Welcome to AppShell</h1>
    </div>
  ),
  meta: { title: "Dashboard" },
});

function App() {
  return (
    <AppShell title="My ERP App" basePath="/app" modules={[dashboardModule]}>
      <SidebarLayout />
    </AppShell>
  );
}

export default App;
```

## Run

```bash
npm run dev
```

Navigate to `/app/dashboard` - you should see your page with automatic sidebar navigation! 🎉

## Add Nested Pages

```tsx
import { defineModule, defineResource, useParams } from "@tailor-platform/app-shell";

const OrdersPage = () => (
  <div className="astw:p-8">
    <h2 className="astw:text-xl astw:font-bold">Orders</h2>
  </div>
);

const OrderDetailPage = () => {
  const { id } = useParams();
  return (
    <div className="astw:p-8">
      <h2 className="astw:text-xl astw:font-bold">Order #{id}</h2>
    </div>
  );
};

export const dashboardModule = defineModule({
  path: "dashboard",
  component: DashboardPage,
  meta: { title: "Dashboard" },
  resources: [
    defineResource({
      path: "orders",
      component: OrdersPage,
      meta: { title: "Orders" },
      resources: [
        defineResource({
          path: ":id",
          component: OrderDetailPage,
          meta: { title: "Order Details" },
        }),
      ],
    }),
  ],
});
```

This creates:

- `/app/dashboard` - Dashboard
- `/app/dashboard/orders` - Orders list
- `/app/dashboard/orders/123` - Order detail

AppShell automatically generates sidebar navigation, breadcrumbs, and provides Command Palette (`Cmd+K`).

## What's Included

**Core Components:**

- `AppShell` - Root provider
- `SidebarLayout` / `DefaultSidebar` - Layouts
- `CommandPalette` - Quick navigation (`Cmd+K`)

**UI Components:**

- `Layout` - Responsive columns (1/2/3)
- `Badge` - Status badges
- `DescriptionCard` - Field-value display

**Structure:**

- `defineModule` / `defineResource` - Declarative routing
- `SidebarItem` / `SidebarGroup` - Custom navigation

**Authentication:**

- `AuthProvider` / `useAuth` - OAuth2/OIDC
- Route Guards - `pass()`, `hidden()`, `redirectTo()`

**Utilities:**

- `defineI18nLabels` - Internationalization
- `useTheme` - Light/dark mode
- React Router hooks - `useNavigate`, `useParams`, `useLocation`

## Next Steps

**Core Concepts:**

- [Modules & Resources](./concepts/modules-and-resources.md) - App structure
- [Routing & Navigation](./concepts/routing-navigation.md) - Navigation
- [Authentication](./concepts/authentication.md) - User auth

**Components:**

- [AppShell](./components/app-shell.md) - Root component
- [All Components](./components/sidebar-layout.md) - Component library

**API Reference:**

- [defineModule](./api/define-module.md) - Module API
- [defineResource](./api/define-resource.md) - Resource API
- [All Hooks](./api/use-app-shell.md) - Hooks reference
