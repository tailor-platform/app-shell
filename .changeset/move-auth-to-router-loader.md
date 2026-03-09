---
"@tailor-platform/app-shell": patch
---

Improve authentication initialization

- Avoids React strict mode double-invocation issues by running auth side effects outside of React's lifecycle
- OAuth redirections are now handled before component rendering, eliminating unnecessary UI renders during the callback flow
