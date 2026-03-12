---
title: WithGuard
description: Conditionally render UI elements based on guard evaluation with support for async permissions checks
---

# WithGuard

`WithGuard` is a component for conditionally rendering UI elements based on guard evaluation. It uses the same guard system as route-level guards, making permission logic reusable throughout your application.

## Import

```tsx
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

const isAdmin = ({ context }) => (context.currentUser?.role === "admin" ? pass() : hidden());

function AdminPanel() {
  return (
    <div>
      <h1>Dashboard</h1>

      <WithGuard guards={[isAdmin]}>
        <Button>Delete All Users</Button>
      </WithGuard>
    </div>
  );
}
```

If the user is not an admin, the button won't render.

## Props

| Prop       | Type              | Default      | Description                                         |
| ---------- | ----------------- | ------------ | --------------------------------------------------- |
| `guards`   | `Guard[]`         | **Required** | Array of guard functions to evaluate                |
| `children` | `React.ReactNode` | **Required** | Content to render when all guards pass              |
| `fallback` | `React.ReactNode` | `null`       | Content to render when any guard returns `hidden()` |
| `loading`  | `React.ReactNode` | `null`       | Content to show while async guards are evaluating   |

## Guard Functions

WithGuard uses the same `Guard` type as route guards:

```typescript
type Guard = (ctx: GuardContext) => GuardResult | Promise<GuardResult>;

type GuardResult =
  | { type: "pass" } // Allow rendering
  | { type: "hidden" }; // Hide content (render fallback)
```

**Note:** Unlike route guards, `redirectTo()` is **not supported** in WithGuard. Use `hidden()` with a fallback that handles navigation if needed.

### Creating Guards

```tsx
import { type Guard, pass, hidden } from "@tailor-platform/app-shell";

// Simple guard
const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : hidden();
};

// Async guard with API call
const hasPermission: Guard = async ({ context }) => {
  const canAccess = await fetch("/api/permissions/admin")
    .then((r) => r.json())
    .then((data) => data.allowed);

  return canAccess ? pass() : hidden();
};

// Parameterized guard (curried function)
const isOwner =
  (resourceId: string): Guard =>
  ({ context }) => {
    return context.currentUser?.id === resourceId ? pass() : hidden();
  };
```

## Examples

### Simple Role Check

```tsx
const isAdmin = ({ context }) => (context.currentUser?.role === "admin" ? pass() : hidden());

<WithGuard guards={[isAdmin]}>
  <Button>Admin Settings</Button>
</WithGuard>;
```

### With Fallback

Show alternative content when guard fails:

```tsx
<WithGuard guards={[isAdmin]} fallback={<p>You need admin access to view this.</p>}>
  <AdminPanel />
</WithGuard>
```

### With Loading State

Show loading spinner while checking permissions:

```tsx
const checkPermission: Guard = async ({ context }) => {
  const allowed = await api.checkPermission("admin");
  return allowed ? pass() : hidden();
};

<WithGuard guards={[checkPermission]} loading={<Spinner />} fallback={<UpgradePrompt />}>
  <PremiumFeature />
</WithGuard>;
```

### Multiple Guards

All guards must pass for content to render:

```tsx
const isAdmin = ({ context }) => (context.currentUser?.role === "admin" ? pass() : hidden());

const hasFeatureFlag = ({ context }) => (context.featureFlags?.betaFeatures ? pass() : hidden());

<WithGuard guards={[isAdmin, hasFeatureFlag]}>
  <BetaAdminFeature />
</WithGuard>;
```

### Parameterized Guards

Use curried functions to create reusable parameterized guards:

```tsx
const isOwner =
  (resourceId: string): Guard =>
  ({ context }) => {
    return context.currentUser?.id === resourceId ? pass() : hidden();
  };

function ResourceActions({ resourceId }) {
  return (
    <WithGuard guards={[isOwner(resourceId)]}>
      <Button>Edit</Button>
      <Button>Delete</Button>
    </WithGuard>
  );
}
```

### In Sidebar Navigation

Conditionally show navigation items:

```tsx
import { DefaultSidebar, SidebarItem, WithGuard } from "@tailor-platform/app-shell";

const isAdmin = ({ context }) => (context.currentUser?.role === "admin" ? pass() : hidden());

<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <SidebarItem to="/products" />

  <WithGuard guards={[isAdmin]}>
    <SidebarItem to="/admin" />
    <SidebarItem to="/settings" />
  </WithGuard>
</DefaultSidebar>;
```

### Feature Flags

Toggle features based on flags:

```tsx
const hasBetaFeature = ({ context }) => (context.featureFlags?.newDashboard ? pass() : hidden());

<WithGuard guards={[hasBetaFeature]} fallback={<OldDashboard />}>
  <NewDashboard />
</WithGuard>;
```

### Subscription Tiers

Show features based on user's subscription:

```tsx
const isPremium = ({ context }) =>
  context.currentUser?.subscription === "premium" ? pass() : hidden();

<WithGuard
  guards={[isPremium]}
  fallback={
    <Card>
      <h3>Premium Feature</h3>
      <p>Upgrade to access advanced analytics.</p>
      <Button>Upgrade Now</Button>
    </Card>
  }
>
  <AdvancedAnalytics />
</WithGuard>;
```

### Dynamic Permissions

Check permissions from API:

```tsx
const canDeleteOrder =
  (orderId: string): Guard =>
  async ({ context }) => {
    const response = await fetch(`/api/orders/${orderId}/permissions`);
    const { canDelete } = await response.json();
    return canDelete ? pass() : hidden();
  };

function OrderActions({ orderId }) {
  return (
    <div>
      <Button>View</Button>
      <Button>Edit</Button>
      <WithGuard guards={[canDeleteOrder(orderId)]} loading={<Spinner size="sm" />}>
        <Button variant="destructive">Delete</Button>
      </WithGuard>
    </div>
  );
}
```

### Combining with Route Guards

Reuse the same guards for routes and UI:

```tsx
// guards.ts
export const requireAuth: Guard = ({ context }) => {
  return context.currentUser ? pass() : hidden();
};

export const isAdmin: Guard = ({ context }) => {
  return context.currentUser?.role === "admin" ? pass() : hidden();
};

// routes.tsx
const adminModule = defineModule({
  path: "admin",
  component: AdminPage,
  guards: [requireAuth, isAdmin], // Route-level
});

// component.tsx
<WithGuard guards={[requireAuth, isAdmin]}>
  {" "}
  {/* UI-level */}
  <AdminSettings />
</WithGuard>;
```

## Guard Evaluation

Guards are evaluated in order and stop at the first non-pass result:

```tsx
const guards = [guardA, guardB, guardC];

// If guardA returns hidden(), guardB and guardC are NOT evaluated
<WithGuard guards={guards}>
  <Content />
</WithGuard>;
```

## Performance

### Caching

WithGuard caches guard results based on `contextData` reference:

- Guards re-evaluate when `contextData` changes
- Guards do NOT re-evaluate when props change (except `guards` array)

### Suspense Integration

Async guards use React Suspense:

- Shows `loading` prop while evaluating
- Renders `children` or `fallback` when complete
- Automatically suspends during evaluation

## Context Data

Guards receive the same context as route guards:

```typescript
// Define context type
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: User | null;
      featureFlags: FeatureFlags;
      permissions: string[];
    };
  }
}

// Use in guards
const hasPermission =
  (perm: string): Guard =>
  ({ context }) => {
    return context.permissions.includes(perm) ? pass() : hidden();
  };
```

## Comparison: WithGuard vs Route Guards

| Feature                     | WithGuard                | Route Guards                |
| --------------------------- | ------------------------ | --------------------------- |
| **Purpose**                 | Conditional UI rendering | Route access control        |
| **Location**                | Inside components        | Module/resource definitions |
| **Supports `pass()`**       | ✅ Yes                   | ✅ Yes                      |
| **Supports `hidden()`**     | ✅ Yes                   | ✅ Yes                      |
| **Supports `redirectTo()`** | ❌ No                    | ✅ Yes                      |
| **Async guards**            | ✅ Yes                   | ✅ Yes                      |
| **Reusable**                | ✅ Yes                   | ✅ Yes                      |

## Best Practices

### Do:

- ✅ Reuse guards between routes and UI
- ✅ Use descriptive guard names (`isAdmin`, `canEdit`)
- ✅ Provide fallback for better UX
- ✅ Show loading state for async guards
- ✅ Cache expensive permission checks

### Don't:

- ❌ Use `redirectTo()` in WithGuard (not supported)
- ❌ Make guards too complex (extract to functions)
- ❌ Forget to handle loading states
- ❌ Skip fallback when hiding important features
- ❌ Duplicate permission logic (reuse guards)

## Accessibility

- Content is fully removed from DOM when hidden (not just visually)
- Screen readers won't announce hidden content
- Loading states should be announced to screen readers
- Fallback content should be accessible

## TypeScript

Full type safety with TypeScript:

```typescript
import { type Guard, type WithGuardProps } from "@tailor-platform/app-shell";

// Type-safe guard
const isAdmin: Guard = ({ context }) => {
  // context is fully typed
  return context.currentUser?.role === "admin" ? pass() : hidden();
};

// Type-safe props
const guardProps: WithGuardProps = {
  guards: [isAdmin],
  children: <AdminPanel />,
  fallback: <AccessDenied />,
};
```

## Troubleshooting

### Guard not re-evaluating

**Problem:** Guard doesn't update when data changes

**Solution:** Ensure `contextData` reference changes:

```tsx
// ❌ Bad - mutating object
context.currentUser.role = "admin";

// ✅ Good - new reference
setContextData({
  ...contextData,
  currentUser: { ...currentUser, role: "admin" },
});
```

### Infinite loading

**Problem:** Loading state never resolves

**Solution:** Ensure async guards return a result:

```tsx
// ❌ Bad - no return
const checkPermission: Guard = async ({ context }) => {
  await fetch("/api/check");
  // Missing return!
};

// ✅ Good - returns result
const checkPermission: Guard = async ({ context }) => {
  const allowed = await fetch("/api/check").then((r) => r.json());
  return allowed ? pass() : hidden();
};
```

## Related Components

- [AppShell](./app-shell.md) - Context provider for guards
- [SidebarItem](./sidebar-item.md) - Use WithGuard in navigation

## Related Concepts

- [Guards and Permissions](../guides/guards-permissions.md) - Comprehensive guard guide
- [Modules and Resources](../concepts/modules-and-resources.md) - Route-level guards

## API Reference

- [pass()](../api/guards/pass.md) - Allow access guard
- [hidden()](../api/guards/hidden.md) - Hide content guard
- [Guards Overview](../api/guards/overview.md) - Complete guard reference
