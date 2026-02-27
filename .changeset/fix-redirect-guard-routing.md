---
"@tailor-platform/app-shell": patch
---

Fixed `redirectTo()` guard not working on modules/resources without a component. Index routes are now created for loader-only routes, enabling redirect guards to execute properly.

Fixed auto-generated sidebar navigation hiding modules/resources that use `redirectTo()` guards. Navigation filtering now only excludes `hidden()` guards, so redirect-guarded items remain visible in the sidebar. This only affects the auto-generation mode of `SidebarLayout`; composition mode (where children are explicitly provided) is not affected.

### Guard result types and their effect on navigation visibility

| Guard result | Nav visibility | Routing behaviour |
|---|---|---|
| `pass()` | Visible | Renders the component |
| `hidden()` | **Hidden** | Returns 404 |
| `redirectTo(path)` | Visible | Redirects to the specified path |

`redirectTo()` guards intentionally keep the item visible in the sidebar. This supports the common pattern where a module has no component of its own but should still appear as a sidebar item that redirects elsewhere (e.g. aliasing a legacy path to a new location). Additionally, if a module with `redirectTo()` were hidden from the sidebar, all of its child resources would also disappear from navigation, even though those children may have real pages that users need to access.

```tsx
// This pattern previously rendered a blank page — now correctly redirects:
defineModule({
  path: "old-dashboard",
  guards: [() => redirectTo("/new-dashboard")],
  resources: [...],
});

// Modules/resources with redirectTo guards remain visible in the sidebar.
// Clicking "Legacy" navigates to /legacy, which then redirects to /modern.
defineModule({
  path: "legacy",
  guards: [() => redirectTo("/modern")],
  resources: [
    defineResource({
      path: "page",
      component: () => <div>Page</div>,
    }),
  ],
});
```
