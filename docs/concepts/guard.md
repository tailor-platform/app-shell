---
title: Guards
description: Control access to routes and UI elements using guard functions for permission checks, role-based access, and feature flags
---

# Guards

Guards are functions that decide whether a user can access a route or see a UI element. They are the primary mechanism in AppShell for implementing permission-based access control, role checks, and feature flags.

## Core Concepts

A guard is a function that receives context data and returns one of three results:

- **`pass()`** — Allow access and continue to the next guard
- **`hidden()`** — Deny access (route returns 404 / UI element is hidden)
- **`redirectTo(path)`** — Redirect the user to another path (route guards only)

Guards are evaluated in order. Execution stops at the first non-`pass()` result, so the order you define them in matters.

```typescript
import { type Guard, pass, hidden, redirectTo } from "@tailor-platform/app-shell";

const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : redirectTo("/login");
};

const requireAdmin: Guard = ({ context }) => {
  return context.currentUser?.role === "admin" ? pass() : hidden();
};
```

## Guard Function Signature

```typescript
type Guard = (ctx: GuardContext) => GuardResult | Promise<GuardResult>;

type GuardContext = {
  context: ContextData; // Your custom context passed to AppShell
};

type GuardResult =
  | { type: "pass" }                // Allow access
  | { type: "hidden" }              // Deny access (404 / hide element)
  | { type: "redirect"; to: string }; // Redirect
```

Guards can be synchronous or async. Use async guards when you need to make a network request to check permissions.

## Where Guards Can Be Used

AppShell supports guards in two places: on **routes** (modules and resources) and on **UI elements** (via `WithGuard`).

### Route Guards

Attach guards to a module or resource using the `guards` property. Route guards run before the route loads and affect both navigation and URL access.

```tsx
import { defineModule, defineResource, pass, hidden, redirectTo } from "@tailor-platform/app-shell";

const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  guards: [requireAuth, requireAdmin],
});

const settingsResource = defineResource({
  path: "settings",
  component: SettingsPage,
  guards: [requireAuth],
});
```

When a route guard returns `hidden()`, AppShell:

- Hides the item from the sidebar navigation
- Hides the item from CommandPalette search results
- Returns a 404 if the user navigates directly to the URL

When a route guard returns `redirectTo(path)`, the user is redirected immediately, and the original URL is not accessible.

### Component Guards (`WithGuard`)

Use the `WithGuard` component to conditionally render UI elements based on the same guard functions. This is useful for hiding buttons, sections, or actions that the user does not have permission to use.

```tsx
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

const isAdmin: Guard = ({ context }) =>
  context.currentUser?.role === "admin" ? pass() : hidden();

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <WithGuard guards={[isAdmin]}>
        <Button>Delete All Records</Button>
      </WithGuard>
    </div>
  );
}
```

> **Note:** `redirectTo()` is not supported inside `WithGuard`. Use `hidden()` with a `fallback` prop to handle alternative content.

## Context Data

Guards receive the `contextData` you pass to `AppShell`. Extend the `AppShellRegister` interface to make context fully typed:

```typescript
// types.ts
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: { id: string; role: string } | null;
      permissions: string[];
      featureFlags: Record<string, boolean>;
    };
  }
}
```

```tsx
// App.tsx
<AppShell
  modules={modules}
  contextData={{
    currentUser,
    permissions,
    featureFlags,
  }}
>
  <SidebarLayout />
</AppShell>
```

Guards then have full type safety:

```typescript
const requirePermission =
  (perm: string): Guard =>
  ({ context }) => {
    // context.permissions is typed as string[]
    return context.permissions.includes(perm) ? pass() : hidden();
  };
```

## Common Patterns

### Authentication Check

Redirect unauthenticated users to the login page:

```typescript
const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : redirectTo("/login");
};
```

### Role-Based Access

Allow only users with a specific role:

```typescript
const requireRole =
  (role: string): Guard =>
  ({ context }) => {
    return context.currentUser?.role === role ? pass() : hidden();
  };

// Usage
guards: [requireAuth, requireRole("admin")];
```

### Permission-Based Access

Check against a list of permissions:

```typescript
const requirePermission =
  (perm: string): Guard =>
  ({ context }) => {
    return context.permissions.includes(perm) ? pass() : hidden();
  };

// Usage
guards: [requireAuth, requirePermission("reports:read")];
```

### Feature Flags

Toggle routes or UI based on feature flags:

```typescript
const requireFeature =
  (flag: string): Guard =>
  ({ context }) => {
    return context.featureFlags[flag] ? pass() : hidden();
  };

// Usage
guards: [requireFeature("new-dashboard")];
```

### Async Permission Check

Fetch permissions from an API when they are not available in context:

```typescript
const checkApiPermission: Guard = async ({ context }) => {
  const { allowed } = await fetch("/api/permissions/reports")
    .then((r) => r.json());
  return allowed ? pass() : hidden();
};
```

> **Tip:** Async guards add latency. When possible, prefetch permissions and store them in `contextData` so sync guards can check them instantly.

### Tenant Tier

Restrict access based on subscription tier:

```typescript
const requirePlan =
  (plan: string): Guard =>
  async ({ context }) => {
    const current = await getCurrentTenantPlan();
    return current === plan ? pass() : hidden();
  };

guards: [requirePlan("enterprise")];
```

## Building a Reusable Guard Library

Define your guards once and share them across routes and components:

```typescript
// src/guards.ts
import { type Guard, pass, hidden, redirectTo } from "@tailor-platform/app-shell";

export const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : redirectTo("/login");
};

export const requireAdmin: Guard = ({ context }) => {
  return context.currentUser?.role === "admin" ? pass() : hidden();
};

export const requirePermission =
  (perm: string): Guard =>
  ({ context }) => {
    return context.permissions.includes(perm) ? pass() : hidden();
  };

export const requireFeature =
  (flag: string): Guard =>
  ({ context }) => {
    return context.featureFlags[flag] ? pass() : hidden();
  };
```

Use in routes:

```tsx
import { requireAuth, requireAdmin } from "./guards";

const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  guards: [requireAuth, requireAdmin],
});
```

Use in components (same guards, no duplication):

```tsx
import { requireAdmin } from "./guards";

<WithGuard guards={[requireAdmin]}>
  <AdminSettings />
</WithGuard>
```

## Guard Evaluation Order

Guards are executed sequentially. If any guard returns a non-`pass()` result, the remaining guards are skipped:

```typescript
guards: [guardA, guardB, guardC];

// 1. guardA runs → returns pass(), continue
// 2. guardB runs → returns hidden(), STOP
// 3. guardC is never evaluated
```

This means you should put cheap, synchronous guards (like auth checks) before expensive async guards (like API permission checks).

## Route Guards vs Component Guards

| Aspect                      | Route Guards (`defineModule` / `defineResource`) | Component Guards (`WithGuard`)      |
| --------------------------- | ------------------------------------------------ | ----------------------------------- |
| **Applies to**              | Whole route (page)                               | Individual UI element               |
| **Supports `pass()`**       | ✅ Yes                                           | ✅ Yes                              |
| **Supports `hidden()`**     | ✅ Yes                                           | ✅ Yes                              |
| **Supports `redirectTo()`** | ✅ Yes                                           | ❌ No                               |
| **Execution timing**        | Before the route loads                           | During render                       |
| **Hides from navigation**   | ✅ Yes (sidebar, CommandPalette)                 | ❌ No (only hides the element)      |
| **Blocks direct URL access**| ✅ Yes (returns 404)                             | ❌ No                               |
| **Async support**           | ✅ Yes                                           | ✅ Yes (with `loading` prop)        |

## Best Practices

**Do:**
- ✅ Build a shared `guards.ts` file and reuse guards across routes and components
- ✅ Place cheap synchronous guards before expensive async guards
- ✅ Use descriptive names (`requireAuth`, `requireAdmin`, `requirePermission("x")`)
- ✅ Provide a `fallback` in `WithGuard` so users know why content is hidden
- ✅ Show a `loading` state in `WithGuard` when using async guards
- ✅ Cache expensive API calls in `contextData` so guards can run synchronously

**Don't:**
- ❌ Use `redirectTo()` inside `WithGuard` (not supported — use `hidden()` instead)
- ❌ Put side effects like data mutations inside guards
- ❌ Duplicate permission logic — define it once and import it
- ❌ Forget that route guards also hide navigation items (sidebar, CommandPalette)

## Related

- [Modules and Resources](./modules-and-resources.md) — how to attach guards to routes
- [WithGuard Component](../components/with-guard.md) — component-level guard reference
- [Guards API Overview](../api/guards/overview.md) — full API reference for `pass()`, `hidden()`, `redirectTo()`
