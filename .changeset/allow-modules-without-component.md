---
"@tailor-platform/app-shell": minor
---

Allow modules and resources without a component for path-only definitions

Modules and resources can now be defined without a `component`, both via `defineModule()`/`defineResource()` and file-based routing. This is useful when a directory exists solely to group child routes under a shared path prefix.

Accessing a component-less path directly returns a 404 response, while child routes remain accessible as normal.

```tsx
// Module without component — groups child resources under a shared path
defineModule({
  path: "admin",
  meta: { title: "Admin" },
  resources: [
    defineResource({ path: "users", component: () => <Users /> }),
    defineResource({ path: "roles", component: () => <Roles /> }),
  ],
});
// /admin → 404
// /admin/users → renders Users
// /admin/roles → renders Roles

// Resource without component — groups sub-resources under a namespace
defineResource({
  path: "namespace",
  subResources: [defineResource({ path: "page-a", component: () => <div>Page A</div> })],
});
// /namespace → 404
// /namespace/page-a → renders Page A
```

For file-based routing, simply omit `page.tsx` from a directory:

```
pages/
  admin/
    users/
      page.tsx   ← /admin/users renders this
    roles/
      page.tsx   ← /admin/roles renders this
    (no page.tsx for /admin itself → 404)
```

Guards on component-less routes now execute correctly. Previously, guard loaders were silently ignored when no component was present. Now, guards such as `redirectTo()` will fire as expected, and if all guards return `pass()`, the route falls back to a 404.
