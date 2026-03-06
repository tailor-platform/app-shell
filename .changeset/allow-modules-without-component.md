---
"@tailor-platform/app-shell": minor
---

Allow modules without a component for path-only module definitions

Modules can now be defined without a `component` (and without `guards`), both via `defineModule()` and file-based routing. This is useful when a module directory exists solely to group child resources under a shared path prefix.

Accessing the module path directly returns a 404 response, while child resources remain accessible as normal.

```tsx
// defineModule without component
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
