---
"@tailor-platform/app-shell": patch
---

Keep the GraphQL documentation and skill example's query context stable between renders.
This avoids urql query re-execution loops when the example is used in a component.
