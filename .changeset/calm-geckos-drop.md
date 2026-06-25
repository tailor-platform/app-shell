---
"@tailor-platform/app-shell": patch
"@tailor-platform/app-shell-vite-plugin": patch
---

Remove `loader` from file-based page definitions (`Page.appShellPageProps`). This removes an accidentally exposed incomplete API and makes `guards` the single source of page-level route behavior in file-based routing.
