---
title: useAppShellConfig
description: Hook to access AppShell configuration data
---

# useAppShellConfig

React hook to access only the AppShell configuration (title, icon, basePath, modules, settingsResources). This is a lighter alternative to `useAppShell` when you only need configuration data.

## Signature

```typescript
const useAppShellConfig: () => AppShellConfig
```

## Return Value

| Property            | Type                           | Description                                 |
| ------------------- | ------------------------------ | ------------------------------------------- |
| `title`             | `string \| undefined`          | App title                                   |
| `icon`              | `React.ReactNode \| undefined` | App icon                                    |
| `basePath`          | `string \| undefined`          | Base path for all routes                    |
| `modules`           | `Module[]`                     | Registered modules                          |
| `settingsResources` | `Resource[]`                   | Resources that appear only in Settings menu |

## Usage

### Display App Info

```typescript
import { useAppShellConfig } from "@tailor-platform/app-shell";

function AppInfo() {
  const { title, basePath } = useAppShellConfig();

  return (
    <div>
      <h2>{title}</h2>
      <p>Base: {basePath}</p>
    </div>
  );
}
```

### Access Modules

```typescript
function ModuleList() {
  const { modules } = useAppShellConfig();

  return (
    <ul>
      {modules.map((module) => (
        <li key={module.path}>{module.meta?.title}</li>
      ))}
    </ul>
  );
}
```

### Build Custom Navigation

```typescript
function CustomNav() {
  const { modules } = useAppShellConfig();

  return (
    <nav>
      {modules.map((module) => (
        <a key={module.path} href={`/${module.path}`}>
          {module.meta?.title}
        </a>
      ))}
    </nav>
  );
}
```

### Settings Resources

```typescript
function SettingsMenu() {
  const { settingsResources } = useAppShellConfig();

  return (
    <div>
      <h3>Settings</h3>
      {settingsResources.map((resource) => (
        <button key={resource.path}>
          {resource.meta?.title}
        </button>
      ))}
    </div>
  );
}
```

## When to Use

Use `useAppShellConfig` when you only need configuration data:

```typescript
// ✅ Good - only need config
const { modules } = useAppShellConfig();

// ❌ Overkill - useAppShell returns more data
const { configurations } = useAppShell();
const modules = configurations.modules;
```

## Comparison with Other Hooks

| Hook                 | Returns                     | Use When                  |
| -------------------- | --------------------------- | ------------------------- |
| `useAppShellConfig`  | Configuration only          | Need config data          |
| `useAppShellData`    | Context data only           | Need custom context       |
| `useAppShell`        | Both config + context       | Need both                 |

## Related

- [useAppShell](./use-app-shell.md) - Full context access
- [useAppShellData](./use-app-shell-data.md) - Context data only
- [AppShell Component](../components/app-shell.md) - Root component
