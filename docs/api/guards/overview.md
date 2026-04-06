---
title: Guards Overview
description: Access control system for routes and components using guard functions
---

# Guards Overview

Guards are functions that control access to routes and UI elements in AppShell. They provide a flexible, composable way to implement permission-based and role-based access control.

## How Guards Work

Guards are executed sequentially and can return one of three results:

- **`pass()`** - Allow access, continue to next guard
- **`hidden()`** - Deny access, return 404
- **`redirectTo(path)`** - Redirect to another page

If any guard returns `hidden()` or `redirectTo()`, execution stops immediately.

## Guard Function Signature

```typescript
type Guard = (ctx: GuardContext) => GuardResult | Promise<GuardResult>

type GuardContext = {
  context: ContextData // Your custom context from AppShell
}

type GuardResult = { type: "pass" } | { type: "hidden" } | { type: "redirect"; to: string }
```

## Guard Functions

### pass()

Allows access and continues to the next guard.

```typescript
import { pass } from "@tailor-platform/app-shell"

const allowAll: Guard = () => pass()
```

[Full Reference →](./pass.md)

### hidden()

Denies access and shows 404 Not Found.

```typescript
import { hidden } from "@tailor-platform/app-shell"

const denyAll: Guard = () => hidden()
```

[Full Reference →](./hidden.md)

### redirectTo(path)

Redirects to another page.

```typescript
import { redirectTo } from "@tailor-platform/app-shell"

const redirectToLogin: Guard = () => redirectTo("/login")
```

[Full Reference →](./redirect-to.md)

## Usage Locations

### Route-Level Guards

Applied to modules and resources:

```typescript
import { defineModule, pass, hidden } from "@tailor-platform/app-shell"

const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  guards: [
    ({ context }) => {
      return context.currentUser?.role === "admin" ? pass() : hidden()
    },
  ],
})
```

### Component-Level Guards

Applied to UI elements with `WithGuard`:

```typescript
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

const isAdmin = ({ context }) =>
  context.currentUser?.role === "admin" ? pass() : hidden();

<WithGuard guards={[isAdmin]}>
  <Button>Delete All</Button>
</WithGuard>
```

## Context Data

Guards receive context data from AppShell:

```typescript
// Define your context type
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: User | null;
      permissions: string[];
      featureFlags: FeatureFlags;
    };
  }
}

// Pass context to AppShell
<AppShell
  modules={modules}
  contextData={{
    currentUser,
    permissions,
    featureFlags,
  }}
>
  {/* ... */}
</AppShell>

// Access in guards
const guard: Guard = ({ context }) => {
  // context is fully typed!
  if (context.currentUser) {
    return pass();
  }
  return hidden();
};
```

## Common Patterns

### Authentication Check

```typescript
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login")
  }
  return pass()
}
```

### Role-Based Access

```typescript
const requireAdmin: Guard = ({ context }) => {
  if (context.currentUser?.role !== "admin") {
    return hidden()
  }
  return pass()
}
```

### Permission-Based Access

```typescript
const requirePermission =
  (permission: string): Guard =>
  ({ context }) => {
    if (!context.permissions.includes(permission)) {
      return hidden()
    }
    return pass()
  }

// Usage
guards: [requirePermission("users:delete")]
```

### Feature Flags

```typescript
const requireFeature =
  (flag: string): Guard =>
  ({ context }) => {
    if (!context.featureFlags[flag]) {
      return hidden()
    }
    return pass()
  }
```

### Async Permission Check

```typescript
const checkApiPermission: Guard = async ({ context }) => {
  const response = await fetch("/api/permissions/admin")
  const { allowed } = await response.json()
  return allowed ? pass() : hidden()
}
```

### Multiple Guards (AND logic)

```typescript
const guards = [requireAuth, requireAdmin, requireFeature("beta")]

// All must pass() for access to be granted
defineModule({
  path: "admin",
  guards: guards,
})
```

### Reusable Guard Library

```typescript
// guards.ts
export const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : redirectTo("/login")
}

export const requireRole =
  (role: string): Guard =>
  ({ context }) => {
    return context.currentUser?.role === role ? pass() : hidden()
  }

export const requirePermission =
  (perm: string): Guard =>
  ({ context }) => {
    return context.permissions.includes(perm) ? pass() : hidden()
  }

// Usage across application
import { requireAuth, requireRole } from "./guards"

defineModule({
  path: "admin",
  guards: [requireAuth, requireRole("admin")],
})
```

## Guard Execution Order

Guards are executed sequentially in the order they're defined:

```typescript
guards: [guardA, guardB, guardC]

// Execution:
// 1. guardA runs → if not pass(), stop
// 2. guardB runs → if not pass(), stop
// 3. guardC runs → if not pass(), stop
// 4. All passed → grant access
```

## Navigation Behavior

When guards return `hidden()`:

- Route returns 404 Not Found
- Item hidden from sidebar navigation
- Item hidden from CommandPalette
- Breadcrumbs don't show the page

When guards return `redirectTo()`:

- User is redirected immediately
- Original URL is not accessible
- Useful for login flows

## Best Practices

### Do:

- ✅ Keep guards simple and focused
- ✅ Reuse guards across routes and components
- ✅ Use descriptive names (requireAuth, not guard1)
- ✅ Return quickly for better performance
- ✅ Cache expensive checks when possible

### Don't:

- ❌ Make guards too complex (extract logic)
- ❌ Have side effects in guards (logging OK)
- ❌ Duplicate guard logic (DRY principle)
- ❌ Forget to handle async errors
- ❌ Use redirectTo() in WithGuard (not supported)

## TypeScript

Full type safety:

```typescript
import { type Guard, type GuardContext, type GuardResult } from "@tailor-platform/app-shell"

const myGuard: Guard = (ctx: GuardContext): GuardResult => {
  // Fully typed context
  return pass()
}

// Async guard
const asyncGuard: Guard = async (ctx): Promise<GuardResult> => {
  await someAsyncCheck()
  return pass()
}
```

## Performance

### Sync Guards (Fast)

```typescript
const isAdmin: Guard = ({ context }) => {
  return context.currentUser?.role === "admin" ? pass() : hidden()
}
// ~0ms - Instant
```

### Async Guards (Slower)

```typescript
const checkPermission: Guard = async ({ context }) => {
  const allowed = await fetch("/api/check")
  return allowed ? pass() : hidden()
}
// ~50-200ms - Network request
```

**Tip:** Prefer sync guards when possible. Cache API results in context data.

## Comparison: Route vs Component Guards

| Aspect                    | Route Guards                | Component Guards (WithGuard) |
| ------------------------- | --------------------------- | ---------------------------- |
| **Location**              | defineModule/defineResource | WithGuard component          |
| **Supports pass()**       | ✅ Yes                      | ✅ Yes                       |
| **Supports hidden()**     | ✅ Yes                      | ✅ Yes                       |
| **Supports redirectTo()** | ✅ Yes                      | ❌ No                        |
| **Execution**             | Before route loads          | During render                |
| **Use Case**              | Page access control         | UI element visibility        |

## Related

- [pass()](./pass.md) - Allow access guard function
- [hidden()](./hidden.md) - Hide/deny access guard function
- [redirectTo()](./redirect-to.md) - Redirect guard function
- [WithGuard Component](../../components/with-guard.md) - Component-level guards
- [Guards & Permissions Guide](../../guides/guards-permissions.md) - Detailed tutorial
