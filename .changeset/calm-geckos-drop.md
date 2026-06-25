---
"@tailor-platform/app-shell": major
"@tailor-platform/app-shell-vite-plugin": major
---

Remove `loader` from file-based page definitions (`Page.appShellPageProps`).

Before:

```tsx
OrdersPage.appShellPageProps = {
  guards: [requireAuth],
  loader: async () => fetchOrders(),
} satisfies AppShellPageProps;
```

After:

```tsx
OrdersPage.appShellPageProps = {
  guards: [requireAuth],
} satisfies AppShellPageProps;

function OrdersPage() {
  // fetch inside the component or a hook instead
}
```

Page loaders are no longer read during route conversion, and the Vite plugin now reports `loader` as an unknown `appShellPageProps` key.
