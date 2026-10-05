---
kind: prose
group: use-app-shell
title: useAppShell
description: Hook to access AppShell context data and configuration
---

# useAppShell

React hook to access AppShell context data and configuration within your components.

## Signature

```typescript
const useAppShell: () => {
  contextData: ContextData;
  configurations: {
    modules: Module[];
    settingsResources: Resource[];
    basePath?: string;
    locale: string;
    resolvedLocale?: string;
    timeZone?: string;
    errorBoundary: ErrorBoundaryComponent;
  };
  title?: string;
  icon?: React.ReactNode;
  favicon?: string;
  appInfo?: AppInfo;
};
```

The hook merges the results of [`useAppShellConfig`](./use-app-shell-config.md) and [`useAppShellData`](./use-app-shell-data.md). Prefer one of those when you only need configuration or only need context data, so the component does not re-render for changes it does not use.

## Return Value

### `contextData`

- **Type:** `ContextData`
- **Description:** Custom context data passed to AppShell. Same as the `contextData` prop.

### `configurations`

- **Type:** object
- **Description:** Resolved AppShell configuration: `modules`, `settingsResources`, `basePath`, `locale`, `resolvedLocale`, `timeZone`, and `errorBoundary`.

### `title`, `icon`, `favicon`, `appInfo`

- **Description:** The matching AppShell props, as passed.

## Usage

### Basic Access

```typescript
import { useAppShell } from "@tailor-platform/app-shell";

function MyComponent() {
  const { contextData } = useAppShell();

  return <div>Welcome, {contextData.currentUser?.name}</div>;
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
const { contextData } = useAppShell();
contextData.currentUser  // Fully typed!
contextData.permissions  // Fully typed!
```

## Examples

### Display User Info

```typescript
function UserInfo() {
  const { contextData } = useAppShell();

  if (!contextData.currentUser) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{contextData.currentUser.name}</h2>
      <p>{contextData.currentUser.email}</p>
    </div>
  );
}
```

### Check Permissions

```typescript
function DeleteButton() {
  const { contextData } = useAppShell();
  const canDelete = contextData.permissions.includes("users:delete");

  if (!canDelete) {
    return null;
  }

  return <Button variant="destructive">Delete</Button>;
}
```

## Related

- [AppShell Component](../components/app-shell.md) - Root component
- [useAppShellData](./use-app-shell-data.md) - Context data only
- [useAppShellConfig](./use-app-shell-config.md) - Configuration only
- [Guards Overview](./guards/overview.md) - Access control using context
