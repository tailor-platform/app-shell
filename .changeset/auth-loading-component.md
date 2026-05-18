---
"@tailor-platform/app-shell": minor
---

Split `AuthProvider`'s guard slot into two props so the loading state and the unauthenticated state can render different UI.

- **New:** `loadingComponent` — rendered while the initial auth check is in progress (`isReady === false`). Use this for a loading spinner or skeleton.
- **Changed:** `guardComponent` — now only rendered after the auth check has completed and the user is not authenticated (`isReady && !isAuthenticated`). Use this for a sign-in screen.

Previously `guardComponent` was rendered for the union of "not ready" and "not authenticated," which caused sign-in screens wired into that slot to flash on every reload before the session was known.

```tsx
// Before — guardComponent doubled as loading + unauthenticated
<AuthProvider client={authClient} guardComponent={() => <LoadingScreen />}>
  …
</AuthProvider>

// After — use the slot that matches your intent
<AuthProvider
  client={authClient}
  loadingComponent={() => <LoadingScreen />}
  guardComponent={() => <SignInScreen />}
>
  …
</AuthProvider>
```

**Migration:** if you were passing a loading UI to `guardComponent`, rename the prop to `loadingComponent`. If you were passing a sign-in screen, keep it on `guardComponent` — it will no longer flash before the auth check resolves.
