---
title: hidden
description: Guard function that denies access and returns 404 Not Found
---

# hidden()

Returns a guard result that denies access and makes the route return 404 Not Found. The route is also hidden from navigation and search.

## Signature

```typescript
function hidden(): GuardResult
```

## Return Type

```typescript
{ type: "hidden" }
```

## Usage

```typescript
import { hidden, type Guard } from "@tailor-platform/app-shell";

const denyAccess: Guard = () => {
  return hidden();
};
```

## When to Use

Use `hidden()` when:
- ✅ Access should be denied
- ✅ User doesn't have required permissions
- ✅ You want to hide the page completely (404)
- ✅ Feature is not available for current user

## Effects

When `hidden()` is returned:
- 🚫 Route returns **404 Not Found**
- 🚫 Hidden from **sidebar navigation**
- 🚫 Hidden from **CommandPalette** search
- 🚫 Not shown in **breadcrumbs**
- 🚫 Direct URL access returns 404

## Examples

### Deny All Access

```typescript
const denyAll: Guard = () => hidden();
```

### Role-Based Hiding

```typescript
const adminOnly: Guard = ({ context }) => {
  if (context.currentUser?.role !== "admin") {
    return hidden(); // Non-admins see 404
  }
  return pass();
};
```

### Permission-Based Hiding

```typescript
const requirePermission = (perm: string): Guard => ({ context }) => {
  if (!context.permissions.includes(perm)) {
    return hidden(); // No permission → 404
  }
  return pass();
};
```

### Feature Flag

```typescript
const requireBetaFeature: Guard = ({ context }) => {
  if (!context.featureFlags?.beta) {
    return hidden(); // Feature disabled → 404
  }
  return pass();
};
```

### Subscription Tier

```typescript
const premiumOnly: Guard = ({ context }) => {
  if (context.currentUser?.plan !== "premium") {
    return hidden(); // Free users see 404
  }
  return pass();
};
```

### Conditional Hiding

```typescript
const conditionalHide: Guard = ({ context }) => {
  // Multiple conditions
  if (
    !context.currentUser ||
    context.currentUser.suspended ||
    !context.currentUser.emailVerified
  ) {
    return hidden();
  }
  return pass();
};
```

### Async Permission Check

```typescript
const asyncHide: Guard = async ({ context }) => {
  const allowed = await fetch("/api/check-access");
  if (!allowed) {
    return hidden();
  }
  return pass();
};
```

## vs redirectTo()

| Aspect | hidden() | redirectTo() |
|--------|----------|--------------|
| **Result** | 404 Not Found | Redirect to page |
| **URL** | Stays same | Changes to new URL |
| **Navigation** | Hidden | Not affected |
| **Use Case** | Deny access silently | Send to login/error page |

### Example: When to Use Each

```typescript
// Use hidden() - Silently deny access
const adminFeature: Guard = ({ context }) => {
  if (!isAdmin(context)) {
    return hidden(); // Non-admins don't even see this exists
  }
  return pass();
};

// Use redirectTo() - Explicitly redirect
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login"); // Unauthenticated users go to login
  }
  return pass();
};
```

## Navigation Impact

```typescript
// Before guard (user is not admin):
Sidebar:
› Dashboard
› Products
› Admin Panel  ← Visible

// After guard returns hidden():
Sidebar:
› Dashboard
› Products
               ← Admin Panel disappeared

// Direct URL access: /admin
// Result: 404 Not Found
```

## WithGuard Component

`hidden()` works with `WithGuard` to hide UI elements:

```typescript
import { WithGuard, hidden, pass } from "@tailor-platform/app-shell";

const isAdmin = ({ context }) =>
  context.currentUser?.role === "admin" ? pass() : hidden();

<WithGuard guards={[isAdmin]}>
  <Button>Delete All Users</Button>
</WithGuard>
// Non-admins: button doesn't render
```

## Related

- [pass()](./pass.md) - Allow access and continue
- [redirectTo()](./redirect-to.md) - Redirect to another page
- [Guards Overview](./overview.md) - Complete guard system guide
- [WithGuard Component](../../components/with-guard.md) - Component-level guards
