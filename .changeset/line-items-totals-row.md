---
"@tailor-platform/app-shell": minor
---

LineItems: new `LineItems.TotalsRow` part — render-prop component that renders a sticky totals row at the bottom of the table.

```tsx
<LineItems.Root value={lineItems}>
  <LineItems.Table />
  <LineItems.TotalsRow>
    {(lines) => ({
      quantity: lines.reduce((s, l) => s + l.quantity, 0),
      amount: `$${lines.reduce((s, l) => s + l.amount, 0).toFixed(2)}`,
    })}
  </LineItems.TotalsRow>
</LineItems.Root>
```

The render-prop receives the live `allLines` array and returns a `Record<columnKey, ReactNode>` aligned to the table's columns. Place it as a sibling of the `Table` inside `Root`; the table picks up the render-fn via context and renders the row inside its `<tfoot>`. Sticks to the bottom of the scroll container with `position: sticky; bottom: 0`.

Demo: `/custom-page/sales-invoice-demo` shows running Qty + Amount totals.
