---
"@tailor-platform/app-shell": minor
---

Add `align?: "left" | "center" | "right"` to `Table.Head` and `Table.Cell` so raw table primitives can align numeric and status columns without relying on consumer Tailwind utility overrides.

```tsx
<Table.Head align="right">Amount</Table.Head>
<Table.Cell align="right">123</Table.Cell>

<Table.Head align="center">Status</Table.Head>
<Table.Cell align="center">Active</Table.Cell>
```
