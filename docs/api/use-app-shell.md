---
title: useAppShell
description: Hook to access AppShell context data and configuration
---

# useAppShell

React hook to access AppShell context data and configuration within your components.

## Signature

```typescript
const useAppShell: () => {
  context: ContextData;
  contextData: ContextData;
  configurations: AppShellConfig;
};
```

## Return Value

### `context` / `contextData`

- **Type:** `ContextData`
- **Description:** Custom context data passed to AppShell. Same as the `contextData` prop.

### `configurations`

- **Type:** `AppShellConfig`
- **Description:** AppShell configuration (locale, basePath, etc.)

## Usage

### Basic Access

```typescript
import { useAppShell } from "@tailor-platform/app-shell";

function MyComponent() {
  const { context } = useAppShell();

  return <div>Welcome, {context.currentUser?.name}</div>;
}
```

### Access Configuration

```typescript
function LocaleDisplay() {
  const { configurations } = useAppShell();

  return <div>Current locale: {configurations.locale}</div>;
}
```

## Context Data

Define your context type with module augmentation:

```typescript
// types.d.ts
declare module "@tailor-platform/app-shell" {
  interface AppShellRegister {
    contextData: {
      currentUser: User | null;
      permissions: string[];
      tenantId: string;
    };
  }
}

// App.tsx
<AppShell
  modules={modules}
  contextData={{
    currentUser,
    permissions,
    tenantId,
  }}
/>

// MyComponent.tsx
const { context } = useAppShell();
context.currentUser  // Fully typed!
context.permissions  // Fully typed!
```

## Examples

### Display User Info

```typescript
function UserInfo() {
  const { context } = useAppShell();

  if (!context.currentUser) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{context.currentUser.name}</h2>
      <p>{context.currentUser.email}</p>
    </div>
  );
}
```

### Check Permissions

```typescript
function DeleteButton() {
  const { context } = useAppShell();
  const canDelete = context.permissions.includes("users:delete");

  if (!canDelete) {
    return null;
  }

  return <Button variant="destructive">Delete</Button>;
}
```

### Feature Flags

```typescript
function BetaFeature() {
  const { context } = useAppShell();

  if (!context.featureFlags?.newDashboard) {
    return <OldDashboard />;
  }

  return <NewDashboard />;
}
```

## Related

- [AppShell Component](../components/app-shell.md) - Root component
- [Guards Overview](./guards/overview.md) - Access control using context
