---
"@tailor-platform/app-shell": minor
---

LineItems: `useLineItems` now exposes `addLines(items, opts?)` for batched inserts.

Same shape as `addLine` but takes an array and funnels through a single state mutation, so committing N picks from a bulk picker is one render and one logical operation in the change set instead of N. Returns the new `lineRef`s in input order.

```tsx
const refs = lineItems.addLines(selectedVariants.map((v) => ({ sku: v.id, quantity: 1, ...rest })));
```
