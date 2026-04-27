---
"@tailor-platform/app-shell": patch
---

Fix infinite GraphQL request loop when `useAuth` is used alongside urql `useQuery` with `suspense: true` in the same component.

Auth state is now subscribed per-consumer via `useSyncExternalStore` instead of propagated through React Context, preventing suspended components from re-triggering on auth state updates.
