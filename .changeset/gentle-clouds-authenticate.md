---
"@tailor-platform/app-shell": minor
---

Add `MemoryAuthProvider` and `createMemoryAuthClient` to the `/testing` entry point for isolated authentication UI tests using the real providers and hooks, without OAuth, network requests, or persisted sessions.

Use `MemoryAuthProvider` for initial state fixtures, or supply a memory client and call `setState` to control loading, authentication, and error transitions. The testing guide includes guard, login/logout, and Suspense recipes.

```tsx
import { MemoryAuthProvider } from "@tailor-platform/app-shell/testing";

<MemoryAuthProvider initialState={{ isReady: true, isAuthenticated: true, error: null }}>
  <ProfilePage />
</MemoryAuthProvider>;
```
