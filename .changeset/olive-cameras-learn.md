---
"@tailor-platform/app-shell": patch
---

Fix Vitest and other Node-evaluated test setups that import `@tailor-platform/app-shell` by keeping the package's JS entry free of CSS imports.

`@tailor-platform/app-shell/styles` continues to ship the default AppShell styles and bundled Inter font assets. Applications should import that stylesheet explicitly, as shown in the docs and examples.
