---
title: Installation
description: Install and configure AppShell in your React application
---

# Installation

Install AppShell in your React application with Tailwind CSS v4.

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

## Step 2: Install Peer Dependencies

If you don't have React 19 yet:

```bash
npm install react@latest react-dom@latest
```

## Step 3: Configure Tailwind CSS v4

### Install Tailwind CSS v4

```bash
npm install tailwindcss@next @tailwindcss/postcss@next
```

### Create PostCSS Config

```javascript
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### Import AppShell Theme

```css
/* globals.css */
@import "@tailor-platform/app-shell/theme.css";
@import "tailwindcss";
```

> **Important:** Import AppShell theme first, then Tailwind CSS.

## Step 4: Basic Setup

```tsx
// App.tsx
import "@/globals.css";
import { AppShell, SidebarLayout, defineModule } from "@tailor-platform/app-shell";

const dashboardModule = defineModule({
  path: "dashboard",
  component: () => <div>Dashboard</div>,
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

## Framework-Specific Notes

### Vite

Vite works out of the box. Ensure your `vite.config.ts` includes PostCSS:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.mjs",
  },
});
```

**Optional: File-Based Routing**

```typescript
import { appShellVitePlugin } from "@tailor-platform/app-shell/vite-plugin";

export default defineConfig({
  plugins: [react(), appShellVitePlugin()],
});
```

[Learn more about File-Based Routing →](./concepts/file-based-routing.md)

### Next.js (App Router)

Add `'use client'` directive to your AppShell layout:

```tsx
// app/app/layout.tsx
"use client";

import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";
import { modules } from "@/modules";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="My App" basePath="/app" modules={modules}>
      <SidebarLayout>{children}</SidebarLayout>
    </AppShell>
  );
}
```

### Create React App

Install CRACO for PostCSS support:

```bash
npm install --save-dev craco @craco/craco
```

```javascript
// craco.config.js
module.exports = {
  style: {
    postcss: {
      plugins: [require("@tailwindcss/postcss")],
    },
  },
};
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build"
  }
}
```

## TypeScript (Optional)

Add AppShell types to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@tailor-platform/app-shell"]
  }
}
```

## Verify Installation

Start your dev server and navigate to your basePath:

```bash
npm run dev
```

Visit `http://localhost:3000/app/dashboard` - you should see:

- Sidebar navigation
- Your dashboard page
- Breadcrumb navigation
- Theme toggle

## Next Steps

- [Quickstart Guide](./quickstart.md) - Build your first app
- [Modules & Resources](./concepts/modules-and-resources.md) - Learn the module system
- [Authentication](./concepts/authentication.md) - Add user authentication
- [Components](./components/app-shell.md) - Explore available components

## Package Info

- **Package:** `@tailor-platform/app-shell`
- **License:** MIT
- **Repository:** [github.com/tailor-platform/app-shell](https://github.com/tailor-platform/app-shell)
