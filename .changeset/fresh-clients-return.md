---
"@tailor-platform/app-shell": minor
---

Update `@tailor-platform/auth-public-client` to `^0.7.0` and preserve the current path, query string, and hash across authentication redirects.

`useAuth().login()` accepts an optional same-origin `returnTo` destination.
