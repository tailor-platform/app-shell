---
"@tailor-platform/app-shell": patch
---

Fix OAuth callback handling so auth redirects do not re-run unnecessarily when AppShell re-renders.

Auth initialization now also starts from `AuthProvider`, which avoids unresolved auth state when consumers are mounted outside the router-driven AppShell flow.
