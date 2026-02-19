# @tailor-platform/vite-plugin

Vite plugin for file-based routing in AppShell applications.

## Installation

```bash
pnpm add @tailor-platform/vite-plugin
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { appShellRoutes } from '@tailor-platform/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    appShellRoutes(),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | `string` | `'src/pages'` | Directory containing page components |
| `generateTypedRoutes` | `boolean \| { output: string }` | `false` | Generate typed routes file |
| `logLevel` | `'info' \| 'debug' \| 'off'` | `'info'` | Plugin log level |

```typescript
// vite.config.ts
appShellRoutes({
  pagesDir: 'src/pages', // default
})
```

## Typed Routes Generation

Enable `generateTypedRoutes` to generate a TypeScript file with type-safe route helpers:

```typescript
// vite.config.ts
appShellRoutes({
  generateTypedRoutes: true, // outputs to src/routes.generated.ts
  // or with custom path:
  // generateTypedRoutes: { output: 'src/lib/routes.ts' },
})
```

### Generated File

```typescript
// src/routes.generated.ts (auto-generated)
import { createTypedPaths } from "@tailor-platform/app-shell";

type RouteParams = {
  "/": {};
  "/dashboard": {};
  "/dashboard/orders": {};
  "/dashboard/orders/:id": { id: string };
};

export const paths = createTypedPaths<RouteParams>();
```

### Usage

```tsx
import { paths } from './routes.generated';
import { Link } from '@tailor-platform/app-shell';

// Static routes - no params needed
<Link to={paths.for("/dashboard")}>Dashboard</Link>

// Dynamic routes - params are type-checked
<Link to={paths.for("/dashboard/orders/:id", { id: orderId })}>Order Detail</Link>

// TypeScript errors:
paths.for("/dashboard/orders/:id"); // Error: missing required param 'id'
paths.for("/invalid-route");        // Error: route doesn't exist
```

---

# Technical Design

## Overview

This plugin enables file-based routing for AppShell by scanning the filesystem and generating a virtual module. It intercepts `@tailor-platform/app-shell` imports to automatically inject discovered pages.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ User Code: import { AppShell } from "@tailor-platform/app-shell"        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Auto-Inject Plugin (enforce: "pre")                                     │
│ - Intercepts @tailor-platform/app-shell imports                         │
│ - Resolves to virtual:app-shell-proxy                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ virtual:app-shell-proxy                                                 │
│ 1. import { pages } from "virtual:app-shell-pages"                      │
│ 2. import { AppShell as _Original } from "@tailor-platform/app-shell"   │
│ 3. export * from "@tailor-platform/app-shell"                           │
│ 4. export const AppShell = _Original.WithPages(pages)                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Wrapped AppShell Component                                              │
│ - pages are pre-configured via WithPages                                │
│ - User can still override with modules prop if needed                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Plugin Composition

`appShellRoutes()` returns `Plugin[]` consisting of the following plugins:

1. **app-shell-virtual-pages**: Provides `virtual:app-shell-pages` virtual module
2. **app-shell-auto-pages-inject**: Intercepts `@tailor-platform/app-shell` imports
3. **app-shell-typed-routes**: Generates typed routes file (when `generateTypedRoutes` is enabled)

## Virtual Module Specification

The plugin generates a virtual module `virtual:app-shell-pages`:

```typescript
// virtual:app-shell-pages (generated)
import Page0 from "/src/pages/page.tsx";
import Page1 from "/src/pages/dashboard/page.tsx";
import Page2 from "/src/pages/dashboard/orders/page.tsx";
import Page3 from "/src/pages/dashboard/orders/[id]/page.tsx";

export const pages = [
  { path: "/", component: Page0 },
  { path: "/dashboard", component: Page1 },
  { path: "/dashboard/orders", component: Page2 },
  { path: "/dashboard/orders/:id", component: Page3 },
];

export default pages;
```

## Auto-Inject Proxy Module

The generated proxy module that replaces `@tailor-platform/app-shell` imports:

```typescript
import { pages } from "virtual:app-shell-pages";
import { AppShell as _OriginalAppShell } from "@tailor-platform/app-shell";

// Re-export everything from the original package
export * from "@tailor-platform/app-shell";

// Override AppShell with pages pre-configured via WithPages
export const AppShell = _OriginalAppShell.WithPages(pages);
```

## Why `enforce: "pre"` is Required

Vite resolves node_modules packages first by default. To intercept `@tailor-platform/app-shell` imports, the plugin must use `enforce: "pre"` to run before other resolvers (especially workspace package resolution).

## AppShell.WithPages (Internal)

```typescript
// packages/core/src/components/appshell.tsx

/**
 * @internal
 * This method is used internally by the vite-plugin to inject pages.
 * Users should not call this directly.
 */
AppShell.WithPages = (pages: PageEntry[]): FC<AppShellProps> => {
  // Convert pages to modules at component creation time
  const allModules = convertPagesToModules(pages);
  const rootModule = allModules.find((m) => m.path === "");
  const otherModules = allModules.filter((m) => m.path !== "");

  return (props) => (
    <AppShell
      {...props}
      modules={props.modules ?? otherModules}
      rootComponent={props.rootComponent ?? rootModule?.component}
    />
  );
};
```

## Why AppShell.WithPages over Alternatives

| Approach | Problem |
|----------|---------|
| `globalThis` | Global state dependency, HMR complexity |
| `pages` prop | Requires explicit user import/prop passing |
| `AppShell.WithPages` HOC | ✅ Transparent injection via Auto-inject |

## Path Conversion

| Directory Name | Converts To | Description |
|----------------|-------------|-------------|
| `orders` | `orders` | Static segment |
| `[id]` | `:id` | Dynamic parameter |
| `(group)` | (excluded) | Grouping only (not in path) |
| `_lib` | (ignored) | Not routed (for shared logic) |

## HMR Support

The plugin watches `pagesDir` for file additions/deletions and triggers automatic reload when the page structure changes.
