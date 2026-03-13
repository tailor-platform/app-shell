---
title: Quick Start
description: Install and set up your first AppShell application
---

# Quick Start

Get your first AppShell application running in minutes.

## Prerequisites

- Node.js 16+
- React 19+ (React 18 supported)
- A React project (Vite, Next.js, or any bundler)

## Step 1: Install AppShell

```bash
# npm
npm install @tailor-platform/app-shell

# yarn
yarn add @tailor-platform/app-shell

# pnpm
pnpm add @tailor-platform/app-shell
```

## Step 2: Set Up File-Based Routing (Vite)

Add the `appShellRoutes` plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { appShellRoutes } from "@tailor-platform/app-shell/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), appShellRoutes()],
});
```

## Step 3: Create Your First App

Add AppShell styles to your global CSS file:

```css
/* index.css */
@import "tailwindcss";
@import "@tailor-platform/app-shell/styles";
```

Create `src/App.tsx`:

```tsx
// src/App.tsx
import {
  AppShell,
  SidebarLayout,
} from "@tailor-platform/app-shell";

function App() {
  return (
    <AppShell title="My ERP App">
      <SidebarLayout />
    </AppShell>
  );
}

export default App;
```

Create your first page at `src/pages/page.tsx`:

```tsx
// src/pages/page.tsx
const HomePage = () => {
  return (
    <div className="astw:p-8">
      <h1 className="astw:text-2xl astw:font-bold">Welcome to AppShell</h1>
    </div>
  );
};

export default HomePage;
```

## Step 4: Run

```bash
npm run dev
```

Navigate to `/` - you should see your page with automatic sidebar navigation.

## Add Nested Pages

Create pages by adding directories and `page.tsx` files:

```
src/pages/
├── page.tsx                        → /
├── dashboard/
│   ├── page.tsx                    → /dashboard
│   └── orders/
│       ├── page.tsx                → /dashboard/orders
│       └── [id]/
│           └── page.tsx            → /dashboard/orders/:id
```

```tsx
// src/pages/dashboard/page.tsx
const DashboardPage = () => {
  return (
    <div className="astw:p-8">
      <h1 className="astw:text-xl astw:font-bold">Dashboard</h1>
    </div>
  );
};

export default DashboardPage;
```

```tsx
// src/pages/dashboard/orders/[id]/page.tsx
import { useParams } from "@tailor-platform/app-shell";

const OrderDetailPage = () => {
  const { id } = useParams();
  return (
    <div className="astw:p-8">
      <h2 className="astw:text-xl astw:font-bold">Order #{id}</h2>
    </div>
  );
};

export default OrderDetailPage;
```

AppShell automatically generates sidebar navigation and breadcrumbs.

[Learn more about File-Based Routing →](./concepts/file-based-routing.md)

## Framework-Specific Notes

### Next.js (App Router)

Next.js does not support file-based routing with the Vite plugin. Use the module-based approach instead:

```tsx
// app/dashboard/[[...props]]/page.tsx
"use client";

import {
  AppShell,
  SidebarLayout,
  defineModule,
} from "@tailor-platform/app-shell";

const dashboardModule = defineModule({
  path: "home",
  component: () => <div>Home</div>,
  meta: { title: "Home" },
});

export default function Page() {
  return (
    <AppShell title="My App" basePath="dashboard" modules={[dashboardModule]}>
      <SidebarLayout />
    </AppShell>
  );
}
```

See [Modules & Resources](./concepts/modules-and-resources.md) for the module-based API.

## Next Steps

- [File-Based Routing](./concepts/file-based-routing.md) - Define pages via directory structure
- [Routing & Navigation](./concepts/routing-navigation.md) - Navigation hooks
- [Authentication](./concepts/authentication.md) - Set up user authentication
- [Sidebar Navigation](./concepts/sidebar-navigation.md) - Customize sidebar menus
- [Styling & Theming](./concepts/styling-theming.md) - Theming and Tailwind CSS configuration
- [Modules & Resources](./concepts/modules-and-resources.md) - Legacy module-based routing
