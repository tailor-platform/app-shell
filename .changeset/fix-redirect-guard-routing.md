---
"@tailor-platform/app-shell": patch
---

Fixed `redirectTo()` guard not working on modules/resources without a component. Index routes are now created for loader-only routes, enabling redirect guards to execute properly.

Fixed auto-generated sidebar navigation hiding modules/resources that use `redirectTo()` guards. Navigation filtering now only excludes `hidden()` guards, so redirect-guarded items remain visible in the sidebar. This only affects the auto-generation mode of `SidebarLayout`; composition mode (where children are explicitly provided) is not affected.

```tsx
// This pattern previously rendered a blank page — now correctly redirects:
defineModule({
  path: "old-dashboard",
  guards: [() => redirectTo("/new-dashboard")],
  resources: [...],
});

// Modules/resources with redirectTo guards were previously hidden from
// the sidebar — now they remain visible:
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
// "Legacy" and its resources will appear in the sidebar navigation.
```
