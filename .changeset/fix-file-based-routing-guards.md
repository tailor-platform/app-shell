---
"@tailor-platform/app-shell": minor
---

Fix guards defined via `appShellPageProps` being silently ignored in file-based routing. Guards now correctly produce route loaders for both root and non-root pages.
