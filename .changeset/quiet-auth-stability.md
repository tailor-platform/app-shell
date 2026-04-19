---
"@tailor-platform/app-shell": patch
---

Fixed a bug where placing a guard component between `AuthProvider` and `AppShell` could block `AppShell` from mounting, preventing the authentication flow from ever starting and leaving the app stuck in an unauthenticated state.
