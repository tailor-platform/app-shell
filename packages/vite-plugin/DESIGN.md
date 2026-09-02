# @tailor-platform/vite-plugin-app-shell Design

Internal implementation notes for maintainers. Consumer-facing setup and usage stay in [README.md](./README.md).

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
│ - modules and rootGuards are pre-configured via WithPages               │
│ - User can still override rootComponent and rootGuards via props        │
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

### Entrypoint mode (recommended)

When `entrypoint` is set, only imports from that specific file are intercepted.
All other files (including page components) import directly from the real package,
so there is no circular module dependency.

### Global mode (entrypoint not set)

All user-code imports of `@tailor-platform/app-shell` are intercepted. This creates
a circular dependency (proxy → pages → page components → proxy) which works in practice
but requires that page components do **not** import `AppShell` directly.

## Why `enforce: "pre"` is Required

Vite resolves node_modules packages first by default. To intercept `@tailor-platform/app-shell` imports, the plugin must use `enforce: "pre"` to run before other resolvers (especially workspace package resolution).

## AppShell.WithPages (Internal)

```typescript
// packages/core/src/components/appshell/appshell.tsx

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
      modules={otherModules}
      rootComponent={props.rootComponent ?? rootModule?.component}
      rootGuards={props.rootGuards ?? rootModule?.guards}
    />
  );
};
```

## Why AppShell.WithPages over Alternatives

| Approach                 | Problem                                    |
| ------------------------ | ------------------------------------------ |
| `globalThis`             | Global state dependency, HMR complexity    |
| `pages` prop             | Requires explicit user import/prop passing |
| `AppShell.WithPages` HOC | ✅ Transparent injection via Auto-inject   |

## Path Conversion

| Directory Name | Converts To | Description                   |
| -------------- | ----------- | ----------------------------- |
| `orders`       | `orders`    | Static segment                |
| `[id]`         | `:id`       | Dynamic parameter             |
| `[...slug]`    | `*slug`     | Catch-all parameter           |
| `(group)`      | (excluded)  | Grouping only (not in path)   |
| `_lib`         | (ignored)   | Not routed (for shared logic) |

## HMR Support

The plugin watches `pagesDir` for file additions/deletions and triggers automatic reload when the page structure changes.
