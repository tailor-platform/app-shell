---
title: useAppShellData
description: Hook to access custom context data passed to AppShell
---

# useAppShellData

React hook to access only the custom context data. This is a lighter alternative to `useAppShell` when you only need the contextData.

## Signature

```typescript
const useAppShellData: () => ContextData;
```

## Return Value

| Type          | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `ContextData` | Custom context data passed to AppShell (type-safe via `AppShellRegister`) |

## Usage

### Basic Access

```typescript
import { useAppShellData } from "@tailor-platform/app-shell";

function UserProfile() {
  const contextData = useAppShellData();

  return (
    <div>
      <p>Welcome, {contextData.currentUser?.name}</p>
      <p>Role: {contextData.currentUser?.role}</p>
    </div>
  );
}
```

### Display User Info

```typescript
function UserInfo() {
  const data = useAppShellData();

  if (!data.currentUser) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{data.currentUser.name}</h2>
      <p>{data.currentUser.email}</p>
    </div>
  );
}
```

### Check Permissions

```typescript
function AdminPanel() {
  const { permissions } = useAppShellData();
  const canManageUsers = permissions.includes("users:manage");

  if (!canManageUsers) {
    return <AccessDenied />;
  }

  return <UserManagement />;
}
```

### Feature Flags

```typescript
function BetaFeature() {
  const { featureFlags } = useAppShellData();

  if (!featureFlags?.newEditor) {
    return <LegacyEditor />;
  }

  return <NewEditor />;
}
```

## Type Safety

Define your context type with module augmentation:

```typescript
// types.d.ts
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: User | null;
      permissions: string[];
      tenantId: string;
      featureFlags: {
        newEditor: boolean;
        betaDashboard: boolean;
      };
    };
  }
}
```

Now `useAppShellData()` returns fully typed data:

```typescript
const data = useAppShellData();
data.currentUser; // Type: User | null
data.permissions; // Type: string[]
data.featureFlags; // Type: { newEditor: boolean, betaDashboard: boolean }
```

## When to Use

Use `useAppShellData` when you only need context data:

```typescript
// ✅ Good - only need context
const data = useAppShellData();

// ❌ Overkill - useAppShell returns more than needed
const { context } = useAppShell();
```

## Comparison with Other Hooks

| Hook                | Returns               | Use When            |
| ------------------- | --------------------- | ------------------- |
| `useAppShellData`   | Context data only     | Need custom context |
| `useAppShellConfig` | Configuration only    | Need config data    |
| `useAppShell`       | Both config + context | Need both           |

## Related

- [useAppShell](./use-app-shell.md) - Full context access
- [useAppShellConfig](./use-app-shell-config.md) - Configuration only
- [AppShell Component](../components/app-shell.md) - Root component
- [Guards Overview](./guards/overview.md) - Using context in guards
