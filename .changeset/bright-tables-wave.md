---
"@tailor-platform/app-shell": minor
---

Add `align?: "left" | "right"` to `Table.Head` and `Table.Cell` so raw table primitives can align numeric columns without relying on consumer Tailwind utility overrides.

```tsx
<Table.Head align="right">Amount</Table.Head>
<Table.Cell align="right">123</Table.Cell>
```
