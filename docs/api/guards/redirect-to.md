---
title: redirectTo
description: Guard function that redirects to another page
---

# redirectTo()

Returns a guard result that redirects the user to a different URL. Used primarily for authentication flows and access control redirection.

## Signature

```typescript
function redirectTo(to: string): GuardResult;
```

## Parameters

### `to`

- **Type:** `string`
- **Required:** Yes
- **Description:** Target URL path to redirect to

## Return Type

```typescript
{
  type: "redirect";
  to: string;
}
```

## Usage

```typescript
import { redirectTo, type Guard } from "@tailor-platform/app-shell";

const redirectToLogin: Guard = () => {
  return redirectTo("/login");
};
```

## When to Use

Use `redirectTo()` when:

- ✅ User needs authentication (redirect to login)
- ✅ User needs to complete setup (redirect to onboarding)
- ✅ Access denied but you want to show why (redirect to error page)
- ✅ You want explicit navigation vs silent denial

## Examples

### Require Authentication

```typescript
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login");
  }
  return pass();
};
```

### Subscription Required

```typescript
const requirePremium: Guard = ({ context }) => {
  if (context.currentUser?.plan !== "premium") {
    return redirectTo("/upgrade");
  }
  return pass();
};
```

### Complete Profile

```typescript
const requireProfile: Guard = ({ context }) => {
  if (!context.currentUser?.profileComplete) {
    return redirectTo("/complete-profile");
  }
  return pass();
};
```

### Email Verification

```typescript
const requireVerifiedEmail: Guard = ({ context }) => {
  if (!context.currentUser?.emailVerified) {
    return redirectTo("/verify-email");
  }
  return pass();
};
```

### Terms Acceptance

```typescript
const requireTerms: Guard = ({ context }) => {
  if (!context.currentUser?.termsAccepted) {
    return redirectTo("/accept-terms");
  }
  return pass();
};
```

### Role-Based Redirect

```typescript
const redirectNonAdmins: Guard = ({ context }) => {
  if (context.currentUser?.role !== "admin") {
    return redirectTo("/access-denied");
  }
  return pass();
};
```

### Conditional Redirect

```typescript
const conditionalRedirect: Guard = ({ context }) => {
  const user = context.currentUser;

  if (!user) {
    return redirectTo("/login");
  }

  if (user.suspended) {
    return redirectTo("/account-suspended");
  }

  if (!user.onboardingComplete) {
    return redirectTo("/onboarding");
  }

  return pass();
};
```

### Async Redirect

```typescript
const asyncRedirect: Guard = async ({ context }) => {
  const status = await fetch("/api/user-status");
  const { active } = await status.json();

  if (!active) {
    return redirectTo("/reactivate");
  }

  return pass();
};
```

## vs hidden()

| Aspect                | redirectTo()             | hidden()                |
| --------------------- | ------------------------ | ----------------------- |
| **Result**            | Redirect to URL          | 404 Not Found           |
| **User Experience**   | Clear (shows why denied) | Silent (no explanation) |
| **URL Changes**       | Yes                      | No                      |
| **Navigation Impact** | No effect                | Hides from navigation   |
| **Use Case**          | Login flows, errors      | Permission hiding       |

### Example: When to Use Each

```typescript
// Use redirectTo() - User needs to take action
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    return redirectTo("/login"); // Clear: "You need to log in"
  }
  return pass();
};

// Use hidden() - Feature doesn't exist for user
const adminFeature: Guard = ({ context }) => {
  if (!isAdmin(context)) {
    return hidden(); // Silent: User doesn't even know this exists
  }
  return pass();
};
```

## Redirect Chains

Guards can create redirect chains:

```typescript
const guards = [
  // 1. Check authentication
  ({ context }) => {
    if (!context.currentUser) {
      return redirectTo("/login");
    }
    return pass();
  },
  // 2. Check onboarding (only runs if authenticated)
  ({ context }) => {
    if (!context.currentUser?.onboardingComplete) {
      return redirectTo("/onboarding");
    }
    return pass();
  },
  // 3. Check permissions (only runs if onboarded)
  ({ context }) => {
    if (!context.currentUser?.hasAccess) {
      return redirectTo("/upgrade");
    }
    return pass();
  },
];
```

## Module vs Resource Redirects

### Module-Level

```typescript
const dashboardModule = defineModule({
  path: "dashboard",
  component: DashboardPage,
  guards: [
    ({ context }) => {
      if (!context.currentUser) {
        return redirectTo("/login");
      }
      return pass();
    },
  ],
});

// Accessing /dashboard without auth → Redirects to /login
```

### Resource-Level

```typescript
const settingsResource = defineResource({
  path: "settings",
  component: SettingsPage,
  guards: [
    ({ context }) => {
      if (!context.currentUser?.emailVerified) {
        return redirectTo("/verify-email");
      }
      return pass();
    },
  ],
});

// Accessing /settings without verified email → Redirects to /verify-email
```

## Limitations

### Not Supported in WithGuard

`redirectTo()` does **NOT** work with the `WithGuard` component:

```typescript
// ❌ NOT SUPPORTED
<WithGuard
  guards={[
    () => redirectTo("/login") // This won't work!
  ]}
>
  <Content />
</WithGuard>

// ✅ Use hidden() with fallback instead
<WithGuard
  guards={[() => hidden()]}
  fallback={<Navigate to="/login" />}
>
  <Content />
</WithGuard>
```

## Preserving Original URL

To preserve the original URL after redirect:

```typescript
const requireAuth: Guard = ({ context }) => {
  if (!context.currentUser) {
    const currentPath = window.location.pathname;
    return redirectTo(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  return pass();
};

// After login, redirect back:
// const redirect = searchParams.get('redirect');
// if (redirect) navigate(redirect);
```

## Related

- [pass()](./pass.md) - Allow access and continue
- [hidden()](./hidden.md) - Deny access and return 404
- [Guards Overview](./overview.md) - Complete guard system guide
- [WithGuard Component](../../components/with-guard.md) - Component-level guards (doesn't support redirectTo)
