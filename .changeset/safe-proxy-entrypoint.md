---
"@tailor-platform/app-shell-vite-plugin": minor
---

Add `entrypoint` option to `appShellRoutes()` plugin. When specified, only imports from the entrypoint file are intercepted and replaced with the pages-injected AppShell, eliminating circular module dependencies entirely. It is recommended to set this option to avoid potential TDZ errors caused by circular imports in page components.

```ts
appShellRoutes({
  entrypoint: "src/App.tsx",
});
```
