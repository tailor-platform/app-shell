---
"@tailor-platform/app-shell": major
"@tailor-platform/app-shell-vite-plugin": major
---

Remove `loader` from file-based page definitions (`Page.appShellPageProps`). This removes an accidentally exposed incomplete API and makes `guards` the single source of page-level route behavior in file-based routing.
