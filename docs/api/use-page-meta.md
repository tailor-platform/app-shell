---
title: usePageMeta
description: Hook to resolve page metadata from route path
---

# usePageMeta

React hook to resolve page metadata (title, icon) from a route path.

## Signature

```typescript
const usePageMeta: (path: string) => {
  title: string
  icon?: React.ReactNode
} | null
```

## Parameters

### `path`

- **Type:** `string`
- **Required:** Yes
- **Description:** Route path to look up metadata for

## Return Value

Returns an object with `title` and optional `icon`, or `null` if path not found.

## Usage

### Resolve Title and Icon

```typescript
import { usePageMeta } from "@tailor-platform/app-shell";

function NavigationItem({ path }: { path: string }) {
  const meta = usePageMeta(path);

  if (!meta) {
    return null;
  }

  return (
    <div>
      {meta.icon}
      <span>{meta.title}</span>
    </div>
  );
}
```

### Custom Link Component

```typescript
function CustomLink({ to }: { to: string }) {
  const meta = usePageMeta(to);

  return (
    <a href={to}>
      {meta?.icon}
      {meta?.title || to}
    </a>
  );
}
```

### Breadcrumb Builder

```typescript
function Breadcrumb({ paths }: { paths: string[] }) {
  return (
    <div>
      {paths.map((path) => {
        const meta = usePageMeta(path);
        return <span key={path}>{meta?.title}</span>;
      })}
    </div>
  );
}
```

## Notes

- Used internally by `SidebarItem` to auto-resolve titles and icons
- Returns `null` if the path doesn't match any defined route
- Resolves from module and resource `meta` properties

## Related

- [SidebarItem](../components/sidebar-item.md) - Uses usePageMeta internally
- [defineModule](./define-module.md) - Define meta.title and meta.icon
