---
title: pass
description: Guard function that allows access and continues to the next guard
---

# pass()

Returns a guard result that allows access and continues to the next guard in the chain.

## Signature

```typescript
function pass(): GuardResult;
```

## Return Type

```typescript
{
  type: "pass";
}
```

## Usage

```typescript
import { pass, type Guard } from "@tailor-platform/app-shell";

const allowAccess: Guard = () => {
  return pass();
};
```

## When to Use

Use `pass()` when:

- ✅ Access should be granted
- ✅ User meets the required conditions
- ✅ You want to continue to the next guard

## Examples

### Always Allow

```typescript
const allowAll: Guard = () => pass();
```

### Conditional Access

```typescript
const requireAuth: Guard = ({ context }) => {
  if (context.currentUser) {
    return pass(); // User is authenticated
  }
  return redirectTo("/login");
};
```

### Role Check

```typescript
const requireAdmin: Guard = ({ context }) => {
  if (context.currentUser?.role === "admin") {
    return pass(); // User is admin
  }
  return hidden();
};
```

### Permission Check

```typescript
const requirePermission =
  (perm: string): Guard =>
  ({ context }) => {
    if (context.permissions.includes(perm)) {
      return pass(); // User has permission
    }
    return hidden();
  };
```

### Multiple Conditions

```typescript
const complexGuard: Guard = ({ context }) => {
  // Check multiple conditions
  if (context.currentUser && context.currentUser.active && !context.currentUser.suspended) {
    return pass(); // All conditions met
  }
  return hidden();
};
```

### Async Guard

```typescript
const asyncGuard: Guard = async ({ context }) => {
  const isValid = await validateToken(context.token);
  if (isValid) {
    return pass();
  }
  return redirectTo("/login");
};
```

## Guard Chaining

When `pass()` is returned, the next guard in the array executes:

```typescript
guards: [
  guardA, // Returns pass() → Continue to guardB
  guardB, // Returns pass() → Continue to guardC
  guardC, // Returns pass() → Grant access
];
```

If all guards return `pass()`, access is granted.

## Related

- [hidden()](./hidden.md) - Deny access and return 404
- [redirectTo()](./redirect-to.md) - Redirect to another page
- [Guards Overview](./overview.md) - Complete guard system guide
